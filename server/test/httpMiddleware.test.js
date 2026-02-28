const test = require("node:test");
const assert = require("node:assert/strict");

const { requestContext } = require("../src/middleware/requestContext");
const { validateCreateSession } = require("../src/middleware/validateCreateSession");
const { notFoundHandler, errorHandler } = require("../src/middleware/errorHandlers");
const { AppError } = require("../src/errors");

function createMockRes() {
  const headers = {};
  let statusCode = 200;
  let jsonBody = null;

  return {
    setHeader(key, value) {
      headers[key.toLowerCase()] = value;
    },
    getHeader(key) {
      return headers[key.toLowerCase()];
    },
    status(code) {
      statusCode = code;
      return this;
    },
    json(payload) {
      jsonBody = payload;
      return this;
    },
    get statusCode() {
      return statusCode;
    },
    get body() {
      return jsonBody;
    },
  };
}

test("requestContext generates and sets request id", () => {
  const req = { headers: {} };
  const res = createMockRes();

  requestContext(req, res, () => {});

  assert.equal(typeof req.requestId, "string");
  assert.equal(res.getHeader("x-request-id"), req.requestId);
});

test("requestContext reuses incoming x-request-id", () => {
  const req = { headers: { "x-request-id": "req-123" } };
  const res = createMockRes();

  requestContext(req, res, () => {});

  assert.equal(req.requestId, "req-123");
  assert.equal(res.getHeader("x-request-id"), "req-123");
});

test("validateCreateSession rejects missing projectId with app error", () => {
  const req = { body: { apiKey: "x" } };
  const res = createMockRes();

  let capturedError = null;
  validateCreateSession(req, res, (err) => {
    capturedError = err;
  });

  assert.ok(capturedError instanceof AppError);
  assert.equal(capturedError.statusCode, 400);
  assert.equal(capturedError.code, "PROJECT_ID_REQUIRED");
});

test("validateCreateSession normalizes valid payload", () => {
  const req = {
    body: {
      projectId: "  demo  ",
      apiKey: "key",
      context: { itemId: "A1" },
      webhookUrl: "https://example.com/hook",
    },
  };
  const res = createMockRes();

  let nextCalled = false;
  validateCreateSession(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.equal(req.body.projectId, "demo");
  assert.equal(req.body.apiKey, "key");
  assert.deepEqual(req.body.context, { itemId: "A1" });
  assert.equal(req.body.webhookUrl, "https://example.com/hook");
});

test("notFoundHandler returns standardized error envelope", () => {
  const req = { requestId: "req-404" };
  const res = createMockRes();

  notFoundHandler(req, res);

  assert.equal(res.statusCode, 404);
  assert.deepEqual(res.body, {
    error: {
      code: "ROUTE_NOT_FOUND",
      message: "Route not found",
      requestId: "req-404",
    },
  });
});

test("errorHandler returns standardized client error envelope", () => {
  const req = { requestId: "req-400", method: "POST", originalUrl: "/api/sessions" };
  const res = createMockRes();

  const logger = { warn() {}, error() {} };
  const middleware = errorHandler(logger);
  middleware(
    new AppError({
      statusCode: 400,
      code: "INVALID_BODY",
      message: "Request body must be a JSON object",
    }),
    req,
    res,
    () => {}
  );

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.error.code, "INVALID_BODY");
  assert.equal(res.body.error.requestId, "req-400");
});

test("errorHandler masks unexpected errors as internal server error", () => {
  const req = { requestId: "req-500", method: "GET", originalUrl: "/boom" };
  const res = createMockRes();

  const logger = { warn() {}, error() {} };
  const middleware = errorHandler(logger);
  middleware(new Error("db exploded"), req, res, () => {});

  assert.equal(res.statusCode, 500);
  assert.equal(res.body.error.code, "INTERNAL_ERROR");
  assert.equal(res.body.error.message, "Internal server error");
  assert.equal(res.body.error.requestId, "req-500");
});
