/**
 * Two large, heavily blurred monochrome blobs that slowly drift — an Apple-
 * marketing-page style "smudge" accent. Grayscale only, on-brand with the
 * black/white/porcelain palette; never a rainbow gradient. Respects
 * prefers-reduced-motion via the animation-duration override in index.css
 * (the shapes just hold still instead of looping).
 *
 * Intended for the login/splash screens only — kept out of data-dense
 * admin screens where it would compete with tables and forms.
 */
export default function SmudgeBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <div
        className="absolute left-[-10%] top-[-10%] h-[60vmax] w-[60vmax] rounded-full opacity-[0.18]"
        style={{
          background: "radial-gradient(circle, var(--color-text-dark), transparent 70%)",
          filter: "blur(90px)",
          animation: "smudge-drift-a 26s ease-in-out infinite",
        }}
      />
      <div
        className="absolute bottom-[-15%] right-[-10%] h-[55vmax] w-[55vmax] rounded-full opacity-[0.14]"
        style={{
          background: "radial-gradient(circle, var(--color-text-muted), transparent 70%)",
          filter: "blur(100px)",
          animation: "smudge-drift-b 32s ease-in-out infinite",
        }}
      />
    </div>
  );
}
