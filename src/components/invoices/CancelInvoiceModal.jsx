import { useState } from "react";
import Modal from "../ui/Modal";
import { invoicesApi } from "../../services/invoices";

export default function CancelInvoiceModal({ open, onClose, invoiceId, onCancelled }) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const { invoice } = await invoicesApi.cancel(invoiceId, reason);
      onCancelled?.(invoice);
      onClose();
      setReason("");
    } catch (err) {
      setError(err.response?.data?.error || "Could not cancel invoice.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Cancel Invoice">
      <form onSubmit={handleSubmit} className="space-y-3">
        <p className="text-sm text-text-muted">
          This marks the invoice as cancelled and keeps it in the history for audit purposes. It cannot be
          undone from here.
        </p>
        <div>
          <label className="mb-1 block text-xs font-medium text-text-muted">Reason *</label>
          <textarea
            required
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full rounded-lg border border-border-muted bg-paper px-3 py-2 text-sm outline-none focus:border-ink"
            placeholder="e.g. Duplicate invoice, incorrect amount, client requested revision…"
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
            {saving ? "Cancelling…" : "Cancel Invoice"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
