import { Plus, Trash2 } from "lucide-react";
import { formatINR } from "../../utils/format";

export default function InvoiceItemsEditor({ items, onChange }) {
  function updateItem(index, field, value) {
    const next = items.map((it, i) => (i === index ? { ...it, [field]: value } : it));
    onChange(next);
  }

  function addItem() {
    onChange([...items, { description: "", quantity: 1, unit_price: 0 }]);
  }

  function removeItem(index) {
    onChange(items.filter((_, i) => i !== index));
  }

  const subtotal = items.reduce((sum, it) => sum + Number(it.quantity || 0) * Number(it.unit_price || 0), 0);

  return (
    <div>
      <div className="overflow-x-auto rounded-lg border border-border-muted">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead>
            <tr className="border-b border-border-muted bg-paper-off text-xs uppercase tracking-wide text-text-muted">
              <th className="px-3 py-2 font-medium">Description</th>
              <th className="w-20 px-3 py-2 font-medium">Qty</th>
              <th className="w-28 px-3 py-2 font-medium">Unit Price (₹)</th>
              <th className="w-28 px-3 py-2 font-medium">Total</th>
              <th className="w-10 px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={i} className="border-b border-border-muted last:border-0">
                <td className="px-3 py-2">
                  <input
                    required
                    value={item.description}
                    onChange={(e) => updateItem(i, "description", e.target.value)}
                    className="w-full rounded-md border border-border-muted bg-paper px-2 py-1.5 text-sm outline-none focus:border-ink"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    min={0.01}
                    step="0.01"
                    required
                    value={item.quantity}
                    onChange={(e) => updateItem(i, "quantity", e.target.value)}
                    className="w-full rounded-md border border-border-muted bg-paper px-2 py-1.5 text-sm outline-none focus:border-ink"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    required
                    value={item.unit_price}
                    onChange={(e) => updateItem(i, "unit_price", e.target.value)}
                    className="w-full rounded-md border border-border-muted bg-paper px-2 py-1.5 text-sm outline-none focus:border-ink"
                  />
                </td>
                <td className="px-3 py-2 text-text-dark">
                  {formatINR(Number(item.quantity || 0) * Number(item.unit_price || 0))}
                </td>
                <td className="px-3 py-2">
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(i)}
                      className="rounded-md p-1 text-text-muted hover:bg-paper-off hover:text-text-dark"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        type="button"
        onClick={addItem}
        className="mt-2 flex items-center gap-1.5 text-xs font-medium text-text-muted hover:text-text-dark"
      >
        <Plus size={14} />
        Add line item
      </button>

      <div className="mt-3 flex justify-end border-t border-border-muted pt-3 text-sm">
        <div className="w-48">
          <div className="flex justify-between text-text-muted">
            <span>Subtotal</span>
            <span>{formatINR(subtotal)}</span>
          </div>
          <div className="mt-1 flex justify-between font-semibold text-text-dark">
            <span>Total (no GST)</span>
            <span>{formatINR(subtotal)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
