// server/src/scanStore.js
//
// In-memory, session-scoped scan storage and validation.

// Map<sessionId, ScanPayload[]>
const scansBySession = new Map();
// Map<sessionId, string> (hash of last scan)
const lastHashBySession = new Map();

function isValidPayload(p) {
  return (
    p &&
    typeof p.sessionId === "string" &&
    typeof p.value === "string" &&
    typeof p.format === "string" &&
    typeof p.timestamp === "string"
  );
}

function getHash(p) {
  return `${p.sessionId}:${p.value}:${p.format}`;
}

function saveScan(sessionId, payload) {
  if (!isValidPayload(payload)) {
    console.log("❌ Invalid scan payload rejected");
    return false;
  }

  if (payload.sessionId !== sessionId) {
    console.log("❌ Session mismatch in scan payload");
    return false;
  }

  const hash = getHash(payload);
  const lastHash = lastHashBySession.get(sessionId) || null;

  if (hash === lastHash) {
    console.log("🔁 Duplicate scan ignored");
    return false;
  }

  lastHashBySession.set(sessionId, hash);

  const arr = scansBySession.get(sessionId) || [];
  arr.push(payload);
  if (arr.length > 50) arr.shift();
  scansBySession.set(sessionId, arr);

  console.log("🗄 Scan stored:", payload.value, "for session", sessionId);
  return true;
}

function getLastScan(sessionId) {
  const arr = scansBySession.get(sessionId);
  if (!arr || !arr.length) return null;
  return arr[arr.length - 1];
}

function getAllScans(sessionId) {
  if (sessionId) {
    return scansBySession.get(sessionId) || [];
  }

  // Flatten all sessions when no sessionId is provided (debug/ops use only)
  const all = [];
  for (const [, list] of scansBySession.entries()) {
    all.push(...list);
  }
  return all;
}

function clearScans(sessionId) {
  if (sessionId) {
    scansBySession.delete(sessionId);
    lastHashBySession.delete(sessionId);
  } else {
    scansBySession.clear();
    lastHashBySession.clear();
  }
}

module.exports = {
  saveScan,
  getLastScan,
  getAllScans,
  clearScans,
};

