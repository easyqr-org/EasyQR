// server/src/scanStore.js

const scans = [];
let lastHash = null;

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

function saveScan(payload) {
  if (!isValidPayload(payload)) {
    console.log("❌ Invalid scan payload rejected");
    return false;
  }

  const hash = getHash(payload);
  if (hash === lastHash) {
    console.log("🔁 Duplicate scan ignored");
    return false;
  }

  lastHash = hash;
  scans.push(payload);

  if (scans.length > 50) scans.shift();

  console.log("🗄 Scan stored:", payload.value);
  return true;
}

function getLastScan() {
  return scans.length ? scans[scans.length - 1] : null;
}

module.exports = {
  saveScan,
  getLastScan
};
