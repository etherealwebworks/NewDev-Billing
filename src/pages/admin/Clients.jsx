import { useEffect, useState, useCallback } from "react";
import { Plus, Search, Pencil, Archive, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { clientsApi } from "../../services/clients";
import { staffApi } from "../../services/staff";
import StatusBadge from "../../components/ui/StatusBadge";
import Avatar from "../../components/ui/Avatar";
import ClientFormModal from "../../components/clients/ClientFormModal";
import ClientEditModal from "../../components/clients/ClientEditModal";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import { formatINR, formatDate } from "../../utils/format";

const PAGE_SIZE = 20;

function effectiveStatus(project) {
  if (!project) return null;
  if (project.work_status !== "completed" && project.submission_deadline < new Date().toISOString().slice(0, 10)) {
    return "overdue";
  }
  return project.work_status;
}

export default function Clients() {
  const [clients, setClients] = useState([]);
  const [staff, setStaff] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [staffFilter, setStaffFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [archiving, setArchiving] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [deleteError, setDeleteError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await clientsApi.list({
        page,
        page_size: PAGE_SIZE,
        search: search || undefined,
        staff_id: staffFilter || undefined,
        status: statusFilter || undefined,
      });
      setClients(data.clients);
      setTotal(data.pagination.total);
    } catch {
      setError("Could not load clients.");
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
    await clientsApi.archive(archiving.id);
    setArchiving(null);
    load();
  }

  async function handleDelete() {
    setDeleteError("");
    try {
      await clientsApi.deletePermanently(deleting.id);
      setDeleting(null);
      load();
    } catch (err) {
      setDeleteError(err.response?.data?.error || "Could not delete this client.");
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-semibold text-text-dark">Clients</h1>
        <button
          onClick={() => setAddOpen(true)}
          className="flex items-center justify-center gap-2 rounded-lg bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-ink/90"
        >
          <Plus size={16} />
          Add Client
        </button>
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            value={search}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
            placeholder="Search clients…"
            className="w-full rounded-lg border border-border-muted bg-paper py-2 pl-9 pr-3 text-sm outline-none focus:border-ink"
          />
        </div>
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
      {!loading && clients.length === 0 && (
        <p className="mt-4 rounded-2xl border border-dashed border-border-muted p-8 text-center text-sm text-text-muted">
          No clients found.
        </p>
      )}

      {/* Mobile: cards */}
      {!loading && clients.length > 0 && (
        <div className="mt-4 space-y-3 sm:hidden">
          {clients.map((c) => {
            const project = c.projects?.[0];
            return (
              <div key={c.id} className="rounded-2xl border border-border-muted bg-paper p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-medium text-text-dark">{c.client_name}</div>
                    {c.company_name && <div className="text-xs text-text-muted">{c.company_name}</div>}
                  </div>
                  {project && <StatusBadge status={effectiveStatus(project)} />}
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <div className="text-xs text-text-muted">Staff</div>
                    <div className="mt-0.5 flex items-center gap-1.5 text-text-dark">
                      {project?.assigned_staff && (
                        <Avatar name={project.assigned_staff.full_name} src={project.assigned_staff.avatar_url} size="sm" />
                      )}
                      {project?.assigned_staff?.full_name || "—"}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-text-muted">Deadline</div>
                    <div className="text-text-dark">{project ? formatDate(project.submission_deadline) : "—"}</div>
                  </div>
                  <div>
                    <div className="text-xs text-text-muted">Total</div>
                    <div className="text-text-dark">{formatINR(c.billing?.total)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-text-muted">Outstanding</div>
                    <div className="text-text-dark">{formatINR(c.billing?.outstanding)}</div>
                  </div>
                </div>
                <div className="mt-3 flex justify-end gap-1 border-t border-border-muted pt-3">
                  <button
                    onClick={() => setEditing(c)}
                    className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-text-muted hover:bg-paper-off hover:text-text-dark"
                  >
                    <Pencil size={14} />
                    Edit
                  </button>
                  <button
                    onClick={() => setArchiving(c)}
                    className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-text-muted hover:bg-paper-off hover:text-text-dark"
                  >
                    <Archive size={14} />
                    Archive
                  </button>
                  <button
                    onClick={() => {
                      setDeleteError("");
                      setDeleting(c);
                    }}
                    className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-text-muted hover:bg-paper-off hover:text-text-dark"
                  >
                    <Trash2 size={14} />
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Desktop/tablet: table */}
      <div className="mt-4 hidden overflow-x-auto rounded-2xl border border-border-muted bg-paper sm:block">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead>
            <tr className="border-b border-border-muted text-xs uppercase tracking-wide text-text-muted">
              <th className="px-4 py-3 font-medium">Client</th>
              <th className="px-4 py-3 font-medium">Assigned Staff</th>
              <th className="px-4 py-3 font-medium">Deadline</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Total</th>
              <th className="px-4 py-3 font-medium">Outstanding</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((c) => {
              const project = c.projects?.[0];
              return (
                <tr key={c.id} className="border-b border-border-muted last:border-0 hover:bg-paper-off">
                  <td className="px-4 py-3">
                    <div className="font-medium text-text-dark">{c.client_name}</div>
                    {c.company_name && <div className="text-xs text-text-muted">{c.company_name}</div>}
                  </td>
                  <td className="px-4 py-3 text-text-muted">
                    <div className="flex items-center gap-1.5">
                      {project?.assigned_staff && (
                        <Avatar name={project.assigned_staff.full_name} src={project.assigned_staff.avatar_url} size="sm" />
                      )}
                      {project?.assigned_staff?.full_name || "—"}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-text-muted">
                    {project ? formatDate(project.submission_deadline) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {project ? <StatusBadge status={effectiveStatus(project)} /> : "—"}
                  </td>
                  <td className="px-4 py-3 text-text-dark">{formatINR(c.billing?.total)}</td>
                  <td className="px-4 py-3 text-text-dark">{formatINR(c.billing?.outstanding)}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => setEditing(c)}
                        className="rounded-lg p-1.5 text-text-muted hover:bg-paper-off hover:text-text-dark"
                        title="Edit"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => setArchiving(c)}
                        className="rounded-lg p-1.5 text-text-muted hover:bg-paper-off hover:text-text-dark"
                        title="Archive"
                      >
                        <Archive size={15} />
                      </button>
                      <button
                        onClick={() => {
                          setDeleteError("");
                          setDeleting(c);
                        }}
                        className="rounded-lg p-1.5 text-text-muted hover:bg-paper-off hover:text-text-dark"
                        title="Delete"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {error && <p className="mt-3 text-sm text-text-muted">{error}</p>}

      <div className="mt-4 flex items-center justify-between text-sm text-text-muted">
        <span>
          Page {page} of {totalPages} · {total} clients
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

      <ClientFormModal open={addOpen} onClose={() => setAddOpen(false)} onCreated={load} staffOptions={staff} />
      <ClientEditModal open={!!editing} onClose={() => setEditing(null)} onSaved={load} client={editing} />
      <ConfirmDialog
        open={!!archiving}
        onClose={() => setArchiving(null)}
        onConfirm={handleArchive}
        title="Archive Client"
        message={`Archive ${archiving?.client_name}? Their projects and invoices remain, but they'll be hidden from the active clients list.`}
        confirmLabel="Archive"
        danger
      />
      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        title="Delete Client"
        message={
          deleteError ||
          `Permanently delete ${deleting?.client_name}? This can't be undone. Only allowed when the client has no billing history — otherwise, use Archive instead.`
        }
        confirmLabel="Delete"
        danger
      />
    </div>
  );
}
