const test = require("node:test");
const assert = require("node:assert/strict");

const { buildConfig } = require("../src/config");

test("buildConfig accepts default memory backend", () => {
  const cfg = buildConfig({
    portRaw: "3000",
    ttlRaw: "180",
    jwtSecret: "very_strong_secret_123",
    storageBackendRaw: "memory",
    redisEnabledRaw: "false",
    instanceIdRaw: "inst-1",
  });

  assert.equal(cfg.storageBackend, "memory");
  assert.equal(cfg.redisEnabled, false);
});

test("buildConfig rejects postgres backend without DATABASE_URL", () => {
  assert.throws(
    () =>
      buildConfig({
        portRaw: "3000",
        ttlRaw: "180",
        jwtSecret: "very_strong_secret_123",
        storageBackendRaw: "postgres",
        databaseUrlRaw: "",
        redisEnabledRaw: "false",
        instanceIdRaw: "inst-1",
      }),
    /DATABASE_URL is required/
  );
});

test("buildConfig rejects redis enabled without REDIS_URL", () => {
  assert.throws(
    () =>
      buildConfig({
        portRaw: "3000",
        ttlRaw: "180",
        jwtSecret: "very_strong_secret_123",
        storageBackendRaw: "memory",
        redisEnabledRaw: "true",
        redisUrlRaw: "",
        instanceIdRaw: "inst-1",
      }),
    /REDIS_URL is required/
  );
});

test("buildConfig supports legacy STORAGE_BACKEND and REDIS_ENABLED aliases", () => {
  const prevStorage = process.env.STORAGE_BACKEND;
  const prevRedisEnabled = process.env.REDIS_ENABLED;
  const prevEasyqrStorage = process.env.EASYQR_STORAGE_BACKEND;
  const prevEasyqrRedisEnabled = process.env.EASYQR_REDIS_ENABLED;

  process.env.STORAGE_BACKEND = "postgres";
  process.env.REDIS_ENABLED = "true";
  delete process.env.EASYQR_STORAGE_BACKEND;
  delete process.env.EASYQR_REDIS_ENABLED;

  try {
    const cfg = buildConfig({
      portRaw: "3000",
      ttlRaw: "180",
      jwtSecret: "very_strong_secret_123",
      databaseUrlRaw: "postgres://easyqr:easyqr@localhost:5432/easyqr",
      redisUrlRaw: "redis://localhost:6379",
      instanceIdRaw: "inst-1",
    });
    assert.equal(cfg.storageBackend, "postgres");
    assert.equal(cfg.redisEnabled, true);
  } finally {
    if (prevStorage === undefined) delete process.env.STORAGE_BACKEND;
    else process.env.STORAGE_BACKEND = prevStorage;

    if (prevRedisEnabled === undefined) delete process.env.REDIS_ENABLED;
    else process.env.REDIS_ENABLED = prevRedisEnabled;

    if (prevEasyqrStorage === undefined) delete process.env.EASYQR_STORAGE_BACKEND;
    else process.env.EASYQR_STORAGE_BACKEND = prevEasyqrStorage;

    if (prevEasyqrRedisEnabled === undefined) delete process.env.EASYQR_REDIS_ENABLED;
    else process.env.EASYQR_REDIS_ENABLED = prevEasyqrRedisEnabled;
  }
});

test("buildConfig parses EASYQR_ALLOW_LEGACY_KEYS flag", () => {
  const disabled = buildConfig({
    portRaw: "3000",
    ttlRaw: "180",
    jwtSecret: "very_strong_secret_123",
    storageBackendRaw: "memory",
    redisEnabledRaw: "false",
    instanceIdRaw: "inst-1",
    allowLegacyKeysRaw: "false",
  });
  assert.equal(disabled.allowLegacyKeys, false);

  const enabled = buildConfig({
    portRaw: "3000",
    ttlRaw: "180",
    jwtSecret: "very_strong_secret_123",
    storageBackendRaw: "memory",
    redisEnabledRaw: "false",
    instanceIdRaw: "inst-1",
    allowLegacyKeysRaw: "true",
  });
  assert.equal(enabled.allowLegacyKeys, true);
});

test("buildConfig applies Wave 3 rate limit defaults", () => {
  const cfg = buildConfig({
    portRaw: "3000",
    ttlRaw: "180",
    jwtSecret: "very_strong_secret_123",
    storageBackendRaw: "memory",
    redisEnabledRaw: "false",
    instanceIdRaw: "inst-1",
  });

  assert.equal(cfg.rateLimitEnabled, true);
  assert.equal(cfg.rateLimitApiProjectPerMin, 60);
  assert.equal(cfg.rateLimitApiIpPerMin, 120);
  assert.equal(cfg.rateLimitWsProjectPerMin, 30);
  assert.equal(cfg.rateLimitWsIpPerMin, 60);
});

test("buildConfig applies Wave 3 rate limit overrides", () => {
  const cfg = buildConfig({
    portRaw: "3000",
    ttlRaw: "180",
    jwtSecret: "very_strong_secret_123",
    storageBackendRaw: "memory",
    redisEnabledRaw: "false",
    instanceIdRaw: "inst-1",
    rateLimitEnabledRaw: "false",
    rateLimitApiProjectPerMinRaw: "10",
    rateLimitApiIpPerMinRaw: "20",
    rateLimitWsProjectPerMinRaw: "5",
    rateLimitWsIpPerMinRaw: "15",
  });

  assert.equal(cfg.rateLimitEnabled, false);
  assert.equal(cfg.rateLimitApiProjectPerMin, 10);
  assert.equal(cfg.rateLimitApiIpPerMin, 20);
  assert.equal(cfg.rateLimitWsProjectPerMin, 5);
  assert.equal(cfg.rateLimitWsIpPerMin, 15);
});
