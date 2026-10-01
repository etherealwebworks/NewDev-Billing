const STYLES = {
  unpaid: "border border-border-muted bg-paper text-text-muted",
  partially_paid: "bg-paper-off text-text-dark border border-border-muted",
  paid: "bg-ink text-white",
  overdue: "bg-ink text-white",
};

const LABELS = {
  unpaid: "Unpaid",
  partially_paid: "Partially Paid",
  paid: "Paid",
  overdue: "Overdue",
};

export default function PaymentStatusBadge({ status }) {
  if (!status) return null;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
        STYLES[status] || STYLES.unpaid
      }`}
    >
      {LABELS[status] || status}
    </span>
  );
}
