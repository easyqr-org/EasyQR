const fs = require("fs");
const path = require("path");
const { randomUUID } = require("crypto");

function parseEnvFile(raw) {
  const out = {};
  const lines = raw.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const eqIdx = trimmed.indexOf("=");
    if (eqIdx <= 0) continue;

    const key = trimmed.slice(0, eqIdx).trim();
    let value = trimmed.slice(eqIdx + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    out[key] = value;
  }

  return out;
}

function loadLocalEnvIfPresent() {
  const envPath = path.join(__dirname, "../.env");
  if (!fs.existsSync(envPath)) return;

  const fileContent = fs.readFileSync(envPath, "utf8");
  const parsed = parseEnvFile(fileContent);

  for (const [key, value] of Object.entries(parsed)) {
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function parseProjectKeys(raw) {
  return (raw || "")
    .split(",")
    .map((pair) => pair.trim())
    .filter(Boolean)
    .reduce((acc, pair) => {
      const [projectId, key] = pair.split(":");
      if (projectId && key) acc[projectId] = key;
      return acc;
    }, {});
}

function parseAllowedOrigins(raw) {
  return (raw || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function buildConfig({
  portRaw = process.env.PORT || "3000",
  ttlRaw = process.env.SESSION_TTL_SECONDS || "180",
  jwtSecret = process.env.JWT_SECRET || "",
  allowedOriginsRaw = process.env.EASYQR_ALLOWED_ORIGINS,
  projectKeysRaw = process.env.EASYQR_PROJECT_KEYS,
  storageBackendRaw =
    process.env.EASYQR_STORAGE_BACKEND || process.env.STORAGE_BACKEND || "memory",
  databaseUrlRaw = process.env.DATABASE_URL || "",
  redisEnabledRaw =
    process.env.EASYQR_REDIS_ENABLED || process.env.REDIS_ENABLED || "false",
  redisUrlRaw = process.env.REDIS_URL || "",
  redisChannelRaw = process.env.EASYQR_REDIS_CHANNEL || "easyqr.events",
  instanceIdRaw = process.env.EASYQR_INSTANCE_ID || randomUUID(),
  adminTokenRaw = process.env.EASYQR_ADMIN_TOKEN || "",
  allowLegacyKeysRaw = process.env.EASYQR_ALLOW_LEGACY_KEYS || "true",
  rateLimitEnabledRaw = process.env.EASYQR_RATE_LIMIT_ENABLED || "true",
  rateLimitApiProjectPerMinRaw =
    process.env.EASYQR_RATE_LIMIT_API_PROJECT_PER_MIN || "60",
  rateLimitApiIpPerMinRaw = process.env.EASYQR_RATE_LIMIT_API_IP_PER_MIN || "120",
  rateLimitWsProjectPerMinRaw =
    process.env.EASYQR_RATE_LIMIT_WS_PROJECT_PER_MIN || "30",
  rateLimitWsIpPerMinRaw = process.env.EASYQR_RATE_LIMIT_WS_IP_PER_MIN || "60",
  shutdownTimeoutMsRaw = process.env.EASYQR_SHUTDOWN_TIMEOUT_MS || "15000",
  wsDrainGraceMsRaw = process.env.EASYQR_WS_DRAIN_GRACE_MS || "5000",
  startupReadyDelayMsRaw = process.env.EASYQR_STARTUP_READY_DELAY_MS || "0",
} = {}) {

  const port = Number(portRaw);
  const sessionTtlSeconds = Number(ttlRaw);
  const storageBackend = String(storageBackendRaw || "memory").trim().toLowerCase();
  const redisEnabled =
    String(redisEnabledRaw || "false").trim().toLowerCase() === "true";
  const databaseUrl = String(databaseUrlRaw || "").trim();
  const redisUrl = String(redisUrlRaw || "").trim();
  const redisChannel = String(redisChannelRaw || "easyqr.events").trim();
  const instanceId = String(instanceIdRaw || "").trim();
  const adminToken = String(adminTokenRaw || "").trim();
  const allowLegacyKeys =
    String(allowLegacyKeysRaw || "true").trim().toLowerCase() === "true";
  const rateLimitEnabled =
    String(rateLimitEnabledRaw || "true").trim().toLowerCase() === "true";
  const rateLimitApiProjectPerMin = Number(rateLimitApiProjectPerMinRaw);
  const rateLimitApiIpPerMin = Number(rateLimitApiIpPerMinRaw);
  const rateLimitWsProjectPerMin = Number(rateLimitWsProjectPerMinRaw);
  const rateLimitWsIpPerMin = Number(rateLimitWsIpPerMinRaw);
  const shutdownTimeoutMs = Number(shutdownTimeoutMsRaw);
  const wsDrainGraceMs = Number(wsDrainGraceMsRaw);
  const startupReadyDelayMs = Number(startupReadyDelayMsRaw);

  const errors = [];

  if (!Number.isInteger(port) || port <= 0) {
    errors.push("PORT must be a positive integer");
  }

  if (!Number.isFinite(sessionTtlSeconds) || sessionTtlSeconds <= 0) {
    errors.push("SESSION_TTL_SECONDS must be a positive number");
  }

  if (!jwtSecret || jwtSecret.length < 16) {
    errors.push("JWT_SECRET is required and must be at least 16 characters");
  }

  if (!["memory", "postgres"].includes(storageBackend)) {
    errors.push("EASYQR_STORAGE_BACKEND must be either 'memory' or 'postgres'");
  }

  if (storageBackend === "postgres" && !databaseUrl) {
    errors.push("DATABASE_URL is required when EASYQR_STORAGE_BACKEND=postgres");
  }

  if (redisEnabled && !redisUrl) {
    errors.push("REDIS_URL is required when EASYQR_REDIS_ENABLED=true");
  }

  if (!instanceId) {
    errors.push("EASYQR_INSTANCE_ID must not be empty");
  }

  if (!Number.isInteger(rateLimitApiProjectPerMin) || rateLimitApiProjectPerMin <= 0) {
    errors.push("EASYQR_RATE_LIMIT_API_PROJECT_PER_MIN must be a positive integer");
  }

  if (!Number.isInteger(rateLimitApiIpPerMin) || rateLimitApiIpPerMin <= 0) {
    errors.push("EASYQR_RATE_LIMIT_API_IP_PER_MIN must be a positive integer");
  }

  if (!Number.isInteger(rateLimitWsProjectPerMin) || rateLimitWsProjectPerMin <= 0) {
    errors.push("EASYQR_RATE_LIMIT_WS_PROJECT_PER_MIN must be a positive integer");
  }

  if (!Number.isInteger(rateLimitWsIpPerMin) || rateLimitWsIpPerMin <= 0) {
    errors.push("EASYQR_RATE_LIMIT_WS_IP_PER_MIN must be a positive integer");
  }

  if (!Number.isInteger(shutdownTimeoutMs) || shutdownTimeoutMs <= 0) {
    errors.push("EASYQR_SHUTDOWN_TIMEOUT_MS must be a positive integer");
  }

  if (!Number.isInteger(wsDrainGraceMs) || wsDrainGraceMs <= 0) {
    errors.push("EASYQR_WS_DRAIN_GRACE_MS must be a positive integer");
  }

  if (!Number.isInteger(startupReadyDelayMs) || startupReadyDelayMs < 0) {
    errors.push("EASYQR_STARTUP_READY_DELAY_MS must be a non-negative integer");
  }

  if (errors.length) {
    const error = new Error(
      `Invalid server configuration:\n- ${errors.join("\n- ")}`
    );
    error.statusCode = 500;
    throw error;
  }

  const allowedOrigins = parseAllowedOrigins(allowedOriginsRaw);
  const projectKeys = parseProjectKeys(projectKeysRaw);

  return {
    port,
    jwtSecret,
    sessionTtlSeconds,
    allowedOrigins,
    projectKeys,
    hasProjectKeys: Object.keys(projectKeys).length > 0,
    storageBackend,
    databaseUrl,
    redisEnabled,
    redisUrl,
    redisChannel,
    instanceId,
    adminToken,
    allowLegacyKeys,
    rateLimitEnabled,
    rateLimitApiProjectPerMin,
    rateLimitApiIpPerMin,
    rateLimitWsProjectPerMin,
    rateLimitWsIpPerMin,
    shutdownTimeoutMs,
    wsDrainGraceMs,
    startupReadyDelayMs,
  };
}

function loadConfig() {
  loadLocalEnvIfPresent();
  return buildConfig();
}

module.exports = { loadConfig, buildConfig };
