const { sendError } = require("../errors");

function notFoundHandler(req, res) {
  return sendError(res, {
    statusCode: 404,
    code: "ROUTE_NOT_FOUND",
    message: "Route not found",
    requestId: req.requestId,
  });
}

function errorHandler(logger) {
  return function errorHandlerMiddleware(err, req, res, next) {
  const statusCode =
    Number.isInteger(err?.statusCode) && err.statusCode >= 400
      ? err.statusCode
      : 500;

    const code =
      typeof err?.code === "string" && err.code.trim()
        ? err.code
        : statusCode >= 500
          ? "INTERNAL_ERROR"
          : "REQUEST_FAILED";

    const message =
      statusCode >= 500 ? "Internal server error" : err?.message || "Request failed";

    if (statusCode >= 500) {
      logger.error("http.error.unexpected", {
        requestId: req.requestId || null,
        path: req.originalUrl || req.url,
        method: req.method,
        statusCode,
        error: err,
      });
    } else {
      logger.warn("http.error", {
        requestId: req.requestId || null,
        path: req.originalUrl || req.url,
        method: req.method,
        statusCode,
        code,
        message: err?.message || null,
      });
    }

    return sendError(res, {
      statusCode,
      code,
      message,
      requestId: req.requestId,
      details: err?.details || null,
    });
  };
}

module.exports = { notFoundHandler, errorHandler };
