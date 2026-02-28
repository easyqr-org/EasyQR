const test = require("node:test");
const assert = require("node:assert/strict");

const {
  createSession,
  getSession,
  isSessionExpired,
  terminateSession,
  SESSION_STATES,
  sessions,
} = require("../src/sessionStore");

test.beforeEach(() => {
  sessions.clear();
});

test("creates a session with expiry and default state", () => {
  const created = createSession({
    sessionId: "s1",
    projectId: "p1",
    ttlSeconds: 60,
  });

  assert.equal(created.id, "s1");
  assert.equal(created.projectId, "p1");
  assert.equal(created.state, SESSION_STATES.CREATED);
  assert.equal(isSessionExpired(created), false);
});

test("detects expired session by expiresAt", () => {
  createSession({
    sessionId: "s2",
    projectId: "p1",
    ttlSeconds: -1,
  });
  const session = getSession("s2");
  assert.equal(isSessionExpired(session), true);
});

test("terminateSession sets EXPIRED when reason is expired", () => {
  createSession({
    sessionId: "s3",
    projectId: "p1",
    ttlSeconds: 60,
  });

  const ended = terminateSession("s3", SESSION_STATES.EXPIRED);
  assert.equal(ended.state, SESSION_STATES.EXPIRED);
});
