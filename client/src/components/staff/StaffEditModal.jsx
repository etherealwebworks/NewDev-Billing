import { useEffect, useState } from "react";
import Modal from "../ui/Modal";
import Avatar from "../ui/Avatar";
import { staffApi } from "../../services/staff";

export default function StaffEditModal({ open, onClose, onSaved, staff }) {
  const [form, setForm] = useState({ full_name: "", phone: "", avatar_url: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (staff) {
      setForm({ full_name: staff.full_name || "", phone: staff.phone || "", avatar_url: staff.avatar_url || "" });
      setError("");
    }
  }, [staff, open]);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await staffApi.update(staff.id, form);
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
    <Modal open={open} onClose={onClose} title="Edit Staff">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex items-center gap-3">
          <Avatar name={form.full_name} src={form.avatar_url} size="lg" />
          <div className="flex-1">
            <label className={labelClass}>Profile Photo URL</label>
            <input
              className={inputClass}
              value={form.avatar_url}
              onChange={(e) => setForm((f) => ({ ...f, avatar_url: e.target.value }))}
              placeholder="https://…"
            />
          </div>
        </div>
        <div>
          <label className={labelClass}>Full Name</label>
          <input
            required
            className={inputClass}
            value={form.full_name}
            onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
          />
        </div>
        <div>
          <label className={labelClass}>Phone Number</label>
          <input
            className={inputClass}
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
          />
        </div>
        <p className="text-xs text-text-muted">
          Email can't be changed here since it's also the login identifier.
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
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
