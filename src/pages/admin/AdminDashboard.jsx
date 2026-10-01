import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { projectsApi } from "../../services/projects";
import { paymentsApi } from "../../services/payments";
import { formatDate, formatINR } from "../../utils/format";

const PROJECT_CARDS = [
  { key: "total_clients", label: "Total Clients" },
  { key: "total_projects", label: "Total Projects" },
  { key: "in_progress", label: "Projects In Progress" },
  { key: "completed", label: "Completed Projects" },
  { key: "not_started", label: "Pending Submissions" },
  { key: "overdue", label: "Overdue Projects" },
];

const FINANCIAL_CARDS = [
  { key: "total_revenue", label: "Total Revenue" },
  { key: "total_received", label: "Total Amount Received" },
  { key: "total_outstanding", label: "Outstanding Payments" },
  { key: "overdue_payments_amount", label: "Overdue Payments" },
];

export default function AdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [financial, setFinancial] = useState(null);
  const [upcoming, setUpcoming] = useState([]);

  useEffect(() => {
    projectsApi.stats().then((d) => {
      setStats(d.stats);
      setUpcoming(d.upcoming_deadlines);
    });
    paymentsApi.stats().then((d) => setFinancial(d.stats));
  }, []);

  return (
    <div>
      <h1 className="text-xl font-semibold text-text-dark">Dashboard</h1>
      <p className="mt-1 text-sm text-text-muted">Welcome back, {user?.full_name}.</p>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {PROJECT_CARDS.map((c) => (
          <div key={c.key} className="rounded-2xl border border-border-muted bg-paper p-4">
            <div className="text-2xl font-semibold text-text-dark">{stats ? stats[c.key] : "—"}</div>
            <div className="mt-1 text-xs text-text-muted">{c.label}</div>
          </div>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {FINANCIAL_CARDS.map((c) => (
          <div key={c.key} className="rounded-2xl border border-border-muted bg-paper p-4">
            <div className="text-xl font-semibold text-text-dark">
              {financial ? formatINR(financial[c.key]) : "—"}
            </div>
            <div className="mt-1 text-xs text-text-muted">{c.label}</div>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-2xl border border-border-muted bg-paper p-4">
        <h2 className="text-sm font-semibold text-text-dark">Upcoming Deadlines (next 7 days)</h2>
        {upcoming.length === 0 ? (
          <p className="mt-2 text-sm text-text-muted">Nothing due in the next week.</p>
        ) : (
          <ul className="mt-3 divide-y divide-border-muted">
            {upcoming.map((u, i) => (
              <li key={i} className="flex items-center justify-between py-2 text-sm">
                <span className="text-text-dark">{u.client_name}</span>
                <span className="text-text-muted">{formatDate(u.deadline)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
