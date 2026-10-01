import { useEffect, useState } from "react";
import Modal from "../ui/Modal";
import { servicesApi } from "../../services/services";

const empty = { name: "", description: "", number_of_videos: 1, number_of_posters: 0, budget: "" };

export default function ServiceFormModal({ open, onClose, onSaved, service }) {
  const [form, setForm] = useState(empty);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const isEdit = !!service;

  useEffect(() => {
    if (open) {
      setForm(
        service
          ? {
              name: service.name,
              description: service.description || "",
              number_of_videos: service.number_of_videos,
              number_of_posters: service.number_of_posters,
              budget: service.budget,
            }
          : empty
      );
      setError("");
    }
  }, [open, service]);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload = {
        ...form,
        number_of_videos: Number(form.number_of_videos),
        number_of_posters: Number(form.number_of_posters || 0),
        budget: Number(form.budget),
      };
      if (isEdit) await servicesApi.update(service.id, payload);
      else await servicesApi.create(payload);
      onSaved?.();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || "Could not save service.");
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    "w-full rounded-lg border border-border-muted bg-paper px-3 py-2 text-sm text-text-dark outline-none focus:border-ink";
  const labelClass = "mb-1 block text-xs font-medium text-text-muted";

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? "Edit Service" : "Add Service"}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className={labelClass}>Service Name *</label>
          <input
            required
            className={inputClass}
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="e.g. Instagram Reels Package"
          />
        </div>
        <div>
          <label className={labelClass}>Description</label>
          <textarea
            rows={2}
            className={inputClass}
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Number of Videos *</label>
            <input
              type="number"
              min={1}
              required
              className={inputClass}
              value={form.number_of_videos}
              onChange={(e) => setForm((f) => ({ ...f, number_of_videos: e.target.value }))}
            />
          </div>
          <div>
            <label className={labelClass}>Number of Posters</label>
            <input
              type="number"
              min={0}
              className={inputClass}
              value={form.number_of_posters}
              onChange={(e) => setForm((f) => ({ ...f, number_of_posters: e.target.value }))}
            />
          </div>
        </div>
        <div>
          <label className={labelClass}>Budget / Price (₹) *</label>
          <input
            type="number"
            min={0}
            step="0.01"
            required
            className={inputClass}
            value={form.budget}
            onChange={(e) => setForm((f) => ({ ...f, budget: e.target.value }))}
          />
          <p className="mt-1 text-xs text-text-muted">
            This is the default price used when a project starts from this service — it stays editable
            per-project afterward.
          </p>
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
            {saving ? "Saving…" : isEdit ? "Save Changes" : "Add Service"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
