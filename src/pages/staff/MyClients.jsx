import { useEffect, useState } from "react";
import { projectsApi } from "../../services/projects";
import StatusBadge from "../../components/ui/StatusBadge";
import { formatDate } from "../../utils/format";

export default function MyClients() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    projectsApi
      .mine()
      .then((d) => setProjects(d.projects))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 className="text-xl font-semibold text-text-dark">My Clients</h1>
      <p className="mt-1 text-sm text-text-muted">
        Clients and projects assigned to you. Contact details and billing are managed by admin.
      </p>

      <div className="mt-4 space-y-3">
        {loading && <p className="text-sm text-text-muted">Loading…</p>}
        {!loading && projects.length === 0 && (
          <p className="rounded-2xl border border-dashed border-border-muted p-8 text-center text-sm text-text-muted">
            No clients assigned to you yet.
          </p>
        )}
        {projects.map((p) => (
          <div key={p.id} className="rounded-2xl border border-border-muted bg-paper p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <div className="font-medium text-text-dark">{p.client?.client_name}</div>
                {p.client?.company_name && (
                  <div className="text-xs text-text-muted">{p.client.company_name}</div>
                )}
              </div>
              <StatusBadge status={p.effective_status} />
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <div>
                <div className="text-xs text-text-muted">Project</div>
                <div className="text-text-dark">{p.project_name}</div>
              </div>
              <div>
                <div className="text-xs text-text-muted">Videos</div>
                <div className="text-text-dark">{p.number_of_videos}</div>
              </div>
              <div>
                <div className="text-xs text-text-muted">Start Date</div>
                <div className="text-text-dark">{formatDate(p.start_date)}</div>
              </div>
              <div>
                <div className="text-xs text-text-muted">Deadline</div>
                <div className="text-text-dark">{formatDate(p.submission_deadline)}</div>
              </div>
            </div>

            {p.notes && (
              <div className="mt-3 rounded-lg bg-paper-off p-3 text-xs text-text-muted">
                <span className="font-medium text-text-dark">Admin notes: </span>
                {p.notes}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
