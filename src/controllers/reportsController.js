import { supabaseAdmin } from "../config/supabase.js";
import { reportQuerySchema } from "../validators/reportValidators.js";
import { resolveDateRange } from "../utils/dateRange.js";

/**
 * GET /api/reports — admin only. One consolidated payload for the Reports
 * page rather than five separate round trips.
 *
 * Date-range note (documented, ambiguous-requirement resolution): revenue
 * and "payments received" are filtered by the selected range (invoice_date
 * / payment_date respectively) since those are genuinely period figures.
 * Work-status counts (completed/in-progress/overdue) and the monthly
 * revenue trend are current-state / trailing-12-month snapshots regardless
 * of the range filter — a "This Week" filter narrowing the completed-
 * projects count to only projects completed this week would hide the
 * bigger picture the chart is for.
 */
export async function getReports(req, res, next) {
  try {
    const q = reportQuerySchema.parse(req.query);
    const { start, end } = resolveDateRange(q);

    const [
      revenueInRange,
      paymentsInRange,
      outstandingByClient,
      projectCounts,
      staffCompletion,
      revenueByMonth,
    ] = await Promise.all([
      getRevenueInRange(start, end),
      getPaymentsInRange(start, end),
      getOutstandingByClient(),
      getProjectCounts(),
      getStaffCompletion(),
      getRevenueByMonth(),
    ]);

    res.json({
      range: { range: q.range, start, end },
      totals: {
        revenue_in_range: revenueInRange.total,
        invoices_in_range: revenueInRange.count,
        collected_in_range: paymentsInRange.total,
        payments_in_range: paymentsInRange.count,
        total_outstanding: outstandingByClient.reduce((s, c) => s + c.outstanding, 0),
      },
      project_counts: projectCounts,
      revenue_by_month: revenueByMonth,
      payments_by_date: paymentsInRange.byDate,
      outstanding_by_client: outstandingByClient.slice(0, 15),
      staff_completion: staffCompletion,
    });
  } catch (err) {
    if (err.name === "ZodError") return res.status(400).json({ error: "Invalid query parameters." });
    next(err);
  }
}

async function getRevenueInRange(start, end) {
  const { data } = await supabaseAdmin
    .from("invoices")
    .select("total_amount")
    .in("invoice_status", ["issued", "paid"])
    .gte("invoice_date", start)
    .lte("invoice_date", end);
  const total = (data || []).reduce((s, i) => s + Number(i.total_amount), 0);
  return { total: round2(total), count: data?.length || 0 };
}

async function getPaymentsInRange(start, end) {
  const { data } = await supabaseAdmin
    .from("payments")
    .select("amount, payment_date")
    .eq("is_reversed", false)
    .gte("payment_date", start)
    .lte("payment_date", end);

  const byDateMap = {};
  let total = 0;
  for (const p of data || []) {
    total += Number(p.amount);
    byDateMap[p.payment_date] = (byDateMap[p.payment_date] || 0) + Number(p.amount);
  }
  const byDate = Object.entries(byDateMap)
    .map(([date, amount]) => ({ date, amount: round2(amount) }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return { total: round2(total), count: data?.length || 0, byDate };
}

async function getOutstandingByClient() {
  const { data: invoices } = await supabaseAdmin
    .from("invoices")
    .select("id, client_id, total_amount, client_details_snapshot")
    .in("invoice_status", ["issued", "paid"]);
  if (!invoices?.length) return [];

  const invoiceIds = invoices.map((i) => i.id);
  const { data: payments } = await supabaseAdmin
    .from("payments")
    .select("invoice_id, amount")
    .in("invoice_id", invoiceIds)
    .eq("is_reversed", false);

  const paidByInvoice = {};
  for (const p of payments || []) {
    paidByInvoice[p.invoice_id] = (paidByInvoice[p.invoice_id] || 0) + Number(p.amount);
  }

  const byClient = {};
  for (const inv of invoices) {
    const paid = paidByInvoice[inv.id] || 0;
    const outstanding = Math.max(Number(inv.total_amount) - paid, 0);
    if (outstanding <= 0) continue;
    const key = inv.client_id;
    byClient[key] = byClient[key] || {
      client_id: key,
      client_name: inv.client_details_snapshot?.client_name || "Unknown",
      outstanding: 0,
    };
    byClient[key].outstanding += outstanding;
  }

  return Object.values(byClient)
    .map((c) => ({ ...c, outstanding: round2(c.outstanding) }))
    .sort((a, b) => b.outstanding - a.outstanding);
}

async function getProjectCounts() {
  const { data } = await supabaseAdmin
    .from("projects")
    .select("work_status, submission_deadline")
    .is("archived_at", null);

  const t = new Date().toISOString().slice(0, 10);
  const counts = { completed: 0, in_progress: 0, overdue: 0 };
  for (const p of data || []) {
    if (p.work_status !== "completed" && p.submission_deadline < t) counts.overdue += 1;
    else if (p.work_status === "completed") counts.completed += 1;
    else if (p.work_status === "in_progress") counts.in_progress += 1;
  }
  return counts;
}

async function getStaffCompletion() {
  const { data } = await supabaseAdmin
    .from("staff_summary")
    .select("staff_id, assigned_clients, active_projects, completed_projects, pending_projects");
  if (!data?.length) return [];

  const { data: staff } = await supabaseAdmin.from("profiles").select("id, full_name").eq("role", "staff");
  const nameById = Object.fromEntries((staff || []).map((s) => [s.id, s.full_name]));

  return data
    .map((s) => ({ ...s, full_name: nameById[s.staff_id] || "—" }))
    .sort((a, b) => b.completed_projects - a.completed_projects);
}

/**
 * Trailing 12 months of revenue (issued + paid invoices), independent of
 * the selected range filter — see the note at the top of this file.
 */
async function getRevenueByMonth() {
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setUTCMonth(twelveMonthsAgo.getUTCMonth() - 11);
  twelveMonthsAgo.setUTCDate(1);
  const since = twelveMonthsAgo.toISOString().slice(0, 10);

  const { data } = await supabaseAdmin
    .from("invoices")
    .select("total_amount, invoice_date")
    .in("invoice_status", ["issued", "paid"])
    .gte("invoice_date", since);

  const byMonth = {};
  for (const inv of data || []) {
    const month = inv.invoice_date.slice(0, 7); // YYYY-MM
    byMonth[month] = (byMonth[month] || 0) + Number(inv.total_amount);
  }

  // Fill in every month in the window, even ones with zero revenue, so the
  // chart doesn't skip gaps.
  const months = [];
  const cursor = new Date(twelveMonthsAgo);
  for (let i = 0; i < 12; i++) {
    const key = cursor.toISOString().slice(0, 7);
    months.push({ month: key, revenue: round2(byMonth[key] || 0) });
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return months;
}

function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
