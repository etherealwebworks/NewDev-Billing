/**
 * Resolves a named range (today/week/month/year) or an explicit
 * start/end pair into concrete ISO dates, inclusive on both ends.
 */
export function resolveDateRange({ range, start, end }) {
  const now = new Date();
  const todayIso = now.toISOString().slice(0, 10);

  if (range === "custom" && start && end) {
    return { start, end };
  }

  switch (range) {
    case "today":
      return { start: todayIso, end: todayIso };
    case "week": {
      const d = new Date(now);
      d.setUTCDate(d.getUTCDate() - 6);
      return { start: d.toISOString().slice(0, 10), end: todayIso };
    }
    case "year": {
      const d = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
      return { start: d.toISOString().slice(0, 10), end: todayIso };
    }
    case "month":
    default: {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
      return { start: d.toISOString().slice(0, 10), end: todayIso };
    }
  }
}
