import { useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { projectsApi } from "../../services/projects";

const OPTIONS = [
  { value: "not_started", label: "Not Started" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
];

export default function StatusUpdateControl({ project, onUpdated }) {
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  async function handleChange(e) {
    const work_status = e.target.value;
    setSaving(true);
    try {
      const { project: updated } = await projectsApi.updateStatus(project.id, work_status);
      onUpdated?.(updated);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 1500);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={project.work_status}
        onChange={handleChange}
        disabled={saving}
        className="rounded-lg border border-border-muted bg-paper px-3 py-1.5 text-sm outline-none focus:border-ink disabled:opacity-60"
      >
        {OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {saving && <Loader2 size={14} className="animate-spin text-text-muted" />}
      {justSaved && !saving && <Check size={14} className="text-text-dark" />}
    </div>
  );
}
