const express = require("express");
const http = require("http");
const path = require("path");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");

const { startWebSocketServer } = require("./wsServer");
const { validateCreateSession } = require("./middleware/validateCreateSession");
const { notFoundHandler, errorHandler } = require("./middleware/errorHandlers");
const { requestContext, requestLogger } = require("./observability/requestContext");
const { SESSION_STATES } = require("./data/sessionStates");
const { createApiRateLimitMiddleware } = require("./middleware/rateLimit");
const { loadConfig, buildConfig } = require("./config");
const { createObservabilityLogger } = require("./observability/logger");
const { AppError } = require("./errors");
const { createDataLayer } = require("./data");
const { constantTimeEqual } = require("./security/apiKeyCrypto");
const { validateProjectAccess } = require("./middleware/validateProjectAccess");
const { createLifecycle } = require("./runtime/lifecycle");
const { renderMetrics } = require("./observability/metrics");

const defaultAllowedOriginPatterns = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  /\.ngrok-free\.dev$/,
  /\.ngrok\.io$/,
];

function isAllowedOrigin(origin, allowedOrigins = []) {
  const candidates = [...defaultAllowedOriginPatterns, ...allowedOrigins];
  return candidates.some((candidate) => {
    if (typeof candidate === "string") {
      return origin === candidate;
    }
    return candidate.test(origin);
  });
}

function getPrimaryForwardedValue(value) {
  return String(value || "")
    .split(",")[0]
    .trim();
}

function getExternalBaseUrl(req) {
  const forwardedProto = getPrimaryForwardedValue(req.get("x-forwarded-proto"));
  const forwardedHost = getPrimaryForwardedValue(req.get("x-forwarded-host"));
  const protocol = forwardedProto || req.protocol;
  const host = forwardedHost || req.get("host");
  return `${protocol}://${host}`;
}

function createApp(config, logger, dataLayer, lifecycle = null) {
  const app = express();
  const {
    allowedOrigins,
    projectKeys,
    hasProjectKeys,
    sessionTtlSeconds,
    jwtSecret,
    adminToken,
    allowLegacyKeys,
  } = config;
  const { sessionStore, scanStore } = dataLayer;
  const runtimeLifecycle = lifecycle || createLifecycle();
  if (!lifecycle) {
    runtimeLifecycle.setMigrationsComplete(true);
    runtimeLifecycle.markReady();
  }

  async function checkRuntimeReadiness() {
    if (!runtimeLifecycle.isMigrationsComplete()) {
      return false;
    }
    if (!runtimeLifecycle.isReady()) {
      return false;
    }

    if (
      dataLayer.mode === "postgres" &&
      sessionStore &&
      typeof sessionStore.ping === "function"
    ) {
      try {
        await sessionStore.ping();
      } catch (error) {
        logger.warn("health.readiness.db_unavailable", {
          message: error?.message || String(error),
        });
        return false;
      }
    }

    if (config.redisEnabled) {
      const redisConnected = Boolean(
        dataLayer.rateLimitRedisClient && dataLayer.rateLimitRedisClient.isOpen
      );
      if (!redisConnected) {
        return false;
      }
    }

    return true;
  }

  async function createAuditLog({
    projectId = null,
    actorType = "system",
    eventType,
    metadata = {},
  }) {
    if (!sessionStore.createAuditLog) return null;
    try {
      if (projectId && sessionStore.ensureProject) {
        await sessionStore.ensureProject(projectId);
      }
      return await sessionStore.createAuditLog({
        projectId,
        actorType,
        eventType,
        metadata,
      });
    } catch (error) {
      logger.error("audit.log_write_failed", { eventType, projectId, error });
      return null;
    }
  }

  async function authenticateProjectCredentials(req, projectId, apiKey) {
    const requestMeta = {
      requestId: req.requestId || null,
      ip: req.ip || req.socket?.remoteAddress || null,
      path: req.originalUrl || req.url,
    };

    let hasDbKeys = false;
    if (sessionStore.hasActiveApiKeys) {
      hasDbKeys = await sessionStore.hasActiveApiKeys(projectId);
    }

    if (hasDbKeys) {
      if (!apiKey || !String(apiKey).trim()) {
        await createAuditLog({
          projectId,
          actorType: "api_key",
          eventType: "AUTH_FAILURE",
          metadata: { ...requestMeta, reason: "MISSING_API_KEY" },
        });
        throw new AppError({
          statusCode: 401,
          code: "INVALID_PROJECT_CREDENTIALS",
          message: "Invalid project credentials",
        });
      }

      const verifyResult = await sessionStore.verifyProjectApiKey(projectId, apiKey);
      if (!verifyResult || !verifyResult.valid) {
        await createAuditLog({
          projectId,
          actorType: "api_key",
          eventType: "AUTH_FAILURE",
          metadata: { ...requestMeta, reason: "INVALID_API_KEY_HASH" },
        });
        throw new AppError({
          statusCode: 401,
          code: "INVALID_PROJECT_CREDENTIALS",
          message: "Invalid project credentials",
        });
      }

      await createAuditLog({
        projectId,
        actorType: "api_key",
        eventType: "AUTH_SUCCESS",
        metadata: {
          ...requestMeta,
          authSource: "hashed_api_key",
          keyVersion: verifyResult.version || null,
        },
      });
      return;
    }

    if (hasProjectKeys && allowLegacyKeys) {
      const expectedKey = projectKeys[projectId];
      const matches =
        typeof expectedKey === "string" &&
        typeof apiKey === "string" &&
        constantTimeEqual(expectedKey, apiKey);

      if (!matches) {
        await createAuditLog({
          projectId,
          actorType: "system",
          eventType: "AUTH_FAILURE",
          metadata: { ...requestMeta, reason: "INVALID_LEGACY_PROJECT_KEY" },
        });
        throw new AppError({
          statusCode: 401,
          code: "INVALID_PROJECT_CREDENTIALS",
          message: "Invalid project credentials",
        });
      }

      await createAuditLog({
        projectId,
        actorType: "system",
        eventType: "AUTH_SUCCESS",
        metadata: { ...requestMeta, authSource: "legacy_project_key" },
      });
      return;
    }

    if (hasProjectKeys && !allowLegacyKeys) {
      await createAuditLog({
        projectId,
        actorType: "system",
        eventType: "AUTH_FAILURE",
        metadata: { ...requestMeta, reason: "LEGACY_KEYS_DISABLED" },
      });
      throw new AppError({
        statusCode: 401,
        code: "INVALID_PROJECT_CREDENTIALS",
        message: "Invalid project credentials",
      });
    }

    await createAuditLog({
      projectId,
      actorType: "system",
      eventType: "AUTH_SUCCESS",
      metadata: { ...requestMeta, authSource: "open_mode" },
    });
  }

  async function requireAdmin(req, res, next) {
    try {
      if (!adminToken) {
        return next(
          new AppError({
            statusCode: 503,
            code: "ADMIN_AUDIT_DISABLED",
            message: "Admin audit endpoint is disabled",
          })
        );
      }

      const provided = req.get("x-admin-token") || "";
      if (!provided || !constantTimeEqual(provided, adminToken)) {
        await createAuditLog({
          projectId: null,
          actorType: "system",
          eventType: "AUTH_FAILURE",
          metadata: {
            requestId: req.requestId || null,
            path: req.originalUrl || req.url,
            reason: !provided ? "MISSING_ADMIN_TOKEN" : "INVALID_ADMIN_TOKEN",
          },
        });
        return next(
          new AppError({
            statusCode: 401,
            code: "ADMIN_UNAUTHORIZED",
            message: "Unauthorized",
          })
        );
      }

      return next();
    } catch (error) {
      return next(error);
    }
  }

  async function requireProjectAuth(req, res, next) {
    try {
      const projectId =
        String(req.get("x-project-id") || req.query.projectId || "").trim();
      const apiKey = String(req.get("x-api-key") || req.query.apiKey || "");

      if (!projectId) {
        throw new AppError({
          statusCode: 401,
          code: "PROJECT_AUTH_REQUIRED",
          message: "Project authentication is required",
        });
      }

      await authenticateProjectCredentials(req, projectId, apiKey);
      req.authProjectId = projectId;
      return next();
    } catch (error) {
      return next(error);
    }
  }

  async function requireProjectBodyAuth(req, res, next) {
    try {
      const body = req.body || {};
      const projectId =
        typeof body.projectId === "string" ? body.projectId.trim() : "";
      const apiKey = typeof body.apiKey === "string" ? body.apiKey : "";

      if (!projectId) {
        throw new AppError({
          statusCode: 401,
          code: "PROJECT_AUTH_REQUIRED",
          message: "Project authentication is required",
        });
      }

      await authenticateProjectCredentials(req, projectId, apiKey);
      req.authProjectId = projectId;
      return next();
    } catch (error) {
      return next(error);
    }
  }

  const apiRateLimit = createApiRateLimitMiddleware({
    config,
    logger,
    redisClient: dataLayer.rateLimitRedisClient,
    createAuditLog,
    rateLimitState: dataLayer.rateLimitState,
  });

  app.use(requestContext);
  app.use(requestLogger(logger));

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) {
          return callback(null, true);
        }

        if (isAllowedOrigin(origin, allowedOrigins)) {
          return callback(null, true);
        }

        return callback(
          new AppError({
            statusCode: 403,
            code: "CORS_ORIGIN_DENIED",
            message: "Not allowed by CORS",
          }),
          false
        );
      },
      credentials: true,
    })
  );

  app.use(express.json({ limit: "32kb" }));

  app.get("/health/live", (_req, res) => {
    res.status(200).json({ status: "alive" });
  });

  app.get("/health/ready", async (_req, res) => {
    const ready = await checkRuntimeReadiness();
    if (!ready) {
      return res.status(503).json({ status: "not_ready" });
    }
    return res.status(200).json({ status: "ready" });
  });

  app.get("/health", (req, res) => {
    const redisConnected = Boolean(
      dataLayer.rateLimitRedisClient && dataLayer.rateLimitRedisClient.isOpen
    );
    const rateLimitDegraded =
      dataLayer.rateLimitState?.degraded === true ||
      (config.rateLimitEnabled && !redisConnected);

    res.status(200).json({
      status: "ok",
      requestId: req.requestId,
      storageBackend: dataLayer.mode,
      redisEnabled: config.redisEnabled,
      redisConnected,
      rateLimitDegraded,
    });
  });

  app.get("/metrics", (_req, res) => {
    res.setHeader("content-type", "text/plain; charset=utf-8");
    res.status(200).send(renderMetrics());
  });

  app.use((req, res, next) => {
    if (runtimeLifecycle.isDraining()) {
      return res.status(503).json({
        error: "SERVICE_DRAINING",
      });
    }
    if (!runtimeLifecycle.isReady()) {
      return res.status(503).json({
        error: "SERVICE_NOT_READY",
      });
    }
    return next();
  });

  app.use(express.static(path.join(__dirname, "../../desktop-app")));
  app.use("/mobile", express.static(path.join(__dirname, "../../mobile-scanner")));
  app.use("/public", express.static(path.join(__dirname, "../../public")));
  app.use(
    "/sdk",
    express.static(path.join(__dirname, "../public/sdk"), { index: false })
  );

  app.get("/session/:sessionId", (req, res) => {
    res.sendFile(path.join(__dirname, "../../desktop-app/index.html"));
  });

  app.post(
    "/api/sessions",
    validateCreateSession,
    requireProjectBodyAuth,
    apiRateLimit,
    async (req, res, next) => {
    try {
      const { projectId, apiKey, context, webhookUrl } = req.body || {};
      void apiKey;

      const sessionId = uuidv4();
      if (sessionStore.ensureProject) {
        await sessionStore.ensureProject(projectId);
      }
      const session = await sessionStore.createSession({
        sessionId,
        projectId,
        context: context || null,
        webhookUrl: webhookUrl || null,
        ttlSeconds: sessionTtlSeconds,
      });

      await sessionStore.setSessionState(sessionId, SESSION_STATES.PENDING_DESKTOP);
      session.state = SESSION_STATES.PENDING_DESKTOP;

      const wsToken = jwt.sign({ sid: sessionId, pid: projectId }, jwtSecret, {
        expiresIn: sessionTtlSeconds,
      });

      const baseUrl = getExternalBaseUrl(req);
      const desktopUrl = `${baseUrl}/session/${sessionId}?token=${encodeURIComponent(
        wsToken
      )}`;
      const mobileUrl = `${baseUrl}/mobile?sessionId=${encodeURIComponent(
        sessionId
      )}&token=${encodeURIComponent(wsToken)}`;

      logger.info("session.created", {
        requestId: req.requestId,
        sessionId,
        projectId,
        expiresAt: session.expiresAt,
      });

      res.status(201).json({
        sessionId,
        wsToken,
        desktopUrl,
        mobileUrl,
        expiresAt: session.expiresAt,
      });
    } catch (err) {
      next(err);
    }
    }
  );

  app.post("/api/projects", async (req, res, next) => {
    try {
      const body = req.body || {};
      const projectId =
        typeof body.projectId === "string" ? body.projectId.trim() : "";
      if (!projectId) {
        throw new AppError({
          statusCode: 400,
          code: "PROJECT_ID_REQUIRED",
          message: "projectId is required",
        });
      }

      if (!sessionStore.createOrRotateApiKey) {
        throw new AppError({
          statusCode: 501,
          code: "KEY_MANAGEMENT_UNAVAILABLE",
          message: "Key management is unavailable for current storage backend",
        });
      }

      const key = await sessionStore.createOrRotateApiKey(projectId);
      await createAuditLog({
        projectId,
        actorType: "system",
        eventType: "API_KEY_CREATED",
        metadata: {
          requestId: req.requestId || null,
          version: key.version,
        },
      });

      return res.status(201).json({
        projectId,
        version: key.version,
        apiKey: key.apiKey,
      });
    } catch (err) {
      return next(err);
    }
  });

  app.post("/api/projects/:id/keys/rotate", async (req, res, next) => {
    try {
      const projectId = String(req.params.id || "").trim();
      if (!projectId) {
        throw new AppError({
          statusCode: 400,
          code: "PROJECT_ID_REQUIRED",
          message: "projectId is required",
        });
      }

      if (!sessionStore.createOrRotateApiKey) {
        throw new AppError({
          statusCode: 501,
          code: "KEY_MANAGEMENT_UNAVAILABLE",
          message: "Key management is unavailable for current storage backend",
        });
      }

      const key = await sessionStore.createOrRotateApiKey(projectId);
      await createAuditLog({
        projectId,
        actorType: "system",
        eventType: "API_KEY_ROTATED",
        metadata: {
          requestId: req.requestId || null,
          version: key.version,
        },
      });

      return res.status(201).json({
        projectId,
        version: key.version,
        apiKey: key.apiKey,
      });
    } catch (err) {
      return next(err);
    }
  });

  app.post("/api/projects/:id/keys/:version/revoke", async (req, res, next) => {
    try {
      const projectId = String(req.params.id || "").trim();
      const version = Number(req.params.version);
      if (!projectId) {
        throw new AppError({
          statusCode: 400,
          code: "PROJECT_ID_REQUIRED",
          message: "projectId is required",
        });
      }
      if (!Number.isInteger(version) || version <= 0) {
        throw new AppError({
          statusCode: 400,
          code: "INVALID_KEY_VERSION",
          message: "version must be a positive integer",
        });
      }

      if (!sessionStore.revokeApiKey) {
        throw new AppError({
          statusCode: 501,
          code: "KEY_MANAGEMENT_UNAVAILABLE",
          message: "Key management is unavailable for current storage backend",
        });
      }

      const revoked = await sessionStore.revokeApiKey(projectId, version);
      if (!revoked) {
        throw new AppError({
          statusCode: 404,
          code: "KEY_VERSION_NOT_FOUND",
          message: "Key version not found",
        });
      }

      await createAuditLog({
        projectId,
        actorType: "system",
        eventType: "API_KEY_REVOKED",
        metadata: {
          requestId: req.requestId || null,
          version,
        },
      });

      return res.status(200).json({
        projectId,
        version,
        revoked: true,
      });
    } catch (err) {
      return next(err);
    }
  });

  app.get("/api/admin/audit", requireAdmin, async (req, res, next) => {
    try {
      if (!sessionStore.getAuditLogs) {
        throw new AppError({
          statusCode: 501,
          code: "AUDIT_LOGS_UNAVAILABLE",
          message: "Audit logs are unavailable for current storage backend",
        });
      }
      const projectId =
        typeof req.query.project_id === "string" && req.query.project_id.trim()
          ? req.query.project_id.trim()
          : null;
      const eventType =
        typeof req.query.event_type === "string" && req.query.event_type.trim()
          ? req.query.event_type.trim()
          : null;
      const limitRaw = Number(req.query.limit || 50);
      const offsetRaw = Number(req.query.offset || 0);
      const limit = Number.isInteger(limitRaw)
        ? Math.min(Math.max(limitRaw, 1), 200)
        : 50;
      const offset = Number.isInteger(offsetRaw) && offsetRaw >= 0 ? offsetRaw : 0;

      const result = await sessionStore.getAuditLogs({
        projectId,
        eventType,
        limit,
        offset,
      });

      return res.json({
        items: result.items,
        total: result.total,
        limit: result.limit,
        offset: result.offset,
      });
    } catch (err) {
      return next(err);
    }
  });

  app.post("/api/admin/cleanup-expired", requireAdmin, async (req, res, next) => {
    try {
      if (!sessionStore.cleanupExpiredSessions) {
        throw new AppError({
          statusCode: 501,
          code: "CLEANUP_UNAVAILABLE",
          message: "Cleanup is unavailable for current storage backend",
        });
      }
      const purge =
        String(req.query.purge || "").toLowerCase() === "true" ||
        Boolean(req.body && req.body.purge === true);
      const result = await sessionStore.cleanupExpiredSessions({ purge });
      return res.json(result);
    } catch (err) {
      return next(err);
    }
  });

  app.get("/api/scans", requireProjectAuth, apiRateLimit, async (req, res, next) => {
    try {
      const { sessionId } = req.query;
      if (sessionId) {
        const session = await sessionStore.getSession(sessionId);
        if (!session) {
          throw new AppError({
            statusCode: 404,
            code: "SESSION_NOT_FOUND",
            message: "Session not found",
          });
        }
        validateProjectAccess(req, session.projectId);
        if (sessionStore.isSessionExpired(session)) {
          await sessionStore.terminateSession(sessionId, SESSION_STATES.EXPIRED);
          throw new AppError({
            statusCode: 410,
            code: "SESSION_EXPIRED",
            message: "Session expired",
          });
        }
      }
      const scans = sessionId
        ? await scanStore.getAllScans(sessionId)
        : await scanStore.getAllScansByProject(req.authProjectId);

      logger.info("scan.history.read", {
        requestId: req.requestId,
        sessionId: sessionId || null,
        count: scans.length,
        projectId: req.authProjectId || null,
      });

      res.json(scans);
    } catch (err) {
      next(err);
    }
  });

  app.delete("/api/scans", requireProjectAuth, apiRateLimit, async (req, res, next) => {
    try {
      const { sessionId } = req.query;
      if (sessionId) {
        const session = await sessionStore.getSession(sessionId);
        if (!session) {
          throw new AppError({
            statusCode: 404,
            code: "SESSION_NOT_FOUND",
            message: "Session not found",
          });
        }
        validateProjectAccess(req, session.projectId);
      }
      if (sessionId) {
        await scanStore.clearScans(sessionId);
      } else {
        await scanStore.clearScansByProject(req.authProjectId);
      }

      logger.info("scan.history.cleared", {
        requestId: req.requestId,
        sessionId: sessionId || null,
        projectId: req.authProjectId || null,
      });

      res.json({ status: "cleared" });
    } catch (err) {
      next(err);
    }
  });

  app.use(notFoundHandler);
  app.use(errorHandler(logger));

  return app;
}

async function createServer(overrides = null) {
  const config = overrides ? buildConfig(overrides) : loadConfig();
  const observability = createObservabilityLogger({ service: "easyqr-service" });
  const logger = observability.raw;
  const lifecycle = createLifecycle();
  const dataLayer = await createDataLayer(config, logger);
  lifecycle.setMigrationsComplete(true);
  const app = createApp(config, logger, dataLayer, lifecycle);
  const server = http.createServer(app);

  const createWsAuditLog = async ({
    projectId = null,
    actorType = "system",
    eventType,
    metadata = {},
  }) => {
    if (!dataLayer.sessionStore?.createAuditLog) return null;
    try {
      if (projectId && dataLayer.sessionStore.ensureProject) {
        await dataLayer.sessionStore.ensureProject(projectId);
      }
      return await dataLayer.sessionStore.createAuditLog({
        projectId,
        actorType,
        eventType,
        metadata,
      });
    } catch (error) {
      logger.error("audit.log_write_failed", { eventType, projectId, error });
      return null;
    }
  };

  const wsRuntime = startWebSocketServer(server, {
    jwtSecret: config.jwtSecret,
    sessionTtlSeconds: config.sessionTtlSeconds,
    allowedWsOrigins: config.allowedOrigins,
    logger,
    sessionStore: dataLayer.sessionStore,
    scanStore: dataLayer.scanStore,
    eventBus: dataLayer.eventBus,
    redisClient: dataLayer.rateLimitRedisClient,
    createAuditLog: createWsAuditLog,
    rateLimitEnabled: config.rateLimitEnabled,
    rateLimitWsProjectPerMin: config.rateLimitWsProjectPerMin,
    rateLimitWsIpPerMin: config.rateLimitWsIpPerMin,
    rateLimitState: dataLayer.rateLimitState,
    lifecycle,
  });

  return { app, server, config, logger, dataLayer, lifecycle, wsRuntime };
}

if (require.main === module) {
  (async () => {
    const { server, config, logger, dataLayer, lifecycle, wsRuntime } =
      await createServer();

    let shuttingDown = false;
    const startShutdown = (signal) => {
      if (shuttingDown) return;
      shuttingDown = true;
      lifecycle.startDrain();
      logger.warn("service.shutdown.start", {
        signal,
        timeoutMs: config.shutdownTimeoutMs,
        wsDrainGraceMs: config.wsDrainGraceMs,
      });
      if (wsRuntime && typeof wsRuntime.startDrain === "function") {
        wsRuntime.startDrain(config.wsDrainGraceMs);
      }

      const forceTimer = setTimeout(() => {
        logger.error("service.shutdown.timeout", {
          timeoutMs: config.shutdownTimeoutMs,
        });
        process.exit(1);
      }, config.shutdownTimeoutMs);
      forceTimer.unref();

      server.close(async () => {
        try {
          if (wsRuntime && typeof wsRuntime.close === "function") {
            await wsRuntime.close();
          }
          await dataLayer.close();
          lifecycle.markStopped();
          logger.info("service.shutdown.complete", { signal });
          process.exit(0);
        } catch (error) {
          logger.error("service.shutdown.error", {
            signal,
            error: error?.message || String(error),
          });
          process.exit(1);
        }
      });
    };

    process.on("SIGTERM", () => startShutdown("SIGTERM"));
    process.on("SIGINT", () => startShutdown("SIGINT"));

    server.listen(config.port, () => {
      const completeStartup = () => {
        lifecycle.markReady();
        logger.info("service.ready", {
          startupReadyDelayMs: config.startupReadyDelayMs,
        });
      };
      if (config.startupReadyDelayMs > 0) {
        setTimeout(completeStartup, config.startupReadyDelayMs);
      } else {
        completeStartup();
      }

      logger.info("service.started", {
        port: config.port,
        desktopPath: "/",
        mobilePath: "/mobile",
        storageBackend: config.storageBackend,
        redisEnabled: config.redisEnabled,
        instanceId: config.instanceId,
        allowLegacyKeys: config.allowLegacyKeys,
      });
      if (config.hasProjectKeys && config.allowLegacyKeys) {
        logger.warn("auth.legacy_keys_enabled", {
          message:
            "Legacy EASYQR_PROJECT_KEYS fallback is enabled. Set EASYQR_ALLOW_LEGACY_KEYS=false to disable.",
        });
      }
    });
  })().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = { createApp, createServer };
