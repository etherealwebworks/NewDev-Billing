import { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Printer, Download, Ban, FileEdit, IndianRupee, Undo2 } from "lucide-react";
import { invoicesApi } from "../../services/invoices";
import InvoiceA4 from "../../components/invoices/InvoiceA4";
import InvoiceThermal from "../../components/invoices/InvoiceThermal";
import InvoiceStatusBadge from "../../components/invoices/InvoiceStatusBadge";
import CancelInvoiceModal from "../../components/invoices/CancelInvoiceModal";
import ReissueInvoiceModal from "../../components/invoices/ReissueInvoiceModal";
import PaymentStatusBadge from "../../components/payments/PaymentStatusBadge";
import RecordPaymentModal from "../../components/payments/RecordPaymentModal";
import ReversePaymentModal from "../../components/payments/ReversePaymentModal";
import { printWithPageSize, downloadElementAsPdf } from "../../utils/print";
import { formatINR, formatDate } from "../../utils/format";

const METHOD_LABELS = { cash: "Cash", upi: "UPI", bank_transfer: "Bank Transfer", card: "Card", other: "Other" };

export default function InvoiceView() {
  const { id } = useParams();
  const [invoice, setInvoice] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("a4"); // 'a4' | 'thermal-80' | 'thermal-58'
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reissueOpen, setReissueOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [reversing, setReversing] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const printRef = useRef(null);

  function load() {
    setLoading(true);
    invoicesApi
      .get(id)
      .then((d) => {
        setInvoice(d.invoice);
        setPayments(d.payments || []);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function handlePrint() {
    if (view === "a4") {
      printWithPageSize("size: A4; margin: 12mm;");
    } else {
      const mm = view === "thermal-58" ? "58mm" : "80mm";
      printWithPageSize(`size: ${mm} auto; margin: 0;`);
    }
  }

  async function handleDownload() {
    if (!printRef.current || !invoice) return;
    setDownloading(true);
    try {
      const widthMm = view === "a4" ? 210 : view === "thermal-58" ? 58 : 80;
      await downloadElementAsPdf(printRef.current, `${invoice.invoice_number}.pdf`, { widthMm });
    } finally {
      setDownloading(false);
    }
  }

  if (loading) return <p className="text-sm text-text-muted">Loading…</p>;
  if (!invoice) return <p className="text-sm text-text-muted">Invoice not found.</p>;

  const canTakePayment = invoice.invoice_status !== "cancelled" && Number(invoice.outstanding_amount) > 0;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to="/admin/invoices" className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text-dark">
          <ArrowLeft size={15} />
          Back to Invoices
        </Link>
        <div className="flex items-center gap-2">
          <InvoiceStatusBadge status={invoice.invoice_status} />
          <PaymentStatusBadge status={invoice.payment_status} />
          <span className="text-sm text-text-muted">{invoice.invoice_number}</span>
        </div>
      </div>

      {/* Screen-only controls — hidden entirely when printing via the
          print isolation rule in index.css (only #invoice-print-root shows). */}
      <div className="mt-4 flex flex-wrap items-center gap-2 print:hidden">
        <div className="flex rounded-lg border border-border-muted p-0.5">
          {[
            ["a4", "A4"],
            ["thermal-80", "Thermal 80mm"],
            ["thermal-58", "Thermal 58mm"],
          ].map(([value, label]) => (
            <button
              key={value}
              onClick={() => setView(value)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                view === value ? "bg-ink text-white" : "text-text-muted hover:bg-paper-off"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <button
          onClick={handlePrint}
          className="flex items-center gap-1.5 rounded-lg border border-border-muted px-3 py-1.5 text-xs font-medium text-text-dark hover:bg-paper-off"
        >
          <Printer size={14} />
          Print
        </button>
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="flex items-center gap-1.5 rounded-lg border border-border-muted px-3 py-1.5 text-xs font-medium text-text-dark hover:bg-paper-off disabled:opacity-60"
        >
          <Download size={14} />
          {downloading ? "Preparing…" : "Download PDF"}
        </button>

        {canTakePayment && (
          <button
            onClick={() => setPaymentOpen(true)}
            className="flex items-center gap-1.5 rounded-lg bg-ink px-3 py-1.5 text-xs font-medium text-white hover:bg-ink/90"
          >
            <IndianRupee size={14} />
            Record Payment
          </button>
        )}

        {invoice.invoice_status === "issued" && (
          <>
            <button
              onClick={() => setReissueOpen(true)}
              className="flex items-center gap-1.5 rounded-lg border border-border-muted px-3 py-1.5 text-xs font-medium text-text-dark hover:bg-paper-off"
            >
              <FileEdit size={14} />
              Revise
            </button>
            <button
              onClick={() => setCancelOpen(true)}
              className="flex items-center gap-1.5 rounded-lg border border-border-muted px-3 py-1.5 text-xs font-medium text-text-dark hover:bg-paper-off"
            >
              <Ban size={14} />
              Cancel Invoice
            </button>
          </>
        )}
      </div>

      {invoice.invoice_status === "cancelled" && (
        <div className="mt-4 rounded-lg border border-border-muted bg-paper-off px-4 py-3 text-sm text-text-muted print:hidden">
          Cancelled {invoice.cancelled_reason && <>— {invoice.cancelled_reason}</>}
        </div>
      )}
      {invoice.supersedes_invoice_id && (
        <div className="mt-2 text-xs text-text-muted print:hidden">
          Supersedes a previous invoice (revision history preserved).
        </div>
      )}

      {/* Balance summary — screen only; the printed A4/thermal layouts
          show their own paid/due lines. */}
      <div className="mt-4 grid grid-cols-3 gap-3 print:hidden">
        <div className="rounded-2xl border border-border-muted bg-paper p-4">
          <div className="text-xs text-text-muted">Total Amount</div>
          <div className="mt-1 text-lg font-semibold text-text-dark">{formatINR(invoice.total_amount)}</div>
        </div>
        <div className="rounded-2xl border border-border-muted bg-paper p-4">
          <div className="text-xs text-text-muted">Amount Paid</div>
          <div className="mt-1 text-lg font-semibold text-text-dark">{formatINR(invoice.amount_paid)}</div>
        </div>
        <div className="rounded-2xl border border-border-muted bg-paper p-4">
          <div className="text-xs text-text-muted">Balance Due</div>
          <div className="mt-1 text-lg font-semibold text-text-dark">{formatINR(invoice.outstanding_amount)}</div>
        </div>
      </div>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-border-muted bg-paper-off p-4 sm:p-8">
        <div id="invoice-print-root" ref={printRef}>
          {view === "a4" && <InvoiceA4 invoice={invoice} />}
          {view === "thermal-80" && <InvoiceThermal invoice={invoice} width="80mm" />}
          {view === "thermal-58" && <InvoiceThermal invoice={invoice} width="58mm" />}
        </div>
      </div>

      {/* Payment history — screen only */}
      <div className="mt-6 rounded-2xl border border-border-muted bg-paper p-4 print:hidden">
        <h2 className="text-sm font-semibold text-text-dark">Payment History</h2>
        {payments.length === 0 ? (
          <p className="mt-2 text-sm text-text-muted">No payments recorded yet.</p>
        ) : (
          <div className="mt-3 divide-y divide-border-muted">
            {payments.map((p) => (
              <div key={p.id} className="flex items-center justify-between py-2.5 text-sm">
                <div>
                  <span className={p.is_reversed ? "text-text-muted line-through" : "text-text-dark"}>
                    {formatINR(p.amount)}
                  </span>
                  <span className="ml-2 text-xs text-text-muted">
                    {METHOD_LABELS[p.payment_method]} · {formatDate(p.payment_date)}
                    {p.transaction_reference && <> · {p.transaction_reference}</>}
                  </span>
                  {p.is_reversed && <span className="ml-2 text-xs text-text-muted">(reversed)</span>}
                </div>
                {!p.is_reversed && (
                  <button
                    onClick={() => setReversing(p)}
                    className="rounded-lg p-1.5 text-text-muted hover:bg-paper-off hover:text-text-dark"
                    title="Reverse"
                  >
                    <Undo2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <CancelInvoiceModal
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        invoiceId={invoice.id}
        onCancelled={() => load()}
      />
      <ReissueInvoiceModal open={reissueOpen} onClose={() => setReissueOpen(false)} invoice={invoice} />
      <RecordPaymentModal
        open={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        invoice={invoice}
        onRecorded={() => load()}
      />
      <ReversePaymentModal
        open={!!reversing}
        onClose={() => setReversing(null)}
        paymentId={reversing?.id}
        onReversed={() => load()}
      />
    </div>
  );
}
