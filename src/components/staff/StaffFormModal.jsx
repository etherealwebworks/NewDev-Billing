import { useState } from "react";
import Modal from "../ui/Modal";
import Avatar from "../ui/Avatar";
import { staffApi } from "../../services/staff";

const empty = { full_name: "", email: "", phone: "", avatar_url: "", password: "" };

export default function StaffFormModal({ open, onClose, onCreated }) {
  const [form, setForm] = useState(empty);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await staffApi.create(form);
      onCreated?.();
      onClose();
      setForm(empty);
    } catch (err) {
      setError(err.response?.data?.error || "Could not create staff account.");
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    "w-full rounded-lg border border-border-muted bg-paper px-3 py-2 text-sm text-text-dark outline-none focus:border-ink";
  const labelClass = "mb-1 block text-xs font-medium text-text-muted";

  return (
    <Modal open={open} onClose={onClose} title="Add Staff">
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
          <label className={labelClass}>Full Name *</label>
          <input
            required
            className={inputClass}
            value={form.full_name}
            onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
          />
        </div>
        <div>
          <label className={labelClass}>Email *</label>
          <input
            type="email"
            required
            className={inputClass}
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
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
        <div>
          <label className={labelClass}>Initial Password *</label>
          <input
            type="password"
            required
            minLength={8}
            className={inputClass}
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
          />
          <p className="mt-1 text-xs text-text-muted">At least 8 characters. Share this with the staff member securely — they can change it after logging in.</p>
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
            {saving ? "Creating…" : "Create Account"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
