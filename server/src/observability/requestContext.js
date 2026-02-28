const { randomUUID } = require("crypto");
const { incHttpRequest, incHttpError } = require("./metrics");

function requestContext(req, res, next) {
  const incoming = req.headers["x-request-id"];
  const requestId =
    typeof incoming === "string" && incoming.trim() ? incoming.trim() : randomUUID();

  req.requestId = requestId;
  if (!res.locals) {
    res.locals = {};
  }
  res.locals.requestId = requestId;
  res.setHeader("x-request-id", requestId);
  next();
}

function requestLogger(logger) {
  return function requestLoggerMiddleware(req, res, next) {
    const start = process.hrtime.bigint();
    const requestId = req.requestId || null;
    incHttpRequest();
    logger.info("request.received", {
      requestId,
      method: req.method,
      path: req.originalUrl || req.url,
    });

    res.on("finish", () => {
      const elapsedNs = process.hrtime.bigint() - start;
      const durationMs = Number(elapsedNs) / 1e6;
      if (res.statusCode >= 500) {
        incHttpError();
      }
      logger.info("request.completed", {
        requestId,
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
