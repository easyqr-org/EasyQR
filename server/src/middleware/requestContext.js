const { randomUUID } = require("crypto");

function requestContext(req, res, next) {
  const existing = req.headers["x-request-id"];
  const requestId =
    typeof existing === "string" && existing.trim()
      ? existing.trim()
      : randomUUID();

  req.requestId = requestId;
  res.setHeader("x-request-id", requestId);

  next();
}

function requestLogger(logger) {
  return function requestLoggerMiddleware(req, res, next) {
    const start = process.hrtime.bigint();

    res.on("finish", () => {
      const elapsedNs = process.hrtime.bigint() - start;
      const durationMs = Number(elapsedNs) / 1e6;

      logger.info("http.request", {
        requestId: req.requestId || null,
        method: req.method,
        path: req.originalUrl || req.url,
        statusCode: res.statusCode,
        durationMs: Number(durationMs.toFixed(2)),
      });
    });

    next();
  };
}

module.exports = {
  requestContext,
  requestLogger,
};
