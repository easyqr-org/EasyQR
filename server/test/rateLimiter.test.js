const test = require("node:test");
const assert = require("node:assert/strict");

const {
  checkFixedWindowLimit,
  checkApiProjectLimit,
  checkApiIpLimit,
  checkWsProjectLimit,
  checkWsIpLimit,
} = require("../src/security/rateLimiter");

class FakeRedis {
  constructor() {
    this.counts = new Map();
    this.ttls = new Map();
    this.throwError = false;
  }

  async incr(key) {
    if (this.throwError) throw new Error("redis down");
    const next = (this.counts.get(key) || 0) + 1;
    this.counts.set(key, next);
    return next;
  }

  async expire(key, seconds) {
    if (this.throwError) throw new Error("redis down");
    this.ttls.set(key, seconds);
    return 1;
  }

  async ttl(key) {
    if (this.throwError) throw new Error("redis down");
    if (!this.ttls.has(key)) return -1;
    return this.ttls.get(key);
  }
}

test("below threshold is allowed", async () => {
  const redis = new FakeRedis();
  const result = await checkFixedWindowLimit({
    redisClient: redis,
    key: "rl:test:project:a",
    limitPerMinute: 3,
  });

  assert.equal(result.allowed, true);
  assert.equal(result.remaining, 2);
  assert.equal(result.retryAfterSec, 0);
});

test("exceed threshold is denied", async () => {
  const redis = new FakeRedis();
  await checkFixedWindowLimit({
    redisClient: redis,
    key: "rl:test:project:b",
    limitPerMinute: 2,
  });
  await checkFixedWindowLimit({
    redisClient: redis,
    key: "rl:test:project:b",
    limitPerMinute: 2,
  });
  const denied = await checkFixedWindowLimit({
    redisClient: redis,
    key: "rl:test:project:b",
    limitPerMinute: 2,
  });

  assert.equal(denied.allowed, false);
  assert.equal(denied.remaining, 0);
});

test("remaining decreases correctly", async () => {
  const redis = new FakeRedis();
  const r1 = await checkApiProjectLimit(redis, "proj-1", 4);
  const r2 = await checkApiProjectLimit(redis, "proj-1", 4);
  const r3 = await checkApiProjectLimit(redis, "proj-1", 4);

  assert.equal(r1.remaining, 3);
  assert.equal(r2.remaining, 2);
  assert.equal(r3.remaining, 1);
});

test("retryAfterSec is > 0 when denied", async () => {
  const redis = new FakeRedis();
  await checkWsProjectLimit(redis, "proj-2", 1);
  const denied = await checkWsProjectLimit(redis, "proj-2", 1);

  assert.equal(denied.allowed, false);
  assert.ok(denied.retryAfterSec > 0);
});

test("separate project keys do not interfere", async () => {
  const redis = new FakeRedis();
  await checkApiProjectLimit(redis, "project-a", 1);
  const projectA2 = await checkApiProjectLimit(redis, "project-a", 1);
  const projectB1 = await checkApiProjectLimit(redis, "project-b", 1);

  assert.equal(projectA2.allowed, false);
  assert.equal(projectB1.allowed, true);
});

test("separate IP keys do not interfere", async () => {
  const redis = new FakeRedis();
  await checkApiIpLimit(redis, "10.0.0.1", 1);
  const ip1Second = await checkApiIpLimit(redis, "10.0.0.1", 1);
  const ip2First = await checkWsIpLimit(redis, "10.0.0.2", 1);

  assert.equal(ip1Second.allowed, false);
  assert.equal(ip2First.allowed, true);
});

test("redis failure returns degraded allow response", async () => {
  const redis = new FakeRedis();
  redis.throwError = true;

  const result = await checkFixedWindowLimit({
    redisClient: redis,
    key: "rl:test:project:fail",
    limitPerMinute: 5,
  });

  assert.equal(result.allowed, true);
  assert.equal(result.remaining, null);
  assert.equal(result.retryAfterSec, 0);
  assert.equal(result.degraded, true);
});
