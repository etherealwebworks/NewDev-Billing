import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { settingsApi } from "../../services/settings";

const FIELD = (label, key, opts = {}) => ({ label, key, ...opts });

const COMPANY_FIELDS = [
  FIELD("Company Name", "company_name", { required: true }),
  FIELD("Logo URL", "logo_url"),
  FIELD("Address", "address", { textarea: true }),
  FIELD("Phone Number", "phone"),
  FIELD("Phone Number 2 (optional)", "phone_2"),
  FIELD("Email Address", "email", { type: "email" }),
  FIELD("Website URL", "website"),
];

const INVOICE_FIELDS = [
  FIELD("Invoice Number Prefix", "invoice_prefix", { required: true, hint: "e.g. INV — next number will look like INV-2026-0001" }),
  FIELD("Invoice Footer Message", "invoice_footer", { textarea: true }),
  FIELD("Payment Instructions", "payment_instructions", { textarea: true }),
  FIELD("Authorized Signatory Name", "authorized_signatory_name"),
  FIELD("Default Invoice Description", "default_invoice_description", { textarea: true }),
];

const APP_FIELDS = [
  FIELD("Time Zone", "time_zone"),
  FIELD("Date Format", "date_format", { hint: "e.g. DD/MM/YYYY" }),
];

export default function CompanySettings() {
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    settingsApi
      .get()
      .then((d) => setForm(d.settings))
      .finally(() => setLoading(false));
  }, []);

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const { settings } = await settingsApi.update(form);
      setForm(settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err.response?.data?.error || "Could not save settings.");
    } finally {
      setSaving(false);
    }
  }

  if (loading || !form) return <p className="text-sm text-text-muted">Loading…</p>;

  const inputClass =
    "w-full rounded-lg border border-border-muted bg-paper px-3 py-2 text-sm text-text-dark outline-none focus:border-ink";
  const labelClass = "mb-1 block text-xs font-medium text-text-muted";

  function renderField(f) {
    return (
      <div key={f.key} className={f.textarea ? "sm:col-span-2" : ""}>
        <label className={labelClass}>{f.label}</label>
        {f.textarea ? (
          <textarea
            rows={2}
            className={inputClass}
            value={form[f.key] || ""}
            onChange={(e) => set(f.key, e.target.value)}
          />
        ) : (
          <input
            type={f.type || "text"}
            required={f.required}
            className={inputClass}
            value={form[f.key] || ""}
            onChange={(e) => set(f.key, e.target.value)}
          />
        )}
        {f.hint && <p className="mt-1 text-xs text-text-muted">{f.hint}</p>}
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-xl font-semibold text-text-dark">Company Settings</h1>
      <p className="mt-1 text-sm text-text-muted">
        These details populate every newly generated invoice. Changing them never alters invoices
        already issued — each one keeps a frozen snapshot from the moment it was created.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-8">
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-text-muted">
            Company Information
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{COMPANY_FIELDS.map(renderField)}</div>
        </section>

        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-text-muted">
            Invoice Settings
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {INVOICE_FIELDS.map(renderField)}
            <div>
              <label className={labelClass}>Default Currency</label>
              <input className={inputClass} value={form.default_currency || ""} onChange={(e) => set("default_currency", e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Thermal Printer Width</label>
              <select
                className={inputClass}
                value={form.thermal_paper_width}
                onChange={(e) => set("thermal_paper_width", e.target.value)}
              >
                <option value="58mm">58mm</option>
                <option value="80mm">80mm</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Default Invoice Paper Format</label>
              <select
                className={inputClass}
                value={form.default_invoice_format}
                onChange={(e) => set("default_invoice_format", e.target.value)}
              >
                <option value="a4">A4</option>
                <option value="thermal">Thermal</option>
              </select>
            </div>
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-text-muted">
            Application Settings
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Company Display Name</label>
              <input
                className={inputClass}
                value={form.company_name || ""}
                onChange={(e) => set("company_name", e.target.value)}
              />
            </div>
            {APP_FIELDS.map(renderField)}
          </div>
        </section>

        {error && (
          <div className="rounded-lg border border-border-muted bg-paper-off px-3 py-2 text-xs text-text-dark">
            {error}
          </div>
        )}

        <div className="flex items-center gap-3 border-t border-border-muted pt-4">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-ink/90 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>
          {saved && (
            <span className="flex items-center gap-1.5 text-sm text-text-muted">
              <Check size={14} />
              Saved
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
