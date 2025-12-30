// server/src/scanStore.js

const scans = [];

function saveScan(payload) {
  scans.push(payload);
}

function getAllScans() {
  return scans;
}

function clearScans() {
  scans.length = 0;
}

module.exports = {
  saveScan,
  getAllScans,
  clearScans
};
