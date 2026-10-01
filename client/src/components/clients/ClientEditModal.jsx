import { useEffect, useState } from "react";
import Modal from "../ui/Modal";
import { clientsApi } from "../../services/clients";

export default function ClientEditModal({ open, onClose, onSaved, client }) {
  const [form, setForm] = useState({ client_name: "", company_name: "", phone: "", email: "", address: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (client) {
      setForm({
        client_name: client.client_name || "",
        company_name: client.company_name || "",
        phone: client.phone || "",
        email: client.email || "",
        address: client.address || "",
      });
      setError("");
    }
  }, [client, open]);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await clientsApi.update(client.id, form);
      onSaved?.();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || "Could not save changes.");
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    "w-full rounded-lg border border-border-muted bg-paper px-3 py-2 text-sm text-text-dark outline-none focus:border-ink";
  const labelClass = "mb-1 block text-xs font-medium text-text-muted";

  return (
    <Modal open={open} onClose={onClose} title="Edit Client">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className={labelClass}>Client Full Name</label>
          <input
            required
            className={inputClass}
            value={form.client_name}
            onChange={(e) => setForm((f) => ({ ...f, client_name: e.target.value }))}
          />
        </div>
        <div>
          <label className={labelClass}>Company Name</label>
          <input
            className={inputClass}
            value={form.company_name}
            onChange={(e) => setForm((f) => ({ ...f, company_name: e.target.value }))}
          />
        </div>
        <div>
          <label className={labelClass}>Phone Number</label>
          <input
            required
            className={inputClass}
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
          />
        </div>
        <div>
          <label className={labelClass}>Email Address</label>
          <input
            type="email"
            className={inputClass}
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          />
        </div>
        <div>
          <label className={labelClass}>Address</label>
          <input
            className={inputClass}
            value={form.address}
            onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
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
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
