import Modal from "./Modal";

export default function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel = "Confirm", danger }) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <p className="text-sm text-text-muted">{message}</p>
      <div className="mt-6 flex justify-end gap-2">
        <button
          onClick={onClose}
          className="rounded-lg border border-border-muted px-4 py-2 text-sm text-text-dark hover:bg-paper-off"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className={`rounded-lg px-4 py-2 text-sm font-medium text-white ${
            danger ? "bg-ink hover:bg-ink/90" : "bg-ink hover:bg-ink/90"
          }`}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
