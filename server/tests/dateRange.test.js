import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveDateRange } from "../src/utils/dateRange.js";

test("'today' range starts and ends on the same date", () => {
  const { start, end } = resolveDateRange({ range: "today" });
  assert.equal(start, end);
});

test("'week' range spans exactly 7 days (inclusive)", () => {
  const { start, end } = resolveDateRange({ range: "week" });
  const days = (new Date(end) - new Date(start)) / 86400000;
  assert.equal(days, 6);
});

test("'year' range starts on Jan 1 of the current year", () => {
  const { start } = resolveDateRange({ range: "year" });
  assert.equal(start.slice(5), "01-01");
});

test("'month' range starts on the 1st of the current month", () => {
  const { start } = resolveDateRange({ range: "month" });
  assert.equal(start.slice(8), "01");
});

test("'custom' range passes through explicit start/end untouched", () => {
  const { start, end } = resolveDateRange({ range: "custom", start: "2026-03-01", end: "2026-03-15" });
  assert.equal(start, "2026-03-01");
  assert.equal(end, "2026-03-15");
});

test("'custom' without start/end falls back to the month default rather than crashing", () => {
  const { start, end } = resolveDateRange({ range: "custom" });
  assert.ok(start && end);
});
