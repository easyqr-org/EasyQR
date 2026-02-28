const test = require("node:test");
const assert = require("node:assert/strict");

const { createApp } = require("../src/index");
const { createMemoryStore } = require("../src/data/memoryStore");
const { createLogger } = require("../src/logger");
const { checkWsHandshakeRateLimit } = require("../src/wsServer");

class FakeRedis {
  constructor() {
    this.counts = new Map();
    this.ttls = new Map();
    this.fail = false;
  }

  async incr(key) {
    if (this.fail) throw new Error("redis failure");
    const next = (this.counts.get(key) || 0) + 1;
    this.counts.set(key, next);
    return next;
  }

  async expire(key, sec) {
    if (this.fail) throw new Error("redis failure");
    this.ttls.set(key, sec);
    return 1;
  }

  async ttl(key) {
    if (this.fail) throw new Error("redis failure");
    return this.ttls.get(key) || 60;
  }

  async quit() {}
}

function createMockReq({ method, path, query = {}, body = null, headers = {} }) {
  const lower = {};
  for (const [k, v] of Object.entries(headers)) lower[k.toLowerCase()] = v;
  return {
    method,
    path,
    originalUrl: path,
    query,
    body,
    headers: lower,
    requestId: "rl-test-request",
    ip: headers.ip || "127.0.0.1",
    socket: { remoteAddress: headers.ip || "127.0.0.1" },
    protocol: "http",
    get(name) {
      const key = String(name || "").toLowerCase();
      if (key === "host") return "localhost:3000";
      return lower[key] || null;
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
      headers[String(name).toLowerCase()] = value;
    },
    getHeader(name) {
      return headers[String(name).toLowerCase()];
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
  const layer = app._router.stack
    .filter((l) => l.route)
    .find(
      (l) => l.route.path === path && l.route.methods[method.toLowerCase()]
    );
  if (!layer) throw new Error(`Route not found: ${method} ${path}`);
  return layer.route.stack.map((s) => s.handle);
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

async function buildRateLimitedApp(overrides = {}) {
  const store = createMemoryStore();
  const redis = new FakeRedis();
  const app = createApp(
    {
      allowedOrigins: [],
      projectKeys: {},
      hasProjectKeys: false,
      sessionTtlSeconds: 600,
      jwtSecret: "very_strong_secret_123",
      adminToken: "admin-token",
      redisEnabled: false,
      allowLegacyKeys: true,
      rateLimitEnabled: true,
      rateLimitApiProjectPerMin: 2,
      rateLimitApiIpPerMin: 5,
      ...overrides,
    },
    createLogger({ service: "rate-limit-test" }),
    {
      mode: "memory",
      sessionStore: store,
      scanStore: store,
      rateLimitRedisClient: redis,
    }
  );

  return { app, store, redis };
}

test("project exceeds limit returns 429", async () => {
  const { app, store } = await buildRateLimitedApp({
    rateLimitApiProjectPerMin: 1,
    rateLimitApiIpPerMin: 10,
  });
  const key = await store.createOrRotateApiKey("project-rl");
  const handlers = getRouteHandlers(app, "GET", "/api/scans");

  const req1 = createMockReq({
    method: "GET",
    path: "/api/scans",
    headers: { "x-project-id": "project-rl", "x-api-key": key.apiKey, ip: "1.1.1.1" },
  });
  const res1 = createMockRes();
  await runHandlers(handlers, req1, res1);
  assert.equal(res1.statusCode, 200);

  const req2 = createMockReq({
    method: "GET",
    path: "/api/scans",
    headers: { "x-project-id": "project-rl", "x-api-key": key.apiKey, ip: "1.1.1.1" },
  });
  const res2 = createMockRes();
  await runHandlers(handlers, req2, res2);
  assert.equal(res2.statusCode, 429);
  assert.equal(res2.body.error, "RATE_LIMIT_EXCEEDED");
  assert.equal(res2.body.scope, "project");
});

test("ip exceeds limit returns 429", async () => {
  const { app, store } = await buildRateLimitedApp({
    rateLimitApiProjectPerMin: 10,
    rateLimitApiIpPerMin: 1,
  });
  const keyA = await store.createOrRotateApiKey("project-a");
  const keyB = await store.createOrRotateApiKey("project-b");
  const handlers = getRouteHandlers(app, "GET", "/api/scans");

  const req1 = createMockReq({
    method: "GET",
    path: "/api/scans",
    headers: { "x-project-id": "project-a", "x-api-key": keyA.apiKey, ip: "2.2.2.2" },
  });
  const res1 = createMockRes();
  await runHandlers(handlers, req1, res1);
  assert.equal(res1.statusCode, 200);

  const req2 = createMockReq({
    method: "GET",
    path: "/api/scans",
    headers: { "x-project-id": "project-b", "x-api-key": keyB.apiKey, ip: "2.2.2.2" },
  });
  const res2 = createMockRes();
  await runHandlers(handlers, req2, res2);
  assert.equal(res2.statusCode, 429);
  assert.equal(res2.body.scope, "ip");
});

test("below thresholds succeeds", async () => {
  const { app, store } = await buildRateLimitedApp({
    rateLimitApiProjectPerMin: 5,
    rateLimitApiIpPerMin: 5,
  });
  const key = await store.createOrRotateApiKey("project-ok");
  const handlers = getRouteHandlers(app, "GET", "/api/scans");

  const req = createMockReq({
    method: "GET",
    path: "/api/scans",
    headers: { "x-project-id": "project-ok", "x-api-key": key.apiKey, ip: "3.3.3.3" },
  });
  const res = createMockRes();
  await runHandlers(handlers, req, res);
  assert.equal(res.statusCode, 200);
});

test("window reset after 60 seconds allows requests again", async () => {
  const originalNow = Date.now;
  let now = 1708704000000;
  Date.now = () => now;
  try {
    const { app, store } = await buildRateLimitedApp({
      rateLimitApiProjectPerMin: 1,
      rateLimitApiIpPerMin: 10,
    });
    const key = await store.createOrRotateApiKey("project-reset");
    const handlers = getRouteHandlers(app, "GET", "/api/scans");

    const req1 = createMockReq({
      method: "GET",
      path: "/api/scans",
      headers: {
        "x-project-id": "project-reset",
        "x-api-key": key.apiKey,
        ip: "4.4.4.4",
      },
    });
    const res1 = createMockRes();
    await runHandlers(handlers, req1, res1);
    assert.equal(res1.statusCode, 200);

    const req2 = createMockReq({
      method: "GET",
      path: "/api/scans",
      headers: {
        "x-project-id": "project-reset",
        "x-api-key": key.apiKey,
        ip: "4.4.4.4",
      },
    });
    const res2 = createMockRes();
    await runHandlers(handlers, req2, res2);
    assert.equal(res2.statusCode, 429);

    now += 61000;
    const req3 = createMockReq({
      method: "GET",
      path: "/api/scans",
      headers: {
        "x-project-id": "project-reset",
        "x-api-key": key.apiKey,
        ip: "4.4.4.4",
      },
    });
    const res3 = createMockRes();
    await runHandlers(handlers, req3, res3);
    assert.equal(res3.statusCode, 200);
  } finally {
    Date.now = originalNow;
  }
});

test("degraded mode allows request when redis throws", async () => {
  const { app, store, redis } = await buildRateLimitedApp({
    rateLimitApiProjectPerMin: 1,
    rateLimitApiIpPerMin: 1,
  });
  redis.fail = true;
  const key = await store.createOrRotateApiKey("project-degraded");
  const handlers = getRouteHandlers(app, "GET", "/api/scans");

  const req = createMockReq({
    method: "GET",
    path: "/api/scans",
    headers: {
      "x-project-id": "project-degraded",
      "x-api-key": key.apiKey,
      ip: "5.5.5.5",
    },
  });
  const res = createMockRes();
  await runHandlers(handlers, req, res);
  assert.equal(res.statusCode, 200);
});

test("WS project limit exceeded returns denied decision", async () => {
  const redis = new FakeRedis();
  await checkWsHandshakeRateLimit({
    rateLimitEnabled: true,
    redisClient: redis,
    projectId: "ws-project-a",
    ip: "8.8.8.8",
    rateLimitWsProjectPerMin: 1,
    rateLimitWsIpPerMin: 100,
    logger: createLogger({ service: "ws-rl-test" }),
    createAuditLog: async () => {},
    rateLimitState: { degraded: false },
  });

  const denied = await checkWsHandshakeRateLimit({
    rateLimitEnabled: true,
    redisClient: redis,
    projectId: "ws-project-a",
    ip: "8.8.8.8",
    rateLimitWsProjectPerMin: 1,
    rateLimitWsIpPerMin: 100,
    logger: createLogger({ service: "ws-rl-test" }),
    createAuditLog: async () => {},
    rateLimitState: { degraded: false },
  });

  assert.equal(denied.allowed, false);
  assert.equal(denied.scope, "project");
});

test("WS IP limit exceeded returns denied decision", async () => {
  const redis = new FakeRedis();
  await checkWsHandshakeRateLimit({
    rateLimitEnabled: true,
    redisClient: redis,
    projectId: "ws-project-a",
    ip: "9.9.9.9",
    rateLimitWsProjectPerMin: 100,
    rateLimitWsIpPerMin: 1,
    logger: createLogger({ service: "ws-rl-test" }),
    createAuditLog: async () => {},
    rateLimitState: { degraded: false },
  });

  const denied = await checkWsHandshakeRateLimit({
    rateLimitEnabled: true,
    redisClient: redis,
    projectId: "ws-project-b",
    ip: "9.9.9.9",
    rateLimitWsProjectPerMin: 100,
    rateLimitWsIpPerMin: 1,
    logger: createLogger({ service: "ws-rl-test" }),
    createAuditLog: async () => {},
    rateLimitState: { degraded: false },
  });

  assert.equal(denied.allowed, false);
  assert.equal(denied.scope, "ip");
});

test("WS below threshold returns allowed decision", async () => {
  const redis = new FakeRedis();
  const allowed = await checkWsHandshakeRateLimit({
    rateLimitEnabled: true,
    redisClient: redis,
    projectId: "ws-project-ok",
    ip: "10.10.10.10",
    rateLimitWsProjectPerMin: 5,
    rateLimitWsIpPerMin: 5,
    logger: createLogger({ service: "ws-rl-test" }),
    createAuditLog: async () => {},
    rateLimitState: { degraded: false },
  });

  assert.equal(allowed.allowed, true);
});

test("WS degraded mode allows when redis fails", async () => {
  const redis = new FakeRedis();
  redis.fail = true;
  const state = { degraded: false };
  const allowed = await checkWsHandshakeRateLimit({
    rateLimitEnabled: true,
    redisClient: redis,
    projectId: "ws-project-degraded",
    ip: "11.11.11.11",
    rateLimitWsProjectPerMin: 1,
    rateLimitWsIpPerMin: 1,
    logger: createLogger({ service: "ws-rl-test" }),
    createAuditLog: async () => {},
    rateLimitState: state,
  });

  assert.equal(allowed.allowed, true);
  assert.equal(state.degraded, true);
});
