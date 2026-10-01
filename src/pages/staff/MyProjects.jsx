import { useEffect, useState, useCallback } from "react";
import { projectsApi } from "../../services/projects";
import StatusBadge from "../../components/ui/StatusBadge";
import StatusUpdateControl from "../../components/projects/StatusUpdateControl";
import { formatDate } from "../../utils/format";

const FILTERS = [
  { value: "", label: "All" },
  { value: "not_started", label: "Not Started" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "overdue", label: "Overdue" },
];

export default function MyProjects() {
  const [projects, setProjects] = useState([]);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await projectsApi.mine({ status: filter || undefined });
    setProjects(data.projects);
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  function handleUpdated(updated) {
    setProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  }

  return (
    <div>
      <h1 className="text-xl font-semibold text-text-dark">My Projects</h1>

      <div className="mt-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
              filter === f.value
                ? "bg-ink text-white"
                : "border border-border-muted text-text-muted hover:bg-paper-off"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-3">
        {loading && <p className="text-sm text-text-muted">Loading…</p>}
        {!loading && projects.length === 0 && (
          <p className="rounded-2xl border border-dashed border-border-muted p-8 text-center text-sm text-text-muted">
            No projects match this filter.
          </p>
        )}
        {projects.map((p) => (
          <div
            key={p.id}
            className="flex flex-col gap-3 rounded-2xl border border-border-muted bg-paper p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-text-dark">{p.project_name}</span>
                <StatusBadge status={p.effective_status} />
              </div>
              <div className="mt-1 text-xs text-text-muted">
                {p.client?.client_name} · {p.number_of_videos} videos · Deadline{" "}
                {formatDate(p.submission_deadline)}
                {p.completion_date && <> · Completed {formatDate(p.completion_date)}</>}
              </div>
            </div>
            <StatusUpdateControl project={p} onUpdated={handleUpdated} />
          </div>
        ))}
      </div>
    </div>
  );
}
