const express = require("express");
const http = require("http");
const path = require("path");
const { startWebSocketServer } = require("./wsServer");
const { getAllScans, clearScans } = require("./scanStore");

const app = express();
const server = http.createServer(app);

// Serve UIs
app.use(express.static(path.join(__dirname, "../../desktop-app")));
app.use("/mobile", express.static(path.join(__dirname, "../../mobile-scanner")));

// API — Fetch scan history
app.get("/api/scans", (req, res) => {
  res.json(getAllScans());
});

// API — Clear scans (optional)
app.delete("/api/scans", (req, res) => {
  clearScans();
  res.json({ status: "cleared" });
});

startWebSocketServer(server);

server.listen(3000, () => {
  console.log("🚀 EasyQR running at http://localhost:3000");
  console.log("🖥 Desktop UI → /");
  console.log("📱 Mobile UI → /mobile");
});
