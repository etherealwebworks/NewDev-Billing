export default function ComingSoon({ title, phase }) {
  return (
    <div className="flex h-[60vh] flex-col items-center justify-center rounded-2xl border border-dashed border-border-muted text-center">
      <h2 className="text-sm font-semibold text-text-dark">{title}</h2>
      <p className="mt-1 text-sm text-text-muted">This section is being built in {phase}.</p>
    </div>
  );
}
