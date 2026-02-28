class AppError extends Error {
  constructor({
    message,
    statusCode = 500,
    code = "INTERNAL_ERROR",
    details = null,
  }) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

function sendError(res, {
  statusCode,
  code,
  message,
  requestId,
  details = null,
}) {
  const payload = {
    error: {
      code,
      message,
      requestId: requestId || null,
    },
  };

  if (details) {
    payload.error.details = details;
  }

  return res.status(statusCode).json(payload);
}

module.exports = {
  AppError,
  sendError,
};
