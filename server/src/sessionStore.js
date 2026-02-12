// In-memory session store and helpers for EasyQR
// This module is intentionally stateless (no Express app) so it can be
// reused by both HTTP routes and the WebSocket server.

const SESSION_STATES = {
  CREATED: "CREATED",
  PENDING_DESKTOP: "PENDING_DESKTOP",
  WAITING_MOBILE: "WAITING_MOBILE",
  ACTIVE: "ACTIVE",
  TERMINATED: "TERMINATED",
  EXPIRED: "EXPIRED",
};

// Map<sessionId, Session>
// Session: {
//   id,
//   projectId,
//   state,
//   context,
//   webhookUrl,
//   createdAt,
//   expiresAt
// }
const sessions = new Map();

function createSession({
  sessionId,
  projectId,
  context = null,
  webhookUrl = null,
  ttlSeconds = 180,
}) {
  const now = Date.now();
  const session = {
    id: sessionId,
    projectId: projectId || null,
    state: SESSION_STATES.CREATED,
    context,
    webhookUrl,
    createdAt: now,
    expiresAt: now + ttlSeconds * 1000,
  };

  sessions.set(sessionId, session);
  return session;
}

function getSession(sessionId) {
  return sessions.get(sessionId) || null;
}

function updateSession(sessionId, patch) {
  const existing = sessions.get(sessionId);
  if (!existing) return null;
  const updated = { ...existing, ...patch };
  sessions.set(sessionId, updated);
  return updated;
}

function setSessionState(sessionId, state) {
  return updateSession(sessionId, { state });
}

function isSessionExpired(session) {
  if (!session) return true;
  return typeof session.expiresAt === "number" && Date.now() > session.expiresAt;
}

function terminateSession(sessionId, reason = "TERMINATED") {
  const existing = sessions.get(sessionId);
  if (!existing) return null;
  const nextState =
    reason === SESSION_STATES.EXPIRED
      ? SESSION_STATES.EXPIRED
      : SESSION_STATES.TERMINATED;
  return updateSession(sessionId, { state: nextState });
}

module.exports = {
  SESSION_STATES,
  createSession,
  getSession,
  updateSession,
  setSessionState,
  isSessionExpired,
  terminateSession,
  sessions,
};

