const STYLES = {
  not_started: "border border-border-muted bg-paper text-text-muted",
  in_progress: "bg-paper-off text-text-dark border border-border-muted",
  completed: "bg-ink text-white",
  overdue: "bg-ink text-white",
};

const LABELS = {
  not_started: "Not Started",
  in_progress: "In Progress",
  completed: "Completed",
  overdue: "Overdue",
};

export default function StatusBadge({ status }) {
  const style = STYLES[status] || STYLES.not_started;
  const label = status === "overdue" ? "Overdue" : LABELS[status] || status;
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${style}`}>
      {label}
    </span>
  );
}
