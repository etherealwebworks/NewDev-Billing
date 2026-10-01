/**
 * Adds `days` to an ISO date string (YYYY-MM-DD) and returns an ISO date
 * string. Pure date math, no time-of-day/timezone drift.
 */
export function addDays(isoDate, days) {
  const [y, m, d] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + Number(days));
  return date.toISOString().slice(0, 10);
}
