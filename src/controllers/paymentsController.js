import { supabaseAdmin } from "../config/supabase.js";
import { ApiError } from "../middleware/errorHandler.js";
import { createPaymentSchema, reversePaymentSchema, paymentQuerySchema } from "../validators/paymentValidators.js";
import { getInvoicePaymentSummary, syncInvoiceStatusFromPayments } from "../utils/invoiceBalance.js";

const PAYMENT_SELECT = `
  id, amount, payment_method, payment_date, transaction_reference, notes,
  is_reversed, reversed_at, reversal_reason, created_at, invoice_id,
  invoice:invoices ( id, invoice_number, client_id, total_amount, client_details_snapshot ),
  recorded_by_profile:profiles!payments_recorded_by_fkey ( id, full_name )
`;

/**
 * GET /api/payments — admin only.
 */
export async function listPayments(req, res, next) {
  try {
    const q = paymentQuerySchema.parse(req.query);
    const from = (q.page - 1) * q.page_size;
    const to = from + q.page_size - 1;

    let invoiceIdsForClient = null;
    if (q.client_id) {
      const { data: invs } = await supabaseAdmin.from("invoices").select("id").eq("client_id", q.client_id);
      invoiceIdsForClient = (invs || []).map((i) => i.id);
      if (invoiceIdsForClient.length === 0) {
        return res.json({ payments: [], pagination: { page: q.page, page_size: q.page_size, total: 0 } });
      }
    }

    let query = supabaseAdmin
      .from("payments")
      .select(PAYMENT_SELECT, { count: "exact" })
      .order("payment_date", { ascending: false })
      .range(from, to);

    if (q.invoice_id) query = query.eq("invoice_id", q.invoice_id);
    if (invoiceIdsForClient) query = query.in("invoice_id", invoiceIdsForClient);
    if (q.payment_method) query = query.eq("payment_method", q.payment_method);

    const { data, error, count } = await query;
    if (error) throw new ApiError(500, "Could not load payments.");

    res.json({ payments: data, pagination: { page: q.page, page_size: q.page_size, total: count ?? data.length } });
  } catch (err) {
    if (err.name === "ZodError") return res.status(400).json({ error: "Invalid query parameters." });
    next(err);
  }
}

/**
 * GET /api/payments/:id — admin only.
 */
export async function getPayment(req, res, next) {
  try {
    const { data, error } = await supabaseAdmin
      .from("payments")
      .select(PAYMENT_SELECT)
      .eq("id", req.params.id)
      .single();
    if (error || !data) throw new ApiError(404, "Payment not found.");
    res.json({ payment: data });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/payments — admin only. Records full/partial/advance/multiple
 * payments against an invoice. Never lets the outstanding balance go
 * negative — an amount larger than what's still owed is rejected outright
 * rather than silently clamped, so the admin catches a typo immediately.
 */
export async function createPayment(req, res, next) {
  try {
    const body = createPaymentSchema.parse(req.body);

    const { data: invoice, error: invoiceError } = await supabaseAdmin
      .from("invoices")
      .select("id, total_amount, invoice_status")
      .eq("id", body.invoice_id)
      .single();
    if (invoiceError || !invoice) throw new ApiError(404, "Invoice not found.");
    if (invoice.invoice_status === "cancelled") {
      throw new ApiError(400, "Can't record a payment against a cancelled invoice.");
    }

    const summary = await getInvoicePaymentSummary(invoice.id);
    if (body.amount > summary.outstanding_amount + 0.001) {
      throw new ApiError(
        400,
        `Amount exceeds the outstanding balance of ${summary.outstanding_amount.toFixed(2)}.`
      );
    }

    const { data: payment, error } = await supabaseAdmin
      .from("payments")
      .insert({
        invoice_id: body.invoice_id,
        amount: body.amount,
        payment_method: body.payment_method,
        payment_date: body.payment_date || new Date().toISOString().slice(0, 10),
        transaction_reference: body.transaction_reference || null,
        notes: body.notes || null,
        recorded_by: req.user.id,
      })
      .select(PAYMENT_SELECT)
      .single();

    if (error) throw new ApiError(500, "Could not record payment.");

    await syncInvoiceStatusFromPayments(invoice.id);

    await supabaseAdmin.from("audit_logs").insert({
      actor_id: req.user.id,
      action: "payment.create",
      entity_type: "payment",
      entity_id: payment.id,
      details: { invoice_id: invoice.id, amount: body.amount },
    });

    const updatedSummary = await getInvoicePaymentSummary(invoice.id);
    res.status(201).json({ payment, invoice_summary: updatedSummary, message: "Payment recorded successfully." });
  } catch (err) {
    if (err.name === "ZodError") {
      return res.status(400).json({ error: err.errors[0]?.message || "Invalid input." });
    }
    next(err);
  }
}

/**
 * POST /api/payments/:id/reverse — admin only. Never a hard delete — flags
 * the payment as reversed (with a reason, audit-logged) and re-syncs the
 * invoice's paid/issued status.
 */
export async function reversePayment(req, res, next) {
  try {
    const { reason } = reversePaymentSchema.parse(req.body);

    const { data: existing, error: fetchError } = await supabaseAdmin
      .from("payments")
      .select("id, invoice_id, is_reversed")
      .eq("id", req.params.id)
      .single();
    if (fetchError || !existing) throw new ApiError(404, "Payment not found.");
    if (existing.is_reversed) throw new ApiError(400, "This payment is already reversed.");

    const { data, error } = await supabaseAdmin
      .from("payments")
      .update({
        is_reversed: true,
        reversed_at: new Date().toISOString(),
        reversed_by: req.user.id,
        reversal_reason: reason,
      })
      .eq("id", req.params.id)
      .select(PAYMENT_SELECT)
      .single();

    if (error || !data) throw new ApiError(500, "Could not reverse payment.");

    await syncInvoiceStatusFromPayments(existing.invoice_id);

    await supabaseAdmin.from("audit_logs").insert({
      actor_id: req.user.id,
      action: "payment.reverse",
      entity_type: "payment",
      entity_id: req.params.id,
      details: { reason },
    });

    const updatedSummary = await getInvoicePaymentSummary(existing.invoice_id);
    res.json({ payment: data, invoice_summary: updatedSummary });
  } catch (err) {
    if (err.name === "ZodError") {
      return res.status(400).json({ error: err.errors[0]?.message || "Invalid input." });
    }
    next(err);
  }
}

/**
 * GET /api/payments/stats — admin only. Revenue/collection figures for the
 * dashboard, all computed live — an unpaid invoice is never counted as
 * received revenue.
 */
export async function getFinancialStats(req, res, next) {
  try {
    const { data: invoices } = await supabaseAdmin
      .from("invoices")
      .select("id, total_amount, invoice_status, due_date")
      .neq("invoice_status", "cancelled");

    const { data: payments } = await supabaseAdmin
      .from("payments")
      .select("invoice_id, amount")
      .eq("is_reversed", false);

    const paidByInvoice = {};
    for (const p of payments || []) {
      paidByInvoice[p.invoice_id] = (paidByInvoice[p.invoice_id] || 0) + Number(p.amount);
    }

    const t = new Date().toISOString().slice(0, 10);
    let totalRevenue = 0;
    let totalReceived = 0;
    let totalOutstanding = 0;
    let overdueCount = 0;
    let overdueAmount = 0;

    for (const inv of invoices || []) {
      const paid = paidByInvoice[inv.id] || 0;
      const outstanding = Math.max(Number(inv.total_amount) - paid, 0);
      totalRevenue += Number(inv.total_amount);
      totalReceived += paid;
      totalOutstanding += outstanding;
      if (outstanding > 0 && inv.due_date && inv.due_date < t) {
        overdueCount += 1;
        overdueAmount += outstanding;
      }
    }

    res.json({
      stats: {
        total_revenue: round2(totalRevenue),
        total_received: round2(totalReceived),
        total_outstanding: round2(totalOutstanding),
        overdue_payments_count: overdueCount,
        overdue_payments_amount: round2(overdueAmount),
      },
    });
  } catch (err) {
    next(err);
  }
}

function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
