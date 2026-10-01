import { test } from "node:test";
import assert from "node:assert/strict";
import { addDays } from "../src/utils/dates.js";

test("adds days across a month boundary", () => {
  assert.equal(addDays("2026-01-28", 7), "2026-02-04");
});

test("adds days across a year boundary", () => {
  assert.equal(addDays("2026-12-27", 10), "2027-01-06");
});

test("handles a 1-day allowance", () => {
  assert.equal(addDays("2026-06-15", 1), "2026-06-16");
});

test("handles leap-year February correctly", () => {
  assert.equal(addDays("2028-02-27", 2), "2028-02-29"); // 2028 is a leap year
});

test("matches the spec's worked example (23 Sep 2026 + 7 days)", () => {
  assert.equal(addDays("2026-09-23", 7), "2026-09-30");
});
