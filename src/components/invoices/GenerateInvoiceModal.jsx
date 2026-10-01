import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Modal from "../ui/Modal";
import InvoiceItemsEditor from "./InvoiceItemsEditor";
import { invoicesApi } from "../../services/invoices";
import { formatINR } from "../../utils/format";

const METHODS = [
  { value: "cash", label: "Cash" },
  { value: "upi", label: "UPI" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "card", label: "Card" },
  { value: "other", label: "Other" },
];

export default function GenerateInvoiceModal({ open, onClose, project }) {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [dueDate, setDueDate] = useState("");
  const [recordAdvance, setRecordAdvance] = useState(false);
  const [advanceMethod, setAdvanceMethod] = useState("upi");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && project) {
      setItems([
        {
          description: `${project.project_name} — ${project.number_of_videos} video(s)`,
          quantity: 1,
          unit_price: Number(project.project_amount),
        },
      ]);
      setDueDate(project.payment_due_date || "");
      setRecordAdvance(false);
      setError("");
    }
  }, [open, project]);

  const advanceAmount = Number(project?.advance_amount || 0);
  const total = items.reduce((s, it) => s + Number(it.quantity || 0) * Number(it.unit_price || 0), 0);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const { invoice } = await invoicesApi.create({
        project_id: project.id,
        due_date: dueDate || null,
        items,
        advance_payment:
          recordAdvance && advanceAmount > 0
            ? { amount: advanceAmount, payment_method: advanceMethod }
            : undefined,
      });
      onClose();
      navigate(`/admin/invoices/${invoice.id}`);
    } catch (err) {
      setError(err.response?.data?.error || "Could not generate invoice.");
    } finally {
      setSaving(false);
    }
  }

  if (!project) return null;

  return (
    <Modal open={open} onClose={onClose} title={`Generate Invoice — ${project.client?.client_name || ""}`} wide>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="rounded-lg bg-paper-off px-3 py-2 text-sm">
          <div className="flex justify-between text-text-muted">
            <span>Total Amount (this invoice)</span>
            <span className="font-medium text-text-dark">{formatINR(total)}</span>
          </div>
          {advanceAmount > 0 && (
            <div className="mt-1 flex justify-between text-text-muted">
              <span>Advance recorded on this project</span>
              <span className="font-medium text-text-dark">{formatINR(advanceAmount)}</span>
            </div>
          )}
        </div>

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

        {advanceAmount > 0 && (
          <div className="rounded-lg border border-border-muted p-3">
            <label className="flex items-center gap-2 text-sm text-text-dark">
              <input
                type="checkbox"
                checked={recordAdvance}
                onChange={(e) => setRecordAdvance(e.target.checked)}
              />
              Record the {formatINR(advanceAmount)} advance as an initial payment on this invoice
            </label>
            {recordAdvance && (
              <div className="mt-2 max-w-xs">
                <label className="mb-1 block text-xs font-medium text-text-muted">Advance Payment Method</label>
                <select
                  className="w-full rounded-lg border border-border-muted bg-paper px-3 py-2 text-sm outline-none focus:border-ink"
                  value={advanceMethod}
                  onChange={(e) => setAdvanceMethod(e.target.value)}
                >
                  {METHODS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        <p className="text-xs text-text-muted">
          A unique invoice number is assigned automatically. No GST is added — the total is exactly what's
          shown above.
        </p>

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
            {saving ? "Generating…" : "Generate Invoice"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
