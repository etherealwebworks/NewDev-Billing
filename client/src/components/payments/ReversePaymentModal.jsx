import { useState } from "react";
import Modal from "../ui/Modal";
import { paymentsApi } from "../../services/payments";

export default function ReversePaymentModal({ open, onClose, paymentId, onReversed }) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const { invoice_summary } = await paymentsApi.reverse(paymentId, reason);
      onReversed?.(invoice_summary);
      onClose();
      setReason("");
    } catch (err) {
      setError(err.response?.data?.error || "Could not reverse payment.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Reverse Payment">
      <form onSubmit={handleSubmit} className="space-y-3">
        <p className="text-sm text-text-muted">
          This marks the payment as reversed and recalculates the invoice's outstanding balance. The
          record stays for audit purposes — it isn't deleted.
        </p>
        <div>
          <label className="mb-1 block text-xs font-medium text-text-muted">Reason *</label>
          <textarea
            required
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full rounded-lg border border-border-muted bg-paper px-3 py-2 text-sm outline-none focus:border-ink"
            placeholder="e.g. Payment bounced, entered in error…"
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
            Back
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-ink/90 disabled:opacity-60"
          >
            {saving ? "Reversing…" : "Reverse Payment"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
