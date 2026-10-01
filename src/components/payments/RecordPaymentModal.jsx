import { useEffect, useState } from "react";
import Modal from "../ui/Modal";
import { paymentsApi } from "../../services/payments";
import { formatINR } from "../../utils/format";

const METHODS = [
  { value: "cash", label: "Cash" },
  { value: "upi", label: "UPI" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "card", label: "Card" },
  { value: "other", label: "Other" },
];

export default function RecordPaymentModal({ open, onClose, invoice, onRecorded }) {
  const [form, setForm] = useState({
    amount: "",
    payment_method: "upi",
    payment_date: new Date().toISOString().slice(0, 10),
    transaction_reference: "",
    notes: "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && invoice) {
      setForm((f) => ({ ...f, amount: invoice.outstanding_amount || "" }));
      setError("");
    }
  }, [open, invoice]);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const { invoice_summary } = await paymentsApi.create({
        invoice_id: invoice.id,
        ...form,
        amount: Number(form.amount),
      });
      onRecorded?.(invoice_summary);
      onClose();
      setForm({
        amount: "",
        payment_method: "upi",
        payment_date: new Date().toISOString().slice(0, 10),
        transaction_reference: "",
        notes: "",
      });
    } catch (err) {
      setError(err.response?.data?.error || "Could not record payment.");
    } finally {
      setSaving(false);
    }
  }

  if (!invoice) return null;

  const inputClass =
    "w-full rounded-lg border border-border-muted bg-paper px-3 py-2 text-sm text-text-dark outline-none focus:border-ink";
  const labelClass = "mb-1 block text-xs font-medium text-text-muted";

  return (
    <Modal open={open} onClose={onClose} title={`Record Payment — ${invoice.invoice_number}`}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="rounded-lg bg-paper-off px-3 py-2 text-sm">
          <div className="flex justify-between text-text-muted">
            <span>Outstanding Balance</span>
            <span className="font-medium text-text-dark">{formatINR(invoice.outstanding_amount)}</span>
          </div>
        </div>

        <div>
          <label className={labelClass}>Amount Received (₹) *</label>
          <input
            type="number"
            min={0.01}
            max={invoice.outstanding_amount}
            step="0.01"
            required
            className={inputClass}
            value={form.amount}
            onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Payment Method *</label>
            <select
              required
              className={inputClass}
              value={form.payment_method}
              onChange={(e) => setForm((f) => ({ ...f, payment_method: e.target.value }))}
            >
              {METHODS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Payment Date *</label>
            <input
              type="date"
              required
              className={inputClass}
              value={form.payment_date}
              onChange={(e) => setForm((f) => ({ ...f, payment_date: e.target.value }))}
            />
          </div>
        </div>

        <div>
          <label className={labelClass}>Transaction Reference</label>
          <input
            className={inputClass}
            value={form.transaction_reference}
            onChange={(e) => setForm((f) => ({ ...f, transaction_reference: e.target.value }))}
            placeholder="UTR / reference number"
          />
        </div>

        <div>
          <label className={labelClass}>Notes</label>
          <textarea
            rows={2}
            className={inputClass}
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          />
        </div>

        {error && (
          <div className="rounded-lg border border-border-muted bg-paper-off px-3 py-2 text-xs text-text-dark">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2 border-t border-border-muted pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border-muted px-4 py-2 text-sm text-text-dark hover:bg-paper-off"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-ink/90 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Record Payment"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
