import { supabaseAdmin } from "../config/supabase.js";
import { derivePaymentStatus } from "./paymentStatus.js";

export { derivePaymentStatus };

/**
 * Payment summary for ONE invoice — used on the invoice detail page.
 */
export async function getInvoicePaymentSummary(invoiceId) {
  const { data: invoice } = await supabaseAdmin
    .from("invoices")
    .select("total_amount, due_date, invoice_status")
    .eq("id", invoiceId)
    .single();
  if (!invoice) return null;

  const { data: payments } = await supabaseAdmin
    .from("payments")
    .select("amount")
    .eq("invoice_id", invoiceId)
    .eq("is_reversed", false);

  const amountPaid = (payments || []).reduce((sum, p) => sum + Number(p.amount), 0);
  const outstanding = Math.max(Number(invoice.total_amount) - amountPaid, 0);

  return {
    amount_paid: round2(amountPaid),
    outstanding_amount: round2(outstanding),
    payment_status: derivePaymentStatus({
      totalAmount: Number(invoice.total_amount),
      amountPaid,
      dueDate: invoice.due_date,
      invoiceStatus: invoice.invoice_status,
    }),
  };
}

/**
 * Batched payment summary for MANY invoices at once — used on list views
 * (Invoices table, Clients table) to avoid N+1 queries.
 */
export async function getPaymentSummariesForInvoices(invoiceRows) {
  const ids = invoiceRows.map((i) => i.id);
  if (!ids.length) return {};

  const { data: payments } = await supabaseAdmin
    .from("payments")
    .select("invoice_id, amount")
    .in("invoice_id", ids)
    .eq("is_reversed", false);

  const paidByInvoice = {};
  for (const p of payments || []) {
    paidByInvoice[p.invoice_id] = (paidByInvoice[p.invoice_id] || 0) + Number(p.amount);
  }

  const summaries = {};
  for (const inv of invoiceRows) {
    const amountPaid = paidByInvoice[inv.id] || 0;
    const outstanding = Math.max(Number(inv.total_amount) - amountPaid, 0);
    summaries[inv.id] = {
      amount_paid: round2(amountPaid),
      outstanding_amount: round2(outstanding),
      payment_status: derivePaymentStatus({
        totalAmount: Number(inv.total_amount),
        amountPaid,
        dueDate: inv.due_date,
        invoiceStatus: inv.invoice_status,
      }),
    };
  }
  return summaries;
}

/**
 * After recording or reversing a payment, syncs invoices.invoice_status
 * between 'issued' and 'paid' to reflect the current balance. Never
 * touches a 'cancelled' invoice.
 */
export async function syncInvoiceStatusFromPayments(invoiceId) {
  const { data: invoice } = await supabaseAdmin
    .from("invoices")
    .select("total_amount, invoice_status")
    .eq("id", invoiceId)
    .single();
  if (!invoice || invoice.invoice_status === "cancelled") return;

  const { data: payments } = await supabaseAdmin
    .from("payments")
    .select("amount")
    .eq("invoice_id", invoiceId)
    .eq("is_reversed", false);

  const amountPaid = (payments || []).reduce((sum, p) => sum + Number(p.amount), 0);
  const isFullyPaid = amountPaid >= Number(invoice.total_amount) && Number(invoice.total_amount) > 0;

  const nextStatus = isFullyPaid ? "paid" : "issued";
  if (nextStatus !== invoice.invoice_status) {
    await supabaseAdmin.from("invoices").update({ invoice_status: nextStatus }).eq("id", invoiceId);
  }
}

function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
