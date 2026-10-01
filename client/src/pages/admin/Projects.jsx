import { useEffect, useState, useCallback } from "react";
import { Pencil, Archive, FileText, ChevronLeft, ChevronRight } from "lucide-react";
import { projectsApi } from "../../services/projects";
import { staffApi } from "../../services/staff";
import StatusBadge from "../../components/ui/StatusBadge";
import Avatar from "../../components/ui/Avatar";
import ProjectEditModal from "../../components/projects/ProjectEditModal";
import GenerateInvoiceModal from "../../components/invoices/GenerateInvoiceModal";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import { formatINR, formatDate } from "../../utils/format";

const PAGE_SIZE = 20;

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [staff, setStaff] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [staffFilter, setStaffFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [editing, setEditing] = useState(null);
  const [archiving, setArchiving] = useState(null);
  const [invoicing, setInvoicing] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await projectsApi.list({
        page,
        page_size: PAGE_SIZE,
        search: search || undefined,
        staff_id: staffFilter || undefined,
        status: statusFilter || undefined,
      });
      setProjects(data.projects);
      setTotal(data.pagination.total);
    } catch {
      setError("Could not load projects.");
    } finally {
      setLoading(false);
    }
  }, [page, search, staffFilter, statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    staffApi.list().then((d) => setStaff(d.staff.filter((s) => s.is_active)));
  }, []);

  async function handleArchive() {
    await projectsApi.archive(archiving.id);
    setArchiving(null);
    load();
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <h1 className="text-xl font-semibold text-text-dark">Projects</h1>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          value={search}
          onChange={(e) => {
            setPage(1);
            setSearch(e.target.value);
          }}
          placeholder="Search by project name…"
          className="flex-1 rounded-lg border border-border-muted bg-paper px-3 py-2 text-sm outline-none focus:border-ink"
        />
        <select
          value={staffFilter}
          onChange={(e) => {
            setPage(1);
            setStaffFilter(e.target.value);
          }}
          className="rounded-lg border border-border-muted bg-paper px-3 py-2 text-sm outline-none focus:border-ink"
        >
          <option value="">All Staff</option>
          {staff.map((s) => (
            <option key={s.id} value={s.id}>
              {s.full_name}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => {
            setPage(1);
            setStatusFilter(e.target.value);
          }}
          className="rounded-lg border border-border-muted bg-paper px-3 py-2 text-sm outline-none focus:border-ink"
        >
          <option value="">All Statuses</option>
          <option value="not_started">Not Started</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="overdue">Overdue</option>
        </select>
      </div>

      {loading && <p className="mt-4 text-sm text-text-muted">Loading…</p>}
      {!loading && projects.length === 0 && (
        <p className="mt-4 rounded-2xl border border-dashed border-border-muted p-8 text-center text-sm text-text-muted">
          No projects found.
        </p>
      )}

      {/* Mobile: cards */}
      {!loading && projects.length > 0 && (
        <div className="mt-4 space-y-3 sm:hidden">
          {projects.map((p) => (
            <div key={p.id} className="rounded-2xl border border-border-muted bg-paper p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-medium text-text-dark">{p.project_name}</div>
                  {p.project_type === "event" && p.event_name && (
                    <div className="text-xs text-text-muted">Event: {p.event_name}</div>
                  )}
                  <div className="text-xs text-text-muted">{p.client?.client_name}</div>
                </div>
                <StatusBadge status={p.effective_status} />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div>
                  <div className="text-xs text-text-muted">Staff</div>
                  <div className="flex items-center gap-1.5 text-text-dark">
                    {p.assigned_staff && <Avatar name={p.assigned_staff.full_name} src={p.assigned_staff.avatar_url} size="sm" />}
                    {p.assigned_staff?.full_name || "—"}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-text-muted">Videos</div>
                  <div className="text-text-dark">{p.number_of_videos}</div>
                </div>
                <div>
                  <div className="text-xs text-text-muted">Deadline</div>
                  <div className="text-text-dark">{formatDate(p.submission_deadline)}</div>
                </div>
                <div>
                  <div className="text-xs text-text-muted">Amount</div>
                  <div className="text-text-dark">{formatINR(p.project_amount)}</div>
                </div>
              </div>
              <div className="mt-3 flex justify-end gap-1 border-t border-border-muted pt-3">
                <button
                  onClick={() => setInvoicing(p)}
                  className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-text-muted hover:bg-paper-off hover:text-text-dark"
                >
                  <FileText size={14} />
                  Invoice
                </button>
                <button
                  onClick={() => setEditing(p)}
                  className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-text-muted hover:bg-paper-off hover:text-text-dark"
                >
                  <Pencil size={14} />
                  Edit
                </button>
                <button
                  onClick={() => setArchiving(p)}
                  className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-text-muted hover:bg-paper-off hover:text-text-dark"
                >
                  <Archive size={14} />
                  Archive
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Desktop/tablet: table */}
      <div className="mt-4 hidden overflow-x-auto rounded-2xl border border-border-muted bg-paper sm:block">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead>
            <tr className="border-b border-border-muted text-xs uppercase tracking-wide text-text-muted">
              <th className="px-4 py-3 font-medium">Project</th>
              <th className="px-4 py-3 font-medium">Client</th>
              <th className="px-4 py-3 font-medium">Staff</th>
              <th className="px-4 py-3 font-medium">Videos</th>
              <th className="px-4 py-3 font-medium">Deadline</th>
              <th className="px-4 py-3 font-medium">Amount</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((p) => (
              <tr key={p.id} className="border-b border-border-muted last:border-0 hover:bg-paper-off">
                <td className="px-4 py-3 font-medium text-text-dark">
                  {p.project_name}
                  {p.project_type === "event" && p.event_name && (
                    <div className="text-xs font-normal text-text-muted">Event: {p.event_name}</div>
                  )}
                </td>
                <td className="px-4 py-3 text-text-muted">{p.client?.client_name}</td>
                <td className="px-4 py-3 text-text-muted">
                  <div className="flex items-center gap-1.5">
                    {p.assigned_staff && <Avatar name={p.assigned_staff.full_name} src={p.assigned_staff.avatar_url} size="sm" />}
                    {p.assigned_staff?.full_name || "—"}
                  </div>
                </td>
                <td className="px-4 py-3 text-text-dark">{p.number_of_videos}</td>
                <td className="px-4 py-3 text-text-muted">{formatDate(p.submission_deadline)}</td>
                <td className="px-4 py-3 text-text-dark">{formatINR(p.project_amount)}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={p.effective_status} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <button
                      onClick={() => setInvoicing(p)}
                      className="rounded-lg p-1.5 text-text-muted hover:bg-paper-off hover:text-text-dark"
                      title="Generate Invoice"
                    >
                      <FileText size={15} />
                    </button>
                    <button
                      onClick={() => setEditing(p)}
                      className="rounded-lg p-1.5 text-text-muted hover:bg-paper-off hover:text-text-dark"
                      title="Edit"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={() => setArchiving(p)}
                      className="rounded-lg p-1.5 text-text-muted hover:bg-paper-off hover:text-text-dark"
                      title="Archive"
                    >
                      <Archive size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {error && <p className="mt-3 text-sm text-text-muted">{error}</p>}

      <div className="mt-4 flex items-center justify-between text-sm text-text-muted">
        <span>
          Page {page} of {totalPages} · {total} projects
        </span>
        <div className="flex gap-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="rounded-lg border border-border-muted p-1.5 disabled:opacity-40"
          >
            <ChevronLeft size={15} />
          </button>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-lg border border-border-muted p-1.5 disabled:opacity-40"
          >
            <ChevronRight size={15} />
          </button>
        </div>
      </div>

      <ProjectEditModal
        open={!!editing}
        onClose={() => setEditing(null)}
        onSaved={load}
        project={editing}
        staffOptions={staff}
      />
      <GenerateInvoiceModal open={!!invoicing} onClose={() => setInvoicing(null)} project={invoicing} />
      <ConfirmDialog
        open={!!archiving}
        onClose={() => setArchiving(null)}
        onConfirm={handleArchive}
        title="Archive Project"
        message={`Archive "${archiving?.project_name}"? It will be hidden from active lists but its history stays intact.`}
        confirmLabel="Archive"
        danger
      />
    </div>
  );
}
