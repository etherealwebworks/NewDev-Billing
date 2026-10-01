import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { invoicesApi } from "../../services/invoices";
import InvoiceStatusBadge from "../../components/invoices/InvoiceStatusBadge";
import PaymentStatusBadge from "../../components/payments/PaymentStatusBadge";
import { formatINR, formatDate } from "../../utils/format";

const PAGE_SIZE = 20;

export default function Invoices() {
  const [invoices, setInvoices] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await invoicesApi.list({
      page,
      page_size: PAGE_SIZE,
      search: search || undefined,
      status: statusFilter || undefined,
    });
    setInvoices(data.invoices);
    setTotal(data.pagination.total);
    setLoading(false);
  }, [page, search, statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <h1 className="text-xl font-semibold text-text-dark">Invoices</h1>
      <p className="mt-1 text-sm text-text-muted">
        Generate an invoice from a project's row on the Projects page.
      </p>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          value={search}
          onChange={(e) => {
            setPage(1);
            setSearch(e.target.value);
          }}
          placeholder="Search invoice number…"
          className="flex-1 rounded-lg border border-border-muted bg-paper px-3 py-2 text-sm outline-none focus:border-ink"
        />
        <select
          value={statusFilter}
          onChange={(e) => {
            setPage(1);
            setStatusFilter(e.target.value);
          }}
          className="rounded-lg border border-border-muted bg-paper px-3 py-2 text-sm outline-none focus:border-ink"
        >
          <option value="">All Statuses</option>
          <option value="issued">Issued</option>
          <option value="paid">Paid</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <div className="mt-4 overflow-x-auto rounded-2xl border border-border-muted bg-paper">
        <table className="w-full min-w-[940px] text-left text-sm">
          <thead>
            <tr className="border-b border-border-muted text-xs uppercase tracking-wide text-text-muted">
              <th className="px-4 py-3 font-medium">Invoice #</th>
              <th className="px-4 py-3 font-medium">Client</th>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Total</th>
              <th className="px-4 py-3 font-medium">Outstanding</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Payment</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-text-muted">
                  Loading…
                </td>
              </tr>
            )}
            {!loading && invoices.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-text-muted">
                  No invoices yet.
                </td>
              </tr>
            )}
            {!loading &&
              invoices.map((inv) => (
                <tr key={inv.id} className="border-b border-border-muted last:border-0 hover:bg-paper-off">
                  <td className="px-4 py-3">
                    <Link to={`/admin/invoices/${inv.id}`} className="font-medium text-text-dark hover:underline">
                      {inv.invoice_number}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-text-muted">{inv.client_details_snapshot?.client_name}</td>
                  <td className="px-4 py-3 text-text-muted">{formatDate(inv.invoice_date)}</td>
                  <td className="px-4 py-3 text-text-dark">{formatINR(inv.total_amount)}</td>
                  <td className="px-4 py-3 text-text-dark">{formatINR(inv.outstanding_amount)}</td>
                  <td className="px-4 py-3">
                    <InvoiceStatusBadge status={inv.invoice_status} />
                  </td>
                  <td className="px-4 py-3">
                    <PaymentStatusBadge status={inv.payment_status} />
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm text-text-muted">
        <span>
          Page {page} of {totalPages} · {total} invoices
        </span>
        <div className="flex gap-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="rounded-lg border border-border-muted p-1.5 disabled:opacity-40"
          >
            <ChevronLeft size={15} />
          </button>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-lg border border-border-muted p-1.5 disabled:opacity-40"
          >
            <ChevronRight size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
