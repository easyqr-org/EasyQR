// server/src/scanStore.js

const scans = [];

function saveScan(payload) {
  scans.push(payload);

  // Keep only last 50 scans (memory safety)
  if (scans.length > 50) {
    scans.shift();
  }

  console.log("🗄 Scan stored:", payload.value);
}

function getLastScan() {
  return scans.length ? scans[scans.length - 1] : null;
}

module.exports = {
  saveScan,
  getLastScan
};
