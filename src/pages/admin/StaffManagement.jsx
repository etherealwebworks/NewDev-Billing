import { useEffect, useState, useCallback } from "react";
import { Plus, Pencil, Power, Trash2 } from "lucide-react";
import { staffApi } from "../../services/staff";
import Avatar from "../../components/ui/Avatar";
import StaffFormModal from "../../components/staff/StaffFormModal";
import StaffEditModal from "../../components/staff/StaffEditModal";
import ConfirmDialog from "../../components/ui/ConfirmDialog";

export default function StaffManagement() {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [togglingStatus, setTogglingStatus] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [deleteError, setDeleteError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await staffApi.list();
      setStaff(data.staff);
    } catch {
      setError("Could not load staff.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleToggleStatus() {
    await staffApi.setStatus(togglingStatus.id, !togglingStatus.is_active);
    setTogglingStatus(null);
    load();
  }

  async function handleDelete() {
    setDeleteError("");
    try {
      await staffApi.deletePermanently(deleting.id);
      setDeleting(null);
      load();
    } catch (err) {
      setDeleteError(err.response?.data?.error || "Could not delete this staff account.");
    }
  }

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-semibold text-text-dark">Staff Management</h1>
        <button
          onClick={() => setAddOpen(true)}
          className="flex items-center justify-center gap-2 rounded-lg bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-ink/90"
        >
          <Plus size={16} />
          Add Staff
        </button>
      </div>

      <div className="mt-4 overflow-x-auto rounded-2xl border border-border-muted bg-paper">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead>
            <tr className="border-b border-border-muted text-xs uppercase tracking-wide text-text-muted">
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Contact</th>
              <th className="px-4 py-3 font-medium">Clients</th>
              <th className="px-4 py-3 font-medium">Active</th>
              <th className="px-4 py-3 font-medium">Completed</th>
              <th className="px-4 py-3 font-medium">Pending</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-text-muted">
                  Loading…
                </td>
              </tr>
            )}
            {!loading && staff.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-text-muted">
                  No staff accounts yet.
                </td>
              </tr>
            )}
            {!loading &&
              staff.map((s) => (
                <tr key={s.id} className="border-b border-border-muted last:border-0 hover:bg-paper-off">
                  <td className="px-4 py-3 font-medium text-text-dark">
                    <div className="flex items-center gap-2">
                      <Avatar name={s.full_name} src={s.avatar_url} />
                      {s.full_name}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-text-muted">
                    <div>{s.email}</div>
                    {s.phone && <div className="text-xs">{s.phone}</div>}
                  </td>
                  <td className="px-4 py-3 text-text-dark">{s.assigned_clients}</td>
                  <td className="px-4 py-3 text-text-dark">{s.active_projects}</td>
                  <td className="px-4 py-3 text-text-dark">{s.completed_projects}</td>
                  <td className="px-4 py-3 text-text-dark">{s.pending_projects}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                        s.is_active ? "border border-border-muted bg-paper text-text-dark" : "bg-ink text-white"
                      }`}
                    >
                      {s.is_active ? "Active" : "Deactivated"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => setEditing(s)}
                        className="rounded-lg p-1.5 text-text-muted hover:bg-paper-off hover:text-text-dark"
                        title="Edit"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => setTogglingStatus(s)}
                        className="rounded-lg p-1.5 text-text-muted hover:bg-paper-off hover:text-text-dark"
                        title={s.is_active ? "Deactivate" : "Activate"}
                      >
                        <Power size={15} />
                      </button>
                      <button
                        onClick={() => {
                          setDeleteError("");
                          setDeleting(s);
                        }}
                        className="rounded-lg p-1.5 text-text-muted hover:bg-paper-off hover:text-text-dark"
                        title="Delete"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {error && <p className="mt-3 text-sm text-text-muted">{error}</p>}

      <StaffFormModal open={addOpen} onClose={() => setAddOpen(false)} onCreated={load} />
      <StaffEditModal open={!!editing} onClose={() => setEditing(null)} onSaved={load} staff={editing} />
      <ConfirmDialog
        open={!!togglingStatus}
        onClose={() => setTogglingStatus(null)}
        onConfirm={handleToggleStatus}
        title={togglingStatus?.is_active ? "Deactivate Staff" : "Activate Staff"}
        message={
          togglingStatus?.is_active
            ? `${togglingStatus?.full_name} will immediately lose access. Their existing projects stay assigned to them until you reassign.`
            : `${togglingStatus?.full_name} will regain access immediately.`
        }
        confirmLabel={togglingStatus?.is_active ? "Deactivate" : "Activate"}
        danger={togglingStatus?.is_active}
      />
      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        title="Delete Staff Account"
        message={
          deleteError ||
          `Permanently delete ${deleting?.full_name}'s account? This can't be undone. Only allowed when they have no project history — otherwise, use Deactivate instead.`
        }
        confirmLabel="Delete"
        danger
      />
    </div>
  );
}
