const WebSocket = require("ws");
const jwt = require("jsonwebtoken");
const { randomUUID } = require("crypto");
const { SESSION_STATES } = require("./data/sessionStates");
const { incWsConnected, decWsConnected, incWsTotal } = require("./observability/metrics");
const {
  checkWsProjectLimit,
  checkWsIpLimit,
} = require("./security/rateLimiter");

const defaultAllowedOriginPatterns = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  /\.ngrok-free\.dev$/,
  /\.ngrok\.io$/,
];

function isAllowedWsOrigin(origin, allowedWsOrigins = []) {
  const candidates = [...defaultAllowedOriginPatterns, ...allowedWsOrigins];
  return candidates.some((candidate) => {
    if (typeof candidate === "string") {
      return origin === candidate;
    }
    return candidate.test(origin);
  });
}

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
  if (!entry.desktop.size && !entry.mobile.size && !entry.host.size) {
    wsSessions.delete(sessionId);
  }
}

function broadcast(sessionId, roles, message) {
  const entry = wsSessions.get(sessionId);
  if (!entry) return;

  const payload = JSON.stringify(message);
  const roleSets = Array.isArray(roles) ? roles : [roles];

  for (const role of roleSets) {
    const set = entry[role];
    if (!set) continue;
    for (const socket of set) {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(payload);
      }
    }
  }
}

async function checkWsHandshakeRateLimit({
  rateLimitEnabled,
  redisClient,
  projectId,
  ip,
  rateLimitWsProjectPerMin,
  rateLimitWsIpPerMin,
  logger,
  createAuditLog,
  rateLimitState,
}) {
  if (!rateLimitEnabled) {
    return { allowed: true };
  }

  const projectResult = await checkWsProjectLimit(
    redisClient,
    projectId,
    rateLimitWsProjectPerMin
  );
  if (projectResult.degraded) {
    if (rateLimitState) rateLimitState.degraded = true;
    logger.warn("rate_limit.ws_degraded", {
      scope: "project",
      projectId,
      ip,
    });
  }
  if (!projectResult.allowed) {
    const retryAfterSeconds = Number(projectResult.retryAfterSec || 60);
    if (createAuditLog) {
      await createAuditLog({
        projectId,
        actorType: "system",
        eventType: "RATE_LIMIT_PROJECT",
        metadata: {
          path: "/ws",
          ip,
          retryAfterSeconds,
        },
      });
    }
    logger.warn("rate_limit.ws_denied", {
      scope: "project",
      projectId,
      ip,
      retryAfterSeconds,
    });
    return { allowed: false, scope: "project", retryAfterSeconds };
  }

  const ipResult = await checkWsIpLimit(redisClient, ip, rateLimitWsIpPerMin);
  if (ipResult.degraded) {
    if (rateLimitState) rateLimitState.degraded = true;
    logger.warn("rate_limit.ws_degraded", {
      scope: "ip",
      projectId,
      ip,
    });
  }
  if (!ipResult.allowed) {
    const retryAfterSeconds = Number(ipResult.retryAfterSec || 60);
    if (createAuditLog) {
      await createAuditLog({
        projectId,
        actorType: "system",
        eventType: "RATE_LIMIT_IP",
        metadata: {
          path: "/ws",
          ip,
          retryAfterSeconds,
        },
      });
    }
    logger.warn("rate_limit.ws_denied", {
      scope: "ip",
      projectId,
      ip,
      retryAfterSeconds,
    });
    return { allowed: false, scope: "ip", retryAfterSeconds };
  }

  return { allowed: true };
}

function startWebSocketServer(
  server,
  {
    jwtSecret,
    sessionTtlSeconds,
    allowedWsOrigins = [],
    logger = console,
    sessionStore,
    scanStore,
    redisClient = null,
    createAuditLog = null,
    rateLimitEnabled = false,
    rateLimitWsProjectPerMin = 30,
    rateLimitWsIpPerMin = 60,
    rateLimitState = null,
    lifecycle = null,
    eventBus = {
      publish: async () => {},
      subscribe: () => () => {},
    },
  }
) {
  const wss = new WebSocket.Server({ server, path: "/ws" });
  const allSockets = new Set();

  async function sendSessionState(sessionId) {
    const session = await sessionStore.getSession(sessionId);
    if (!session) return;

    const entry =
      wsSessions.get(sessionId) || {
        desktop: new Set(),
        mobile: new Set(),
        host: new Set(),
      };

    const message = {
      type: "SESSION_STATE",
      sessionId,
      state: session.state,
      mobileConnected: entry.mobile.size > 0,
      desktopConnected: entry.desktop.size > 0,
    };

    broadcast(sessionId, ["desktop", "host"], message);
  }

  const unsubscribe = eventBus.subscribe((message) => {
    if (!message || !message.event) return;

    if (message.event === "scan.accepted") {
      const payload = message.payload || {};
      if (!payload.sessionId || !payload.scan) return;
      broadcast(payload.sessionId, ["desktop", "host"], {
        type: "SCAN",
        payload: payload.scan,
      });
      return;
    }

    if (message.event === "session.state_changed") {
      const payload = message.payload || {};
      if (!payload.sessionId || !payload.state) return;
      broadcast(payload.sessionId, ["desktop", "host"], {
        type: "SESSION_STATE",
        sessionId: payload.sessionId,
        state: payload.state,
        mobileConnected: payload.mobileConnected || false,
        desktopConnected: payload.desktopConnected || false,
      });
    }
  });

  wss.on("connection", (ws, req) => {
    ws.connectionId = randomUUID();
    allSockets.add(ws);
    (async () => {
      if (lifecycle && lifecycle.isDraining()) {
        logger.warn("ws.drain.reject", {
          reason: "service_draining",
          connectionId: ws.connectionId,
        });
        ws.close(1013, "Service draining");
        return;
      }

      const origin = req.headers.origin;
      if (origin && !isAllowedWsOrigin(origin, allowedWsOrigins)) {
        logger.warn("ws.connection.rejected", {
          reason: "origin_not_allowed",
          origin: origin || null,
          connectionId: ws.connectionId,
        });
        ws.close(4000, "Origin not allowed");
        return;
      }

      const url = new URL(req.url, "http://localhost");
      const token = url.searchParams.get("token");
      const role = (url.searchParams.get("role") || "HOST").toUpperCase();
      const claimedSessionId = url.searchParams.get("sessionId");

      if (!token) {
        logger.warn("ws.connection.rejected", {
          reason: "missing_token",
          role,
          connectionId: ws.connectionId,
        });
        ws.close(4001, "Missing token");
        return;
      }

      let decoded;
      try {
        decoded = jwt.verify(token, jwtSecret);
      } catch (err) {
        logger.warn("ws.connection.rejected", {
          reason: "invalid_or_expired_token",
          role,
          connectionId: ws.connectionId,
        });
        ws.close(4002, "Invalid or expired token");
        return;
      }

      const sessionId = decoded.sid || decoded.sessionId;
      const projectId = decoded.pid || decoded.projectId;

      if (!sessionId) {
        logger.warn("ws.connection.rejected", {
          reason: "token_missing_session_id",
          role,
          connectionId: ws.connectionId,
        });
        ws.close(4003, "Token missing session id");
        return;
      }

      if (claimedSessionId && claimedSessionId !== sessionId) {
        logger.warn("ws.connection.rejected", {
          reason: "session_mismatch",
          sessionId,
          claimedSessionId,
          role,
          connectionId: ws.connectionId,
        });
        ws.close(4004, "Session mismatch");
        return;
      }

      const session = await sessionStore.getSession(sessionId);
      if (!session) {
        logger.warn("ws.connection.rejected", {
          reason: "unknown_session",
          sessionId,
          role,
          connectionId: ws.connectionId,
        });
        ws.close(4005, "Unknown session");
        return;
      }

      if (sessionStore.isSessionExpired(session)) {
        await sessionStore.terminateSession(sessionId, SESSION_STATES.EXPIRED);
        logger.warn("ws.connection.rejected", {
          reason: "session_expired",
          sessionId,
          role,
          connectionId: ws.connectionId,
        });
        ws.close(4006, "Session expired");
        return;
      }

      if (session.projectId && projectId && session.projectId !== projectId) {
        logger.warn("ws.connection.rejected", {
          reason: "project_mismatch",
          sessionId,
          sessionProjectId: session.projectId,
          tokenProjectId: projectId,
          role,
          connectionId: ws.connectionId,
        });
        ws.close(4007, "Project mismatch");
        return;
      }

      const ip = req.ip || req.socket?.remoteAddress || "unknown";
      const wsRateLimit = await checkWsHandshakeRateLimit({
        rateLimitEnabled,
        redisClient,
        projectId: projectId || session.projectId || "unknown_project",
        ip,
        rateLimitWsProjectPerMin,
        rateLimitWsIpPerMin,
        logger,
        createAuditLog,
        rateLimitState,
      });
      if (!wsRateLimit.allowed) {
        ws.close(1008, "RATE_LIMIT_EXCEEDED");
        return;
      }

      const entry = getOrCreateWsSession(sessionId);
      ws.sessionId = sessionId;
      ws.role = role;
      ws.projectId = projectId || session.projectId || null;
      ws.connectedAt = Date.now();
      ws.metricsCounted = true;
      incWsTotal();
      incWsConnected();

      logger.info("ws.connection.accepted", {
        sessionId,
        projectId: session.projectId || null,
        role,
        hasOrigin: Boolean(origin),
        sessionTtlSeconds,
        connectionId: ws.connectionId,
      });
      logger.info("ws.connected", {
        sessionId,
        projectId: session.projectId || null,
        role,
        connectionId: ws.connectionId,
      });

      if (role === "DESKTOP") {
        entry.desktop.add(ws);
        await sessionStore.setSessionState(sessionId, SESSION_STATES.WAITING_MOBILE);

        const last = await scanStore.getLastScan(sessionId);
        if (last) {
          ws.send(JSON.stringify({ type: "SCAN", payload: last }));
          logger.info("ws.scan.hydrated", {
            sessionId,
            role,
          });
        }
      } else if (role === "MOBILE") {
        entry.mobile.add(ws);
        await sessionStore.setSessionState(sessionId, SESSION_STATES.ACTIVE);
      } else {
        entry.host.add(ws);
      }

      await sendSessionState(sessionId);
      const currentSession = await sessionStore.getSession(sessionId);
      if (currentSession) {
        await eventBus.publish("session.state_changed", {
          sessionId,
          state: currentSession.state,
          mobileConnected: entry.mobile.size > 0,
          desktopConnected: entry.desktop.size > 0,
        });
      }

      ws.on("message", (msg) => {
        (async () => {
          let data;
          try {
            data = JSON.parse(msg);
          } catch {
            logger.warn("ws.message.rejected", {
              sessionId: ws.sessionId || null,
              role: ws.role || null,
              reason: "invalid_json",
            });
            ws.send(JSON.stringify({ type: "ERROR", message: "Invalid JSON" }));
            return;
          }

          if (data.type === "DESKTOP_JOIN" || data.type === "MOBILE_JOIN") {
            return;
          }

          if (data.type === "SCAN") {
            const socketSessionId = ws.sessionId;
            if (!socketSessionId) {
              logger.warn("ws.scan.rejected", {
                reason: "socket_not_associated",
                role: ws.role || null,
                connectionId: ws.connectionId,
              });
              ws.send(
                JSON.stringify({
                  type: "ERROR",
                  message: "Socket not associated with a session",
                })
              );
              return;
            }

            const currentSession = await sessionStore.getSession(socketSessionId);
            if (!currentSession) {
              ws.send(
                JSON.stringify({
                  type: "ERROR",
                  message: "Unknown session",
                })
              );
              return;
            }

            if (sessionStore.isSessionExpired(currentSession)) {
              await sessionStore.terminateSession(socketSessionId, SESSION_STATES.EXPIRED);
              logger.warn("ws.scan.rejected", {
                sessionId: socketSessionId,
                role: ws.role || null,
                reason: "session_expired",
                connectionId: ws.connectionId,
              });
              ws.send(
                JSON.stringify({
                  type: "ERROR",
                  message: "Session expired",
                })
              );
              return;
            }

            if (
              currentSession.projectId &&
              ws.projectId &&
              currentSession.projectId !== ws.projectId
            ) {
              logger.warn("ws.scan.rejected", {
                sessionId: socketSessionId,
                role: ws.role || null,
                reason: "project_mismatch",
                connectionId: ws.connectionId,
              });
              ws.send(
                JSON.stringify({
                  type: "ERROR",
                  message: "Cross-project access denied",
                })
              );
              return;
            }

            const result = await scanStore.saveScan(socketSessionId, data.payload);
            if (!result.accepted) {
              logger.warn("ws.scan.rejected", {
                sessionId: socketSessionId,
                role: ws.role || null,
                reason: result.reason || "duplicate_or_invalid",
                connectionId: ws.connectionId,
              });
              ws.send(
                JSON.stringify({
                  type: "ERROR",
                  message: "Duplicate or invalid scan",
                })
              );
              return;
            }

            broadcast(socketSessionId, ["desktop", "host"], {
              type: "SCAN",
              payload: data.payload,
            });
            await eventBus.publish("scan.accepted", {
              sessionId: socketSessionId,
              scan: data.payload,
            });

            logger.info("ws.scan.accepted", {
              sessionId: socketSessionId,
              role: ws.role || null,
              format: data?.payload?.format || null,
              connectionId: ws.connectionId,
            });
          }
        })().catch((error) => {
          logger.error("ws.message.handler_error", {
            sessionId: ws.sessionId || null,
            role: ws.role || null,
            error,
          });
        });
      });

      ws.on("close", (code, reasonBuffer) => {
        (async () => {
          allSockets.delete(ws);
          if (ws.metricsCounted) {
            ws.metricsCounted = false;
            decWsConnected();
          }
          const reason = reasonBuffer ? reasonBuffer.toString() : "";

          logger.info("ws.connection.closed", {
            sessionId: ws.sessionId || null,
            role: ws.role || null,
            code,
            reason: reason || null,
            durationMs: ws.connectedAt ? Date.now() - ws.connectedAt : null,
            connectionId: ws.connectionId,
          });
          logger.info("ws.closed", {
            sessionId: ws.sessionId || null,
            role: ws.role || null,
            code,
            reason: reason || null,
            connectionId: ws.connectionId,
          });

          if (!ws.sessionId) return;
          removeSocketFromSession(ws.sessionId, ws);
          await sendSessionState(ws.sessionId);
        })().catch((error) => {
          logger.error("ws.connection.close_handler_error", {
            sessionId: ws.sessionId || null,
            role: ws.role || null,
            error,
          });
        });
      });

      ws.on("error", (error) => {
        logger.error("ws.error", {
          sessionId: ws.sessionId || null,
          role: ws.role || null,
          connectionId: ws.connectionId,
          error,
        });
      });
    })().catch((error) => {
      logger.error("ws.connection.handler_error", {
        connectionId: ws.connectionId,
        error,
      });
      ws.close(1011, "Internal server error");
    });
  });

  return {
    startDrain(graceMs = 5000) {
      logger.warn("ws.drain.start", {
        graceMs,
        activeConnections: allSockets.size,
      });
      setTimeout(() => {
        for (const socket of allSockets) {
          if (socket.readyState === WebSocket.OPEN) {
            socket.close(1001, "Service draining");
          }
        }
      }, Math.max(0, Number(graceMs) || 0));
    },
    async close() {
      unsubscribe();
      await new Promise((resolve) => {
        wss.close(() => resolve());
      });
    },
  };
}

module.exports = { startWebSocketServer, checkWsHandshakeRateLimit };
