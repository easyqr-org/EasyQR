const test = require("node:test");
const assert = require("node:assert/strict");

const { createApp } = require("../src/index");
const { createLogger } = require("../src/logger");
const { createMemoryStore } = require("../src/data/memoryStore");

function createMockReq({ method, path, body = null, params = {}, query = {} }) {
  const headers = {};
  return {
    method,
    path,
    originalUrl: path,
    body,
    params,
    query,
    headers,
    requestId: "test-request-id",
    ip: "127.0.0.1",
    protocol: "http",
    socket: { remoteAddress: "127.0.0.1" },
    setHeader(name, value) {
      headers[name.toLowerCase()] = value;
    },
    get(name) {
      const key = name.toLowerCase();
      if (key === "host") return "localhost:3000";
      return headers[key] || null;
    },
  };
}

function createMockRes() {
  const headers = {};
  let statusCode = 200;
  let body = null;
  let finished = false;

  return {
    setHeader(name, value) {
      headers[name.toLowerCase()] = value;
    },
    getHeader(name) {
      return headers[name.toLowerCase()];
    },
    status(code) {
      statusCode = code;
      return this;
    },
    json(payload) {
      body = payload;
      finished = true;
      return this;
    },
    send(payload) {
      body = payload;
      finished = true;
      return this;
    },
    get statusCode() {
      return statusCode;
    },
    get body() {
      return body;
    },
    get finished() {
      return finished;
    },
  };
}

function getRouteHandlers(app, method, path) {
  const layers = app._router.stack.filter((l) => l.route);
  const routeLayer = layers.find(
    (l) => l.route.path === path && l.route.methods[method.toLowerCase()]
  );
  if (!routeLayer) {
    throw new Error(`Route not found: ${method} ${path}`);
  }
  return routeLayer.route.stack.map((s) => s.handle);
}

async function runHandlers(handlers, req, res) {
  for (const handler of handlers) {
    await new Promise((resolve, reject) => {
      let settled = false;
      const next = (err) => {
        if (settled) return;
        settled = true;
        if (err) reject(err);
        else resolve();
      };

      try {
        const out = handler(req, res, next);
        if (out && typeof out.then === "function") {
          out.then(() => {
            if (!settled) {
              settled = true;
              resolve();
            }
          }).catch(reject);
          return;
        }
        if (!settled) {
          settled = true;
          resolve();
        }
      } catch (error) {
        reject(error);
      }
    });

    if (res.finished) break;
  }
}

function buildApp(configOverrides = {}) {
  const store = createMemoryStore();
  const logger = createLogger({ service: "test-service" });
  const app = createApp(
    {
      allowedOrigins: [],
      projectKeys: {},
      hasProjectKeys: false,
      sessionTtlSeconds: 300,
      jwtSecret: "very_strong_secret_123",
      adminToken: "admin-token",
      redisEnabled: false,
      allowLegacyKeys: true,
      ...configOverrides,
    },
    logger,
    {
      mode: "memory",
      sessionStore: store,
      scanStore: store,
    }
  );

  return { app, store };
}

test("rotated key remains valid until revoked and revoked key fails", async () => {
  const { store } = buildApp();

  const first = await store.createOrRotateApiKey("proj-sec");
  const second = await store.createOrRotateApiKey("proj-sec");

  const v1Before = await store.verifyProjectApiKey("proj-sec", first.apiKey);
  const v2Before = await store.verifyProjectApiKey("proj-sec", second.apiKey);
  assert.equal(v1Before.valid, true);
  assert.equal(v2Before.valid, true);

  await store.revokeApiKey("proj-sec", first.version);
  const v1After = await store.verifyProjectApiKey("proj-sec", first.apiKey);
  const v2After = await store.verifyProjectApiKey("proj-sec", second.apiKey);

  assert.equal(v1After.valid, false);
  assert.equal(v2After.valid, true);
});

test("rotate and revoke endpoints create audit entries", async () => {
  const { app, store } = buildApp();

  // seed first key as created key.
  await store.createOrRotateApiKey("proj-audit");

  const rotateHandlers = getRouteHandlers(app, "POST", "/api/projects/:id/keys/rotate");
  const rotateReq = createMockReq({
    method: "POST",
    path: "/api/projects/proj-audit/keys/rotate",
    params: { id: "proj-audit" },
  });
  const rotateRes = createMockRes();
  await runHandlers(rotateHandlers, rotateReq, rotateRes);
  assert.equal(rotateRes.statusCode, 201);
  assert.equal(typeof rotateRes.body.apiKey, "string");

  const revokeHandlers = getRouteHandlers(
    app,
    "POST",
    "/api/projects/:id/keys/:version/revoke"
  );
  const revokeReq = createMockReq({
    method: "POST",
    path: "/api/projects/proj-audit/keys/2/revoke",
    params: { id: "proj-audit", version: "2" },
  });
  const revokeRes = createMockRes();
  await runHandlers(revokeHandlers, revokeReq, revokeRes);
  assert.equal(revokeRes.statusCode, 200);

  const audit = await store.getAuditLogs({
    projectId: "proj-audit",
    limit: 20,
    offset: 0,
  });
  const events = audit.items.map((e) => e.eventType);
  assert.ok(events.includes("API_KEY_ROTATED"));
  assert.ok(events.includes("API_KEY_REVOKED"));
});

test("failed auth writes AUTH_FAILURE audit event", async () => {
  const { app, store } = buildApp();
  await store.createOrRotateApiKey("proj-auth");

  const handlers = getRouteHandlers(app, "POST", "/api/sessions");
  const req = createMockReq({
    method: "POST",
    path: "/api/sessions",
    body: {
      projectId: "proj-auth",
      apiKey: "incorrect-key",
      context: { itemId: "X-1" },
      webhookUrl: null,
    },
  });
  const res = createMockRes();

  let err = null;
  try {
    await runHandlers(handlers, req, res);
  } catch (e) {
    err = e;
  }

  assert.ok(err);
  assert.equal(err.code, "INVALID_PROJECT_CREDENTIALS");

  const audit = await store.getAuditLogs({
    projectId: "proj-auth",
    eventType: "AUTH_FAILURE",
    limit: 10,
    offset: 0,
  });
  assert.equal(audit.total, 1);
  assert.equal(audit.items[0].eventType, "AUTH_FAILURE");
});

test("cross-tenant session access is rejected with 403", async () => {
  const { app, store } = buildApp();
  await store.createOrRotateApiKey("tenant-A");
  const keyB = await store.createOrRotateApiKey("tenant-B");

  const s = await store.createSession({
    sessionId: "session-a-1",
    projectId: "tenant-A",
    ttlSeconds: 120,
  });
  await store.setSessionState(s.id, "ACTIVE");

  const handlers = getRouteHandlers(app, "GET", "/api/scans");
  const req = createMockReq({
    method: "GET",
    path: "/api/scans",
    query: { sessionId: "session-a-1" },
  });
  req.setHeader("x-project-id", "tenant-B");
  req.setHeader("x-api-key", keyB.apiKey);
  const res = createMockRes();

  let err = null;
  try {
    await runHandlers(handlers, req, res);
  } catch (e) {
    err = e;
  }

  assert.ok(err);
  assert.equal(err.statusCode, 403);
});

test("valid tenant access to own session scans succeeds", async () => {
  const { app, store } = buildApp();
  const keyA = await store.createOrRotateApiKey("tenant-A");
  await store.createSession({
    sessionId: "session-a-2",
    projectId: "tenant-A",
    ttlSeconds: 120,
  });

  const handlers = getRouteHandlers(app, "GET", "/api/scans");
  const req = createMockReq({
    method: "GET",
    path: "/api/scans",
    query: { sessionId: "session-a-2" },
  });
  req.setHeader("x-project-id", "tenant-A");
  req.setHeader("x-api-key", keyA.apiKey);
  const res = createMockRes();

  await runHandlers(handlers, req, res);
  assert.equal(res.statusCode, 200);
  assert.ok(Array.isArray(res.body));
});

test("expired session scan query is rejected", async () => {
  const { app, store } = buildApp();
  const key = await store.createOrRotateApiKey("tenant-exp");
  await store.createSession({
    sessionId: "session-exp-1",
    projectId: "tenant-exp",
    ttlSeconds: -1,
  });

  const handlers = getRouteHandlers(app, "GET", "/api/scans");
  const req = createMockReq({
    method: "GET",
    path: "/api/scans",
    query: { sessionId: "session-exp-1" },
  });
  req.setHeader("x-project-id", "tenant-exp");
  req.setHeader("x-api-key", key.apiKey);
  const res = createMockRes();

  let err = null;
  try {
    await runHandlers(handlers, req, res);
  } catch (e) {
    err = e;
  }

  assert.ok(err);
  assert.equal(err.statusCode, 410);
  assert.equal(err.code, "SESSION_EXPIRED");
});

test("admin audit endpoint requires valid admin token", async () => {
  const { app } = buildApp();
  const handlers = getRouteHandlers(app, "GET", "/api/admin/audit");

  const missingReq = createMockReq({
    method: "GET",
    path: "/api/admin/audit",
    query: {},
  });
  const missingRes = createMockRes();
  let missingErr = null;
  try {
    await runHandlers(handlers, missingReq, missingRes);
  } catch (e) {
    missingErr = e;
  }
  assert.ok(missingErr);
  assert.equal(missingErr.statusCode, 401);

  const invalidReq = createMockReq({
    method: "GET",
    path: "/api/admin/audit",
    query: {},
  });
  invalidReq.setHeader("x-admin-token", "wrong");
  const invalidRes = createMockRes();
  let invalidErr = null;
  try {
    await runHandlers(handlers, invalidReq, invalidRes);
  } catch (e) {
    invalidErr = e;
  }
  assert.ok(invalidErr);
  assert.equal(invalidErr.statusCode, 401);

  const validReq = createMockReq({
    method: "GET",
    path: "/api/admin/audit",
    query: {},
  });
  validReq.setHeader("x-admin-token", "admin-token");
  const validRes = createMockRes();
  await runHandlers(handlers, validReq, validRes);
  assert.equal(validRes.statusCode, 200);
  assert.equal(Array.isArray(validRes.body.items), true);
});

test("legacy key fallback obeys EASYQR_ALLOW_LEGACY_KEYS flag", async () => {
  const legacyProject = "legacy-tenant";

  const disabled = buildApp({
    hasProjectKeys: true,
    projectKeys: { [legacyProject]: "legacy-secret" },
    allowLegacyKeys: false,
  });
  const sessionHandlersDisabled = getRouteHandlers(disabled.app, "POST", "/api/sessions");
  const reqDisabled = createMockReq({
    method: "POST",
    path: "/api/sessions",
    body: { projectId: legacyProject, apiKey: "legacy-secret" },
  });
  const resDisabled = createMockRes();
  let errDisabled = null;
  try {
    await runHandlers(sessionHandlersDisabled, reqDisabled, resDisabled);
  } catch (e) {
    errDisabled = e;
  }
  assert.ok(errDisabled);
  assert.equal(errDisabled.statusCode, 401);

  const enabled = buildApp({
    hasProjectKeys: true,
    projectKeys: { [legacyProject]: "legacy-secret" },
    allowLegacyKeys: true,
  });
  const sessionHandlersEnabled = getRouteHandlers(enabled.app, "POST", "/api/sessions");
  const reqEnabled = createMockReq({
    method: "POST",
    path: "/api/sessions",
    body: { projectId: legacyProject, apiKey: "legacy-secret" },
  });
  const resEnabled = createMockRes();
  await runHandlers(sessionHandlersEnabled, reqEnabled, resEnabled);
  assert.equal(resEnabled.statusCode, 201);
});
