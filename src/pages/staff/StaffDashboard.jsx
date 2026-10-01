import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { projectsApi } from "../../services/projects";
import { formatDate } from "../../utils/format";

export default function StaffDashboard() {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    projectsApi
      .mine()
      .then((d) => setProjects(d.projects))
      .finally(() => setLoading(false));
  }, []);

  const counts = {
    clients: new Set(projects.map((p) => p.client?.id)).size,
    total: projects.length,
    in_progress: projects.filter((p) => p.work_status === "in_progress").length,
    completed: projects.filter((p) => p.work_status === "completed").length,
    not_started: projects.filter((p) => p.work_status === "not_started").length,
  };

  const upcoming = projects
    .filter((p) => p.effective_status !== "completed")
    .sort((a, b) => a.submission_deadline.localeCompare(b.submission_deadline))
    .slice(0, 5);

  const CARDS = [
    { label: "My Assigned Clients", value: counts.clients },
    { label: "Total Assigned Projects", value: counts.total },
    { label: "In Progress", value: counts.in_progress },
    { label: "Completed", value: counts.completed },
    { label: "Pending", value: counts.not_started },
  ];

  return (
    <div>
      <h1 className="text-xl font-semibold text-text-dark">Dashboard</h1>
      <p className="mt-1 text-sm text-text-muted">Welcome back, {user?.full_name}.</p>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {CARDS.map((c) => (
          <div key={c.label} className="rounded-2xl border border-border-muted bg-paper p-4">
            <div className="text-2xl font-semibold text-text-dark">{loading ? "—" : c.value}</div>
            <div className="mt-1 text-xs text-text-muted">{c.label}</div>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-2xl border border-border-muted bg-paper p-4">
        <h2 className="text-sm font-semibold text-text-dark">Upcoming Deadlines</h2>
        {!loading && upcoming.length === 0 && (
          <p className="mt-2 text-sm text-text-muted">Nothing upcoming.</p>
        )}
        <ul className="mt-3 divide-y divide-border-muted">
          {upcoming.map((p) => (
            <li key={p.id} className="flex items-center justify-between py-2 text-sm">
              <span className="text-text-dark">
                {p.client?.client_name} — {p.project_name}
              </span>
              <span className="text-text-muted">{formatDate(p.submission_deadline)}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
