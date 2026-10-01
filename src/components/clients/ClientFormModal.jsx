import { useEffect, useMemo, useState } from "react";
import Modal from "../ui/Modal";
import { clientsApi } from "../../services/clients";
import { servicesApi } from "../../services/services";

const empty = {
  client_name: "",
  company_name: "",
  phone: "",
  email: "",
  address: "",
  project_name: "",
  description: "",
  number_of_videos: 1,
  number_of_posters: 0,
  allowed_submission_days: 7,
  start_date: new Date().toISOString().slice(0, 10),
  submission_deadline: "",
  deadline_manually_set: false,
  assigned_staff_id: "",
  notes: "",
  service_id: "",
  project_type: "standard",
  event_name: "",
  project_amount: "",
  advance_amount: "",
  payment_due_date: "",
};

function addDays(isoDate, days) {
  if (!isoDate || !days) return "";
  const d = new Date(isoDate + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + Number(days));
  return d.toISOString().slice(0, 10);
}

export default function ClientFormModal({ open, onClose, onCreated, staffOptions }) {
  const [form, setForm] = useState(empty);
  const [services, setServices] = useState([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(empty);
      setError("");
      servicesApi.list().then((d) => setServices(d.services));
    }
  }, [open]);

  const autoDeadline = useMemo(
    () => addDays(form.start_date, form.allowed_submission_days),
    [form.start_date, form.allowed_submission_days]
  );

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function applyService(serviceId) {
    set("service_id", serviceId);
    const service = services.find((s) => s.id === serviceId);
    if (service) {
      setForm((f) => ({
        ...f,
        service_id: serviceId,
        number_of_videos: service.number_of_videos,
        number_of_posters: service.number_of_posters,
        project_amount: service.budget,
      }));
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const payload = {
        ...form,
        service_id: form.service_id || null,
        event_name: form.project_type === "event" ? form.event_name : null,
        submission_deadline: form.deadline_manually_set ? form.submission_deadline : autoDeadline,
        project_amount: Number(form.project_amount || 0),
        advance_amount: Number(form.advance_amount || 0),
        number_of_posters: Number(form.number_of_posters || 0),
      };
      await clientsApi.create(payload);
      onCreated?.();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || "Could not create client.");
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    "w-full rounded-lg border border-border-muted bg-paper px-3 py-2 text-sm text-text-dark outline-none focus:border-ink";
  const labelClass = "mb-1 block text-xs font-medium text-text-muted";

  return (
    <Modal open={open} onClose={onClose} title="Add Client" wide>
      <form onSubmit={handleSubmit} className="space-y-6">
        <section>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-text-muted">
            Client Details
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Client Full Name *</label>
              <input
                required
                className={inputClass}
                value={form.client_name}
                onChange={(e) => set("client_name", e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass}>Company Name</label>
              <input
                className={inputClass}
                value={form.company_name}
                onChange={(e) => set("company_name", e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass}>Phone Number *</label>
              <input
                required
                className={inputClass}
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass}>Email Address</label>
              <input
                type="email"
                className={inputClass}
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>Client Address</label>
              <input
                className={inputClass}
                value={form.address}
                onChange={(e) => set("address", e.target.value)}
              />
            </div>
          </div>
        </section>

        <section>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-text-muted">
            Project Details
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {services.length > 0 && (
              <div className="sm:col-span-2">
                <label className={labelClass}>Start from a Service (optional)</label>
                <select
                  className={inputClass}
                  value={form.service_id}
                  onChange={(e) => applyService(e.target.value)}
                >
                  <option value="">— No package, enter details manually —</option>
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.number_of_videos} videos, {s.number_of_posters} posters)
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-text-muted">
                  Prefills videos, posters, and price below — everything stays editable afterward.
                </p>
              </div>
            )}

            <div className="sm:col-span-2">
              <label className={labelClass}>Project Name *</label>
              <input
                required
                className={inputClass}
                value={form.project_name}
                onChange={(e) => set("project_name", e.target.value)}
              />
            </div>

            <div>
              <label className={labelClass}>Project Type *</label>
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
                <label className={labelClass}>Event Name *</label>
                <input
                  required
                  className={inputClass}
                  value={form.event_name}
                  onChange={(e) => set("event_name", e.target.value)}
                  placeholder="e.g. Priya & Karthik's Wedding"
                />
              </div>
            )}

            <div>
              <label className={labelClass}>Number of Videos *</label>
              <input
                type="number"
                min={1}
                required
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
              <label className={labelClass}>Allowed Submission Days *</label>
              <input
                type="number"
                min={1}
                required
                className={inputClass}
                value={form.allowed_submission_days}
                onChange={(e) => set("allowed_submission_days", e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass}>Project Start Date *</label>
              <input
                type="date"
                required
                className={inputClass}
                value={form.start_date}
                onChange={(e) => set("start_date", e.target.value)}
              />
            </div>
            <div>
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
                  onChange={(e) =>
                    set("deadline_manually_set", e.target.checked) ||
                    set("submission_deadline", autoDeadline)
                  }
                />
                Set deadline manually
              </label>
            </div>
            <div>
              <label className={labelClass}>Assigned Staff Member *</label>
              <select
                required
                className={inputClass}
                value={form.assigned_staff_id}
                onChange={(e) => set("assigned_staff_id", e.target.value)}
              >
                <option value="">Select staff…</option>
                {staffOptions?.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.full_name}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-text-muted">
                A staff member can be assigned to any number of clients at once — this isn't limited to one.
              </p>
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>Project Notes</label>
              <textarea
                rows={2}
                className={inputClass}
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
              />
            </div>
          </div>
        </section>

        <section>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-text-muted">
            Billing Details
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className={labelClass}>Total Project Amount (₹) *</label>
              <input
                type="number"
                min={0}
                step="0.01"
                required
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
            <div>
              <label className={labelClass}>Payment Due Date</label>
              <input
                type="date"
                className={inputClass}
                value={form.payment_due_date}
                onChange={(e) => set("payment_due_date", e.target.value)}
              />
            </div>
          </div>
        </section>

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
            {saving ? "Saving…" : "Save Client"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
