const crypto = require("crypto");

function generateApiKey() {
  return crypto.randomBytes(32).toString("hex");
}

function hashApiKey(rawKey) {
  return crypto.createHash("sha256").update(String(rawKey || "")).digest("hex");
}

function constantTimeEqual(a, b) {
  const aBuf = Buffer.from(String(a || ""), "utf8");
  const bBuf = Buffer.from(String(b || ""), "utf8");
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

function verifyApiKey(rawKey, storedHash) {
  const hashed = hashApiKey(rawKey);
  return constantTimeEqual(hashed, storedHash);
}

module.exports = {
  generateApiKey,
  hashApiKey,
  constantTimeEqual,
  verifyApiKey,
};
