const test = require("node:test");
const assert = require("node:assert/strict");

const { saveScan, getAllScans, getLastScan, clearScans } = require("../src/scanStore");

const sessionId = "session-1";

function buildPayload(overrides = {}) {
  return {
    sessionId,
    value: "0123456789",
    format: "EAN_13",
    timestamp: new Date().toISOString(),
    ...overrides,
  };
}

test.beforeEach(() => {
  clearScans();
});

test("accepts a valid scan payload", () => {
  const accepted = saveScan(sessionId, buildPayload());
  assert.equal(accepted, true);
  assert.equal(getAllScans(sessionId).length, 1);
});

test("rejects duplicate scan payloads for same session", () => {
  const payload = buildPayload();
  assert.equal(saveScan(sessionId, payload), true);
  assert.equal(saveScan(sessionId, payload), false);
  assert.equal(getAllScans(sessionId).length, 1);
});

test("accepts the same scan again after the duplicate window passes", () => {
  const first = buildPayload({ timestamp: new Date("2026-03-16T10:00:00.000Z").toISOString() });
  const second = buildPayload({
    timestamp: new Date("2026-03-16T10:00:03.000Z").toISOString(),
  });

  assert.equal(saveScan(sessionId, first), true);
  assert.equal(saveScan(sessionId, second), true);
  assert.equal(getAllScans(sessionId).length, 2);
});

test("rejects scan payload when sessionId mismatches socket session", () => {
  const accepted = saveScan(sessionId, buildPayload({ sessionId: "other-session" }));
  assert.equal(accepted, false);
  assert.equal(getAllScans(sessionId).length, 0);
});

test("rejects invalid scan payload shape", () => {
  const accepted = saveScan(sessionId, { value: "abc" });
  assert.equal(accepted, false);
  assert.equal(getLastScan(sessionId), null);
});
