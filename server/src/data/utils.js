function isValidScanPayload(p) {
  return (
    p &&
    typeof p.sessionId === "string" &&
    typeof p.value === "string" &&
    typeof p.format === "string" &&
    typeof p.timestamp === "string"
  );
}

function getScanHash(payload) {
  return `${payload.sessionId}:${payload.value}:${payload.format}`;
}

function getScanIdentity(payload) {
  if (!payload) return "";
  return `${payload.value}:${payload.format}`;
}

function getScanTimestampMs(payload) {
  const timestamp = payload?.timestamp;
  const parsed = Date.parse(timestamp);
  return Number.isFinite(parsed) ? parsed : null;
}

function isDuplicateScanWithinWindow(currentPayload, previousPayload, windowMs = 1500) {
  if (!currentPayload || !previousPayload) return false;
  if (getScanIdentity(currentPayload) !== getScanIdentity(previousPayload)) {
    return false;
  }

  const currentTimestampMs = getScanTimestampMs(currentPayload);
  const previousTimestampMs = getScanTimestampMs(previousPayload);
  if (currentTimestampMs === null || previousTimestampMs === null) {
    return false;
  }

  return Math.abs(currentTimestampMs - previousTimestampMs) <= windowMs;
}

function isSessionExpired(session) {
  if (!session) return true;
  return typeof session.expiresAt === "number" && Date.now() > session.expiresAt;
}

module.exports = {
  isValidScanPayload,
  getScanHash,
  getScanIdentity,
  getScanTimestampMs,
  isDuplicateScanWithinWindow,
  isSessionExpired,
};
