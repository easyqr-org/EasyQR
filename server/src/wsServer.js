const WebSocket = require("ws");
const jwt = require("jsonwebtoken");
const { saveScan, getLastScan } = require("./scanStore");
const {
  getSession,
  setSessionState,
  isSessionExpired,
  terminateSession,
  SESSION_STATES,
} = require("./sessionStore");

// In-memory routing of sockets per session and role
// Map<sessionId, { desktop: Set<WebSocket>, mobile: Set<WebSocket>, host: Set<WebSocket> }>
const wsSessions = new Map();

function getOrCreateWsSession(sessionId) {
  if (!wsSessions.has(sessionId)) {
    wsSessions.set(sessionId, {
      desktop: new Set(),
      mobile: new Set(),
      host: new Set(),
    });
  }
  return wsSessions.get(sessionId);
}

function removeSocketFromSession(sessionId, ws) {
  const entry = wsSessions.get(sessionId);
  if (!entry) return;
  entry.desktop.delete(ws);
  entry.mobile.delete(ws);
  entry.host.delete(ws);
  if (
    entry.desktop.size === 0 &&
    entry.mobile.size === 0 &&
    entry.host.size === 0
  ) {
    wsSessions.delete(sessionId);
  }
}

function broadcast(sessionId, roles, message) {
  const entry = wsSessions.get(sessionId);
  if (!entry) return;

  const payload = JSON.stringify(message);

  const roleSets = Array.isArray(roles) ? roles : [roles];

  roleSets.forEach((role) => {
    const set = entry[role];
    if (!set) return;
    for (const socket of set) {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(payload);
      }
    }
  });
}

function sendSessionState(sessionId) {
  const session = getSession(sessionId);
  if (!session) return;

  const entry = wsSessions.get(sessionId) || { desktop: new Set(), mobile: new Set(), host: new Set() };

  const message = {
    type: "SESSION_STATE",
    sessionId,
    state: session.state,
    mobileConnected: entry.mobile.size > 0,
    desktopConnected: entry.desktop.size > 0,
  };

  broadcast(sessionId, ["desktop", "host"], message);
}

function startWebSocketServer(server, { jwtSecret, sessionTtlSeconds, allowedWsOrigins = [] }) {
  const wss = new WebSocket.Server({ server, path: "/ws" });

  wss.on("connection", (ws, req) => {
    const origin = req.headers.origin;
    if (allowedWsOrigins.length && origin && !allowedWsOrigins.includes(origin)) {
      ws.close(4000, "Origin not allowed");
      return;
    }

    const url = new URL(req.url, "http://localhost");
    const token = url.searchParams.get("token");
    const role = (url.searchParams.get("role") || "HOST").toUpperCase();
    const claimedSessionId = url.searchParams.get("sessionId");

    if (!token) {
      ws.close(4001, "Missing token");
      return;
    }

    let decoded;
    try {
      decoded = jwt.verify(token, jwtSecret);
    } catch (err) {
      ws.close(4002, "Invalid or expired token");
      return;
    }

    const sessionId = decoded.sid || decoded.sessionId;
    const projectId = decoded.pid || decoded.projectId;

    if (!sessionId) {
      ws.close(4003, "Token missing session id");
      return;
    }

    if (claimedSessionId && claimedSessionId !== sessionId) {
      ws.close(4004, "Session mismatch");
      return;
    }

    const session = getSession(sessionId);
    if (!session) {
      ws.close(4005, "Unknown session");
      return;
    }

    if (isSessionExpired(session)) {
      terminateSession(sessionId, SESSION_STATES.EXPIRED);
      ws.close(4006, "Session expired");
      return;
    }

    if (session.projectId && projectId && session.projectId !== projectId) {
      ws.close(4007, "Project mismatch");
      return;
    }

    const entry = getOrCreateWsSession(sessionId);

    ws.sessionId = sessionId;
    ws.role = role;

    if (role === "DESKTOP") {
      entry.desktop.add(ws);
      setSessionState(sessionId, SESSION_STATES.WAITING_MOBILE);

      // Hydrate with last scan for this session if present
      const last = getLastScan(sessionId);
      if (last) {
        ws.send(
          JSON.stringify({
            type: "SCAN",
            payload: last,
          })
        );
      }
    } else if (role === "MOBILE") {
      entry.mobile.add(ws);
      setSessionState(sessionId, SESSION_STATES.ACTIVE);
      sendSessionState(sessionId);
    } else {
      // HOST (IMS frontend) or other roles
      entry.host.add(ws);
    }

    sendSessionState(sessionId);

    ws.on("message", (msg) => {
      let data;
      try {
        data = JSON.parse(msg);
      } catch {
        ws.send(JSON.stringify({ type: "ERROR", message: "Invalid JSON" }));
        return;
      }

      // Backwards compatible: allow explicit join messages, but
      // session & role are already determined from token/query.
      if (data.type === "DESKTOP_JOIN") {
        // No-op; state already set on connection. Keep to avoid breaking UIs.
        return;
      }

      if (data.type === "MOBILE_JOIN") {
        // No-op; state already set on connection. Keep to avoid breaking UIs.
        return;
      }

      if (data.type === "SCAN") {
        const sessionIdForSocket = ws.sessionId;

        if (!sessionIdForSocket) {
          ws.send(
            JSON.stringify({
              type: "ERROR",
              message: "Socket not associated with a session",
            })
          );
          return;
        }

        const accepted = saveScan(sessionIdForSocket, data.payload);

        if (!accepted) {
          ws.send(
            JSON.stringify({
              type: "ERROR",
              message: "Duplicate or invalid scan",
            })
          );
          return;
        }

        broadcast(sessionIdForSocket, ["desktop", "host"], {
          type: "SCAN",
          payload: data.payload,
        });
      }
    });

    ws.on("close", () => {
      if (!ws.sessionId) return;
      removeSocketFromSession(ws.sessionId, ws);
      sendSessionState(ws.sessionId);
    });
  });
}

module.exports = { startWebSocketServer };

