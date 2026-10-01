import { supabaseAdmin } from "../config/supabase.js";
import { ApiError } from "../middleware/errorHandler.js";
import {
  createInvoiceSchema,
  reissueInvoiceSchema,
  cancelInvoiceSchema,
  invoiceQuerySchema,
} from "../validators/invoiceValidators.js";
import { priceItems } from "../utils/money.js";
import { getInvoicePaymentSummary, getPaymentSummariesForInvoices, syncInvoiceStatusFromPayments } from "../utils/invoiceBalance.js";

const INVOICE_SELECT = `
  id, invoice_number, invoice_date, due_date, client_details_snapshot,
  company_details_snapshot, items, subtotal, total_amount, invoice_status,
  cancelled_reason, cancelled_at, supersedes_invoice_id, created_at,
  client_id, project_id,
  project:projects ( id, project_name ),
  created_by_profile:profiles!invoices_created_by_fkey ( id, full_name )
`;

/**
 * Builds and inserts one invoice row: fetches a fresh company_settings +
 * client snapshot, prices the items (no GST — see utils/money.js), pulls
 * the next per-year invoice number via the DB sequence function, and
 * writes everything as a single insert.
 */
async function buildAndInsertInvoice({ project, dueDate, rawItems, createdBy, supersedesInvoiceId }) {
  const { data: settings, error: settingsError } = await supabaseAdmin
    .from("company_settings")
    .select("*")
    .eq("id", 1)
    .single();
  if (settingsError || !settings) throw new ApiError(500, "Company settings are not configured.");

  const { data: client, error: clientError } = await supabaseAdmin
    .from("clients")
    .select("*")
    .eq("id", project.client_id)
    .single();
  if (clientError || !client) throw new ApiError(404, "Client not found.");

  const { items, subtotal, total_amount } = priceItems(rawItems);

  const { data: invoiceNumber, error: numberError } = await supabaseAdmin.rpc("next_invoice_number", {
    prefix: settings.invoice_prefix || "INV",
  });
  if (numberError || !invoiceNumber) throw new ApiError(500, "Could not generate an invoice number.");

  const clientSnapshot = {
    client_name: client.client_name,
    company_name: client.company_name,
    phone: client.phone,
    email: client.email,
    address: client.address,
  };

  const companySnapshot = {
    company_name: settings.company_name,
    address: settings.address,
    phone: settings.phone,
    phone_2: settings.phone_2,
    email: settings.email,
    website: settings.website,
    logo_url: settings.logo_url,
    footer: settings.invoice_footer,
    payment_instructions: settings.payment_instructions,
    authorized_signatory_name: settings.authorized_signatory_name,
    currency: settings.default_currency,
  };

  const { data, error } = await supabaseAdmin
    .from("invoices")
    .insert({
      invoice_number: invoiceNumber,
      client_id: project.client_id,
      project_id: project.id,
      invoice_date: new Date().toISOString().slice(0, 10),
      due_date: dueDate || null,
      client_details_snapshot: clientSnapshot,
      company_details_snapshot: companySnapshot,
      items,
      subtotal,
      total_amount,
      invoice_status: "issued",
      supersedes_invoice_id: supersedesInvoiceId || null,
      created_by: createdBy,
    })
    .select(INVOICE_SELECT)
    .single();

  if (error) throw new ApiError(500, "Could not create invoice.");
  return data;
}

/**
 * GET /api/invoices — admin only.
 */
export async function listInvoices(req, res, next) {
  try {
    const q = invoiceQuerySchema.parse(req.query);
    const from = (q.page - 1) * q.page_size;
    const to = from + q.page_size - 1;

    let query = supabaseAdmin
      .from("invoices")
      .select(INVOICE_SELECT, { count: "exact" })
      .order("invoice_date", { ascending: false })
      .range(from, to);

    if (q.client_id) query = query.eq("client_id", q.client_id);
    if (q.project_id) query = query.eq("project_id", q.project_id);
    if (q.status) query = query.eq("invoice_status", q.status);
    if (q.search) query = query.ilike("invoice_number", `%${q.search}%`);

    const { data, error, count } = await query;
    if (error) throw new ApiError(500, "Could not load invoices.");

    const summaries = await getPaymentSummariesForInvoices(data);
    const invoices = data.map((inv) => ({ ...inv, ...(summaries[inv.id] || {}) }));

    res.json({ invoices, pagination: { page: q.page, page_size: q.page_size, total: count ?? data.length } });
  } catch (err) {
    if (err.name === "ZodError") return res.status(400).json({ error: "Invalid query parameters." });
    next(err);
  }
}

/**
 * GET /api/invoices/:id — admin only.
 */
export async function getInvoice(req, res, next) {
  try {
    const { data, error } = await supabaseAdmin
      .from("invoices")
      .select(INVOICE_SELECT)
      .eq("id", req.params.id)
      .single();

    if (error || !data) throw new ApiError(404, "Invoice not found.");

    const summary = await getInvoicePaymentSummary(data.id);
    const { data: payments } = await supabaseAdmin
      .from("payments")
      .select("id, amount, payment_method, payment_date, transaction_reference, is_reversed, created_at")
      .eq("invoice_id", data.id)
      .order("payment_date", { ascending: false });

    res.json({ invoice: { ...data, ...summary }, payments: payments || [] });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/invoices — admin only. Generates a new invoice for a project.
 * Snapshots are captured NOW — later edits to the client record or company
 * settings never retroactively change an issued invoice.
 */
export async function createInvoice(req, res, next) {
  try {
    const body = createInvoiceSchema.parse(req.body);

    const { data: project, error: projectError } = await supabaseAdmin
      .from("projects")
      .select("id, client_id, project_name")
      .eq("id", body.project_id)
      .single();
    if (projectError || !project) throw new ApiError(404, "Project not found.");

    const invoice = await buildAndInsertInvoice({
      project,
      dueDate: body.due_date,
      rawItems: body.items,
      createdBy: req.user.id,
    });

    await supabaseAdmin.from("audit_logs").insert({
      actor_id: req.user.id,
      action: "invoice.create",
      entity_type: "invoice",
      entity_id: invoice.id,
      details: { invoice_number: invoice.invoice_number, project_id: project.id },
    });

    // Optionally log the project's advance (or any amount already in hand)
    // as the invoice's first payment, right at generation time, instead of
    // leaving it disconnected from the invoice's actual balance.
    if (body.advance_payment && body.advance_payment.amount <= invoice.total_amount) {
      await supabaseAdmin.from("payments").insert({
        invoice_id: invoice.id,
        amount: body.advance_payment.amount,
        payment_method: body.advance_payment.payment_method,
        payment_date: body.advance_payment.payment_date || new Date().toISOString().slice(0, 10),
        notes: "Advance recorded at invoice generation.",
        recorded_by: req.user.id,
      });
      await syncInvoiceStatusFromPayments(invoice.id);

      await supabaseAdmin.from("audit_logs").insert({
        actor_id: req.user.id,
        action: "payment.create",
        entity_type: "payment",
        entity_id: invoice.id,
        details: { invoice_id: invoice.id, amount: body.advance_payment.amount, source: "invoice_generation" },
      });
    }

    const summary = await getInvoicePaymentSummary(invoice.id);
    res.status(201).json({ invoice: { ...invoice, ...summary } });
  } catch (err) {
    if (err.name === "ZodError") {
      return res.status(400).json({ error: err.errors[0]?.message || "Invalid input." });
    }
    next(err);
  }
}

/**
 * POST /api/invoices/:id/cancel — admin only. Never a hard delete — the
 * row stays for audit purposes, marked cancelled with a reason.
 */
export async function cancelInvoice(req, res, next) {
  try {
    const { reason } = cancelInvoiceSchema.parse(req.body);

    const { data: existing, error: fetchError } = await supabaseAdmin
      .from("invoices")
      .select("id, invoice_status")
      .eq("id", req.params.id)
      .single();
    if (fetchError || !existing) throw new ApiError(404, "Invoice not found.");
    if (existing.invoice_status === "cancelled") {
      throw new ApiError(400, "This invoice is already cancelled.");
    }

    const { data, error } = await supabaseAdmin
      .from("invoices")
      .update({
        invoice_status: "cancelled",
        cancelled_reason: reason,
        cancelled_at: new Date().toISOString(),
        cancelled_by: req.user.id,
      })
      .eq("id", req.params.id)
      .select(INVOICE_SELECT)
      .single();

    if (error || !data) throw new ApiError(500, "Could not cancel invoice.");

    await supabaseAdmin.from("audit_logs").insert({
      actor_id: req.user.id,
      action: "invoice.cancel",
      entity_type: "invoice",
      entity_id: req.params.id,
      details: { reason },
    });

    res.json({ invoice: data });
  } catch (err) {
    if (err.name === "ZodError") {
      return res.status(400).json({ error: err.errors[0]?.message || "Invalid input." });
    }
    next(err);
  }
}

/**
 * POST /api/invoices/:id/reissue — admin only. Deliberate correction
 * workflow: cancels the original (with an automatic reason) and creates a
 * fresh invoice — a new number, a fresh snapshot, linked via
 * supersedes_invoice_id — rather than silently editing the original.
 */
export async function reissueInvoice(req, res, next) {
  try {
    const body = reissueInvoiceSchema.parse(req.body);

    const { data: original, error: fetchError } = await supabaseAdmin
      .from("invoices")
      .select("id, project_id, invoice_status")
      .eq("id", req.params.id)
      .single();
    if (fetchError || !original) throw new ApiError(404, "Invoice not found.");
    if (original.invoice_status === "cancelled") {
      throw new ApiError(400, "A cancelled invoice can't be revised — generate a new invoice instead.");
    }

    const { data: project, error: projectError } = await supabaseAdmin
      .from("projects")
      .select("id, client_id, project_name")
      .eq("id", original.project_id)
      .single();
    if (projectError || !project) throw new ApiError(404, "The project behind this invoice was not found.");

    await supabaseAdmin
      .from("invoices")
      .update({
        invoice_status: "cancelled",
        cancelled_reason: "Superseded by a revised invoice.",
        cancelled_at: new Date().toISOString(),
        cancelled_by: req.user.id,
      })
      .eq("id", original.id);

    const newInvoice = await buildAndInsertInvoice({
      project,
      dueDate: body.due_date,
      rawItems: body.items,
      createdBy: req.user.id,
      supersedesInvoiceId: original.id,
    });

    await supabaseAdmin.from("audit_logs").insert({
      actor_id: req.user.id,
      action: "invoice.reissue",
      entity_type: "invoice",
      entity_id: newInvoice.id,
      details: { supersedes: original.id },
    });

    res.status(201).json({ invoice: newInvoice });
  } catch (err) {
    if (err.name === "ZodError") {
      return res.status(400).json({ error: err.errors[0]?.message || "Invalid input." });
    }
    next(err);
  }
}
