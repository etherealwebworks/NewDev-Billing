const STYLES = {
  draft: "border border-border-muted bg-paper text-text-muted",
  issued: "bg-paper-off text-text-dark border border-border-muted",
  paid: "bg-ink text-white",
  cancelled: "border border-border-muted bg-paper text-text-muted line-through",
};

const LABELS = { draft: "Draft", issued: "Issued", paid: "Paid", cancelled: "Cancelled" };

export default function InvoiceStatusBadge({ status }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
        STYLES[status] || STYLES.draft
      }`}
    >
      {LABELS[status] || status}
    </span>
  );
}
