const express = require("express");
const http = require("http");
const path = require("path");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");

const { startWebSocketServer } = require("./wsServer");
const { getAllScans, clearScans } = require("./scanStore");
const {
  createSession,
  SESSION_STATES,
} = require("./sessionStore");

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "easyqr_secret_key";
const SESSION_TTL_SECONDS = Number(process.env.SESSION_TTL_SECONDS || "180");

// Optional: comma-separated list like "projectA:secretA,projectB:secretB"
const PROJECT_KEYS = (process.env.EASYQR_PROJECT_KEYS || "")
  .split(",")
  .map((pair) => pair.trim())
  .filter(Boolean)
  .reduce((acc, pair) => {
    const [projectId, key] = pair.split(":");
    if (projectId && key) acc[projectId] = key;
    return acc;
  }, {});

const hasProjectKeys = Object.keys(PROJECT_KEYS).length > 0;

app.use(cors());
app.use(express.json());

// Health Check
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

// Serve UIs
app.use(express.static(path.join(__dirname, "../../desktop-app")));
app.use("/mobile", express.static(path.join(__dirname, "../../mobile-scanner")));
app.use(
  "/sdk",
  express.static(path.join(__dirname, "../public/sdk"), {
    index: false,
  })
);

// Desktop session route (serves the desktop UI shell)
app.get("/session/:sessionId", (req, res) => {
  res.sendFile(path.join(__dirname, "../../desktop-app/index.html"));
});

// Session creation API for integrators / SDK
app.post("/api/sessions", (req, res) => {
  const { projectId, apiKey, context, webhookUrl } = req.body || {};

  if (!projectId) {
    return res.status(400).json({ error: "projectId is required" });
  }

  if (hasProjectKeys) {
    const expectedKey = PROJECT_KEYS[projectId];
    if (!expectedKey || apiKey !== expectedKey) {
      return res.status(401).json({ error: "Invalid project credentials" });
    }
  }

  const sessionId = uuidv4();

  const session = createSession({
    sessionId,
    projectId,
    context: context || null,
    webhookUrl: webhookUrl || null,
    ttlSeconds: SESSION_TTL_SECONDS,
  });

  // Mark as pending desktop by default; will move through lifecycle via WS
  session.state = SESSION_STATES.PENDING_DESKTOP;

  const tokenPayload = {
    sid: sessionId,
    pid: projectId,
  };

  const wsToken = jwt.sign(tokenPayload, JWT_SECRET, {
    expiresIn: SESSION_TTL_SECONDS,
  });

  const baseUrl = `${req.protocol}://${req.get("host")}`;
  const desktopUrl = `${baseUrl}/session/${sessionId}?token=${encodeURIComponent(
    wsToken
  )}`;
  const mobileUrl = `${baseUrl}/mobile?sessionId=${encodeURIComponent(
    sessionId
  )}&token=${encodeURIComponent(wsToken)}`;

  res.status(201).json({
    sessionId,
    wsToken,
    desktopUrl,
    mobileUrl,
    expiresAt: session.expiresAt,
  });
});

// API — Fetch scan history (optionally per session)
app.get("/api/scans", (req, res) => {
  const { sessionId } = req.query;
  res.json(getAllScans(sessionId));
});

// API — Clear scans (optionally per session)
app.delete("/api/scans", (req, res) => {
  const { sessionId } = req.query;
  clearScans(sessionId);
  res.json({ status: "cleared" });
});

startWebSocketServer(server, { jwtSecret: JWT_SECRET, sessionTtlSeconds: SESSION_TTL_SECONDS });

server.listen(PORT, () => {
  console.log(`🚀 EasyQR running at http://localhost:${PORT}`);
  console.log("🖥 Desktop UI → /");
  console.log("📱 Mobile UI → /mobile");
});

