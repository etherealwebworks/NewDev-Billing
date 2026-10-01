import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { Undo2, ChevronLeft, ChevronRight } from "lucide-react";
import { paymentsApi } from "../../services/payments";
import ReversePaymentModal from "../../components/payments/ReversePaymentModal";
import { formatINR, formatDate } from "../../utils/format";

const PAGE_SIZE = 20;
const METHOD_LABELS = { cash: "Cash", upi: "UPI", bank_transfer: "Bank Transfer", card: "Card", other: "Other" };

export default function Payments() {
  const [payments, setPayments] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [methodFilter, setMethodFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [reversing, setReversing] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await paymentsApi.list({
      page,
      page_size: PAGE_SIZE,
      payment_method: methodFilter || undefined,
    });
    setPayments(data.payments);
    setTotal(data.pagination.total);
    setLoading(false);
  }, [page, methodFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <h1 className="text-xl font-semibold text-text-dark">Payments</h1>
      <p className="mt-1 text-sm text-text-muted">
        Record a payment from an invoice's detail page. This is a manual ledger — there's no payment
        gateway here.
      </p>

      <div className="mt-4">
        <select
          value={methodFilter}
          onChange={(e) => {
            setPage(1);
            setMethodFilter(e.target.value);
          }}
          className="rounded-lg border border-border-muted bg-paper px-3 py-2 text-sm outline-none focus:border-ink"
        >
          <option value="">All Methods</option>
          {Object.entries(METHOD_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-4 overflow-x-auto rounded-2xl border border-border-muted bg-paper">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead>
            <tr className="border-b border-border-muted text-xs uppercase tracking-wide text-text-muted">
              <th className="px-4 py-3 font-medium">Invoice</th>
              <th className="px-4 py-3 font-medium">Client</th>
              <th className="px-4 py-3 font-medium">Amount</th>
              <th className="px-4 py-3 font-medium">Method</th>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Reference</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-text-muted">
                  Loading…
                </td>
              </tr>
            )}
            {!loading && payments.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-text-muted">
                  No payments recorded yet.
                </td>
              </tr>
            )}
            {!loading &&
              payments.map((p) => (
                <tr key={p.id} className="border-b border-border-muted last:border-0 hover:bg-paper-off">
                  <td className="px-4 py-3">
                    <Link
                      to={`/admin/invoices/${p.invoice?.id}`}
                      className="font-medium text-text-dark hover:underline"
                    >
                      {p.invoice?.invoice_number}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-text-muted">{p.invoice?.client_details_snapshot?.client_name}</td>
                  <td className="px-4 py-3 text-text-dark">{formatINR(p.amount)}</td>
                  <td className="px-4 py-3 text-text-muted">{METHOD_LABELS[p.payment_method]}</td>
                  <td className="px-4 py-3 text-text-muted">{formatDate(p.payment_date)}</td>
                  <td className="px-4 py-3 text-text-muted">{p.transaction_reference || "—"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                        p.is_reversed
                          ? "border border-border-muted bg-paper text-text-muted line-through"
                          : "bg-paper-off text-text-dark border border-border-muted"
                      }`}
                    >
                      {p.is_reversed ? "Reversed" : "Recorded"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {!p.is_reversed && (
                      <button
                        onClick={() => setReversing(p)}
                        title="Reverse"
                        className="rounded-lg p-1.5 text-text-muted hover:bg-paper-off hover:text-text-dark"
                      >
                        <Undo2 size={15} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm text-text-muted">
        <span>
          Page {page} of {totalPages} · {total} payments
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

      <ReversePaymentModal
        open={!!reversing}
        onClose={() => setReversing(null)}
        paymentId={reversing?.id}
        onReversed={load}
      />
    </div>
  );
}
