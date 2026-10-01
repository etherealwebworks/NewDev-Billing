import { useEffect, useMemo, useState } from "react";
import Modal from "../ui/Modal";
import { projectsApi } from "../../services/projects";

function addDays(isoDate, days) {
  if (!isoDate || !days) return "";
  const d = new Date(isoDate + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + Number(days));
  return d.toISOString().slice(0, 10);
}

export default function ProjectEditModal({ open, onClose, onSaved, project, staffOptions }) {
  const [form, setForm] = useState(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (project) {
      setForm({
        project_name: project.project_name || "",
        description: project.description || "",
        number_of_videos: project.number_of_videos,
        number_of_posters: project.number_of_posters || 0,
        allowed_submission_days: project.allowed_submission_days,
        start_date: project.start_date,
        submission_deadline: project.submission_deadline,
        deadline_manually_set: project.deadline_manually_set,
        assigned_staff_id: project.assigned_staff_id,
        project_type: project.project_type || "standard",
        event_name: project.event_name || "",
        project_amount: project.project_amount,
        advance_amount: project.advance_amount,
        payment_due_date: project.payment_due_date || "",
        notes: project.notes || "",
      });
      setError("");
    }
  }, [project, open]);

  const autoDeadline = useMemo(
    () => (form ? addDays(form.start_date, form.allowed_submission_days) : ""),
    [form?.start_date, form?.allowed_submission_days]
  );

  if (!form) return null;

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await projectsApi.update(project.id, {
        ...form,
        event_name: form.project_type === "event" ? form.event_name : null,
        submission_deadline: form.deadline_manually_set ? form.submission_deadline : autoDeadline,
        number_of_videos: Number(form.number_of_videos),
        number_of_posters: Number(form.number_of_posters || 0),
        allowed_submission_days: Number(form.allowed_submission_days),
        project_amount: Number(form.project_amount),
        advance_amount: Number(form.advance_amount || 0),
        payment_due_date: form.payment_due_date || null,
      });
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
    <Modal open={open} onClose={onClose} title={`Edit Project — ${project?.client?.client_name || ""}`} wide>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={labelClass}>Project Name</label>
            <input
              required
              className={inputClass}
              value={form.project_name}
              onChange={(e) => set("project_name", e.target.value)}
            />
          </div>

          <div>
            <label className={labelClass}>Project Type</label>
            <select
              className={inputClass}
              value={form.project_type}
              onChange={(e) => set("project_type", e.target.value)}
            >
              <option value="standard">Standard</option>
              <option value="event">Event Video</option>
            </select>
          </div>
          {form.project_type === "event" && (
            <div>
              <label className={labelClass}>Event Name</label>
              <input
                required
                className={inputClass}
                value={form.event_name}
                onChange={(e) => set("event_name", e.target.value)}
              />
            </div>
          )}

          <div>
            <label className={labelClass}>Number of Videos</label>
            <input
              type="number"
              min={1}
              className={inputClass}
              value={form.number_of_videos}
              onChange={(e) => set("number_of_videos", e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>Number of Posters</label>
            <input
              type="number"
              min={0}
              className={inputClass}
              value={form.number_of_posters}
              onChange={(e) => set("number_of_posters", e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>Assigned Staff</label>
            <select
              className={inputClass}
              value={form.assigned_staff_id}
              onChange={(e) => set("assigned_staff_id", e.target.value)}
            >
              {staffOptions?.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.full_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Start Date</label>
            <input
              type="date"
              className={inputClass}
              value={form.start_date}
              onChange={(e) => set("start_date", e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>Allowed Submission Days</label>
            <input
              type="number"
              min={1}
              className={inputClass}
              value={form.allowed_submission_days}
              onChange={(e) => set("allowed_submission_days", e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Video Submission Deadline</label>
            <input
              type="date"
              disabled={!form.deadline_manually_set}
              className={`${inputClass} disabled:bg-paper-off disabled:text-text-muted`}
              value={form.deadline_manually_set ? form.submission_deadline : autoDeadline}
              onChange={(e) => set("submission_deadline", e.target.value)}
            />
            <label className="mt-1.5 flex items-center gap-2 text-xs text-text-muted">
              <input
                type="checkbox"
                checked={form.deadline_manually_set}
                onChange={(e) => set("deadline_manually_set", e.target.checked)}
              />
              Set deadline manually
            </label>
          </div>
          <div>
            <label className={labelClass}>Project Amount (₹)</label>
            <input
              type="number"
              min={0}
              step="0.01"
              className={inputClass}
              value={form.project_amount}
              onChange={(e) => set("project_amount", e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>Advance Amount (₹)</label>
            <input
              type="number"
              min={0}
              step="0.01"
              className={inputClass}
              value={form.advance_amount}
              onChange={(e) => set("advance_amount", e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Notes</label>
            <textarea
              rows={2}
              className={inputClass}
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
            />
          </div>
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
