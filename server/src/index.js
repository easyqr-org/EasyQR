const express = require("express");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");
const jwt = require("jsonwebtoken");
const http = require("http");

const { startWebSocketServer } = require("./wsServer");

const app = express();
const PORT = 3000;
const JWT_SECRET = "easyqr_secret_key";

// Middleware
app.use(cors());
app.use(express.json());

// Health
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Create Session
app.post("/create-session", (req, res) => {
  const sessionId = uuidv4();

  const token = jwt.sign(
    { sessionId },
    JWT_SECRET,
    { expiresIn: "30m" }
  );

  console.log(`🆕 Session created: ${sessionId}`);

  res.status(201).json({ sessionId, token });
});

// HTTP Server
const server = http.createServer(app);

// Start WebSocket Server
startWebSocketServer(server);

// Start everything
server.listen(PORT, () => {
  console.log(`🚀 Server + WebSocket running at http://localhost:${PORT}`);
});
