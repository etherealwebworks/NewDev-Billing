import { useEffect, useState, useCallback } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { servicesApi } from "../../services/services";
import ServiceFormModal from "../../components/services/ServiceFormModal";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import { formatINR } from "../../utils/format";

export default function Services() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInactive, setShowInactive] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const data = await servicesApi.list(showInactive);
    setServices(data.services);
    setLoading(false);
  }, [showInactive]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleDelete() {
    const result = await servicesApi.remove(deleting.id);
    setDeleting(null);
    setNotice(result.message || "");
    load();
    if (result.message) setTimeout(() => setNotice(""), 4000);
  }

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text-dark">Services</h1>
          <p className="mt-1 text-sm text-text-muted">
            Reusable packages — pick one when adding a client project to prefill videos, posters, and price.
          </p>
        </div>
        <button
          onClick={() => setAddOpen(true)}
          className="flex items-center justify-center gap-2 rounded-lg bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-ink/90"
        >
          <Plus size={16} />
          Add Service
        </button>
      </div>

      <label className="mt-4 flex w-fit items-center gap-2 text-xs text-text-muted">
        <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
        Show inactive services
      </label>

      {notice && (
        <div className="mt-3 rounded-lg border border-border-muted bg-paper-off px-3 py-2 text-xs text-text-dark">
          {notice}
        </div>
      )}

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {loading && <p className="text-sm text-text-muted">Loading…</p>}
        {!loading && services.length === 0 && (
          <p className="col-span-full rounded-2xl border border-dashed border-border-muted p-8 text-center text-sm text-text-muted">
            No services yet — add your first package.
          </p>
        )}
        {!loading &&
          services.map((s) => (
            <div key={s.id} className="rounded-2xl border border-border-muted bg-paper p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-medium text-text-dark">{s.name}</div>
                  {!s.is_active && <span className="text-xs text-text-muted">(inactive)</span>}
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => setEditing(s)}
                    className="rounded-lg p-1.5 text-text-muted hover:bg-paper-off hover:text-text-dark"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => setDeleting(s)}
                    className="rounded-lg p-1.5 text-text-muted hover:bg-paper-off hover:text-text-dark"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              {s.description && <p className="mt-1 text-xs text-text-muted">{s.description}</p>}
              <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
                <div>
                  <div className="text-xs text-text-muted">Videos</div>
                  <div className="text-text-dark">{s.number_of_videos}</div>
                </div>
                <div>
                  <div className="text-xs text-text-muted">Posters</div>
                  <div className="text-text-dark">{s.number_of_posters}</div>
                </div>
                <div>
                  <div className="text-xs text-text-muted">Budget</div>
                  <div className="text-text-dark">{formatINR(s.budget)}</div>
                </div>
              </div>
            </div>
          ))}
      </div>

      <ServiceFormModal open={addOpen} onClose={() => setAddOpen(false)} onSaved={load} />
      <ServiceFormModal open={!!editing} onClose={() => setEditing(null)} onSaved={load} service={editing} />
      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        title="Delete Service"
        message={`Delete "${deleting?.name}"? If it's already been used on a project, it will be deactivated instead of deleted.`}
        confirmLabel="Delete"
        danger
      />
    </div>
  );
}
