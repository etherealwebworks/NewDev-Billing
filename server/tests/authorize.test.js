import { test } from "node:test";
import assert from "node:assert/strict";
import { requireRole, requireOwnershipOrAdmin } from "../src/middleware/authorize.js";

function mockRes() {
  const res = { statusCode: null, body: null };
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (body) => {
    res.body = body;
    return res;
  };
  return res;
}

test("requireRole('admin') blocks a staff user with 403", () => {
  const req = { user: { id: "u1", role: "staff" } };
  const res = mockRes();
  let nextCalled = false;
  requireRole("admin")(req, res, () => (nextCalled = true));
  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 403);
});

test("requireRole('admin') allows an admin user through", () => {
  const req = { user: { id: "u1", role: "admin" } };
  const res = mockRes();
  let nextCalled = false;
  requireRole("admin")(req, res, () => (nextCalled = true));
  assert.equal(nextCalled, true);
  assert.equal(res.statusCode, null);
});

test("requireRole with no authenticated user returns 401, not a crash", () => {
  const req = {};
  const res = mockRes();
  let nextCalled = false;
  requireRole("admin")(req, res, () => (nextCalled = true));
  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 401);
});

test("requireRole('staff', 'admin') allows either role", () => {
  const res1 = mockRes();
  let called1 = false;
  requireRole("staff", "admin")({ user: { role: "staff" } }, res1, () => (called1 = true));
  assert.equal(called1, true);

  const res2 = mockRes();
  let called2 = false;
  requireRole("staff", "admin")({ user: { role: "admin" } }, res2, () => (called2 = true));
  assert.equal(called2, true);
});

test("requireOwnershipOrAdmin lets a staff user touch their own resource", () => {
  const req = { user: { id: "staff-1", role: "staff" } };
  const res = mockRes();
  let nextCalled = false;
  requireOwnershipOrAdmin((r) => "staff-1")(req, res, () => (nextCalled = true));
  assert.equal(nextCalled, true);
});

test("requireOwnershipOrAdmin blocks a staff user from someone else's resource", () => {
  const req = { user: { id: "staff-1", role: "staff" } };
  const res = mockRes();
  let nextCalled = false;
  requireOwnershipOrAdmin((r) => "staff-2")(req, res, () => (nextCalled = true));
  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 403);
});

test("requireOwnershipOrAdmin always lets an admin through, regardless of owner", () => {
  const req = { user: { id: "admin-1", role: "admin" } };
  const res = mockRes();
  let nextCalled = false;
  requireOwnershipOrAdmin((r) => "someone-else")(req, res, () => (nextCalled = true));
  assert.equal(nextCalled, true);
});
