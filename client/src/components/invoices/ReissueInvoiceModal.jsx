import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Modal from "../ui/Modal";
import InvoiceItemsEditor from "./InvoiceItemsEditor";
import { invoicesApi } from "../../services/invoices";

export default function ReissueInvoiceModal({ open, onClose, invoice }) {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [dueDate, setDueDate] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && invoice) {
      setItems(invoice.items.map((it) => ({ ...it })));
      setDueDate(invoice.due_date || "");
      setError("");
    }
  }, [open, invoice]);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const { invoice: newInvoice } = await invoicesApi.reissue(invoice.id, {
        due_date: dueDate || null,
        items,
      });
      onClose();
      navigate(`/admin/invoices/${newInvoice.id}`);
    } catch (err) {
      setError(err.response?.data?.error || "Could not revise invoice.");
    } finally {
      setSaving(false);
    }
  }

  if (!invoice) return null;

  return (
    <Modal open={open} onClose={onClose} title={`Revise Invoice ${invoice.invoice_number}`} wide>
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-xs text-text-muted">
          This cancels <strong>{invoice.invoice_number}</strong> and issues a new invoice with a fresh
          number, linked back to this one. Use it for genuine corrections, not routine edits.
        </p>

        <div className="max-w-xs">
          <label className="mb-1 block text-xs font-medium text-text-muted">Payment Due Date</label>
          <input
            type="date"
            className="w-full rounded-lg border border-border-muted bg-paper px-3 py-2 text-sm outline-none focus:border-ink"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>

        <InvoiceItemsEditor items={items} onChange={setItems} />

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
            {saving ? "Revising…" : "Issue Revised Invoice"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
