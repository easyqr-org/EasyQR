const {
  checkApiProjectLimit,
  checkApiIpLimit,
} = require("../security/rateLimiter");

function createApiRateLimitMiddleware({
  config,
  logger,
  redisClient,
  createAuditLog,
  rateLimitState,
}) {
  return async function apiRateLimit(req, res, next) {
    if (!config.rateLimitEnabled) {
      return next();
    }

    const projectId = req.authProjectId || null;
    const ip = req.ip || req.socket?.remoteAddress || "unknown";

    if (!projectId) {
      return next();
    }

    const projectResult = await checkApiProjectLimit(
      redisClient,
      projectId,
      config.rateLimitApiProjectPerMin
    );
    if (projectResult.degraded) {
      if (rateLimitState) rateLimitState.degraded = true;
      logger.warn("rate_limit.degraded", {
        scope: "project",
        projectId,
        ip,
      });
    }
    if (!projectResult.allowed) {
      const retryAfterSeconds = Number(projectResult.retryAfterSec || 60);
      res.setHeader("Retry-After", String(retryAfterSeconds));
      await createAuditLog({
        projectId,
        actorType: "system",
        eventType: "RATE_LIMIT_PROJECT",
        metadata: {
          requestId: req.requestId || null,
          ip,
          retryAfterSeconds,
          path: req.originalUrl || req.url,
        },
      });
      logger.warn("rate_limit.denied", {
        scope: "project",
        projectId,
        ip,
        retryAfterSeconds,
      });
      return res.status(429).json({
        error: "RATE_LIMIT_EXCEEDED",
        scope: "project",
        retryAfterSeconds,
      });
    }

    const ipResult = await checkApiIpLimit(
      redisClient,
      ip,
      config.rateLimitApiIpPerMin
    );
    if (ipResult.degraded) {
      if (rateLimitState) rateLimitState.degraded = true;
      logger.warn("rate_limit.degraded", {
        scope: "ip",
        projectId,
        ip,
      });
    }
    if (!ipResult.allowed) {
      const retryAfterSeconds = Number(ipResult.retryAfterSec || 60);
      res.setHeader("Retry-After", String(retryAfterSeconds));
      await createAuditLog({
        projectId,
        actorType: "system",
        eventType: "RATE_LIMIT_IP",
        metadata: {
          requestId: req.requestId || null,
          ip,
          retryAfterSeconds,
          path: req.originalUrl || req.url,
        },
      });
      logger.warn("rate_limit.denied", {
        scope: "ip",
        projectId,
        ip,
        retryAfterSeconds,
      });
      return res.status(429).json({
        error: "RATE_LIMIT_EXCEEDED",
        scope: "ip",
        retryAfterSeconds,
      });
    }

    return next();
  };
}

module.exports = {
  createApiRateLimitMiddleware,
};
