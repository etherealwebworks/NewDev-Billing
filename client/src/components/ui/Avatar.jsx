function initials(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase();
}

const SIZES = { sm: "h-6 w-6 text-[10px]", md: "h-8 w-8 text-xs", lg: "h-14 w-14 text-base" };

export default function Avatar({ name, src, size = "md" }) {
  const sizeClass = SIZES[size] || SIZES.md;

  if (src) {
    return (
      <img
        src={src}
        alt={name || "Avatar"}
        className={`${sizeClass} shrink-0 rounded-full object-cover border border-border-muted`}
      />
    );
  }

  return (
    <span
      className={`${sizeClass} flex shrink-0 items-center justify-center rounded-full bg-paper-off text-text-muted font-medium border border-border-muted`}
    >
      {initials(name)}
    </span>
  );
}
