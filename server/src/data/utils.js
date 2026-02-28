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

function isSessionExpired(session) {
  if (!session) return true;
  return typeof session.expiresAt === "number" && Date.now() > session.expiresAt;
}

module.exports = {
  isValidScanPayload,
  getScanHash,
  isSessionExpired,
};
