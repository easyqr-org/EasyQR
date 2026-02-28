const { AppError } = require("../errors");

function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isValidWebhookUrl(webhookUrl) {
  try {
    const parsed = new URL(webhookUrl);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function validateCreateSession(req, res, next) {
  const body = req.body;

  if (!isPlainObject(body)) {
    return next(
      new AppError({
        statusCode: 400,
        code: "INVALID_BODY",
        message: "Request body must be a JSON object",
      })
    );
  }

  const projectId =
    typeof body.projectId === "string" ? body.projectId.trim() : "";
  if (!projectId) {
    return next(
      new AppError({
        statusCode: 400,
        code: "PROJECT_ID_REQUIRED",
        message: "projectId is required",
      })
    );
  }

  if (body.context !== undefined && body.context !== null && !isPlainObject(body.context)) {
    return next(
      new AppError({
        statusCode: 400,
        code: "INVALID_CONTEXT",
        message: "context must be a JSON object if provided",
      })
    );
  }

  if (
    body.webhookUrl !== undefined &&
    body.webhookUrl !== null &&
    (typeof body.webhookUrl !== "string" || !isValidWebhookUrl(body.webhookUrl))
  ) {
    return next(
      new AppError({
        statusCode: 400,
        code: "INVALID_WEBHOOK_URL",
        message: "webhookUrl must be a valid http(s) URL",
      })
    );
  }

  req.body = {
    ...body,
    projectId,
    apiKey: typeof body.apiKey === "string" ? body.apiKey : null,
    context: body.context || null,
    webhookUrl: body.webhookUrl || null,
  };

  return next();
}

module.exports = { validateCreateSession };
