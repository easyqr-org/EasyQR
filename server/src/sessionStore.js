const express = require("express");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");
const jwt = require("jsonwebtoken");

const {
  createSession,
} = require("./sessionStore");

const app = express();
const PORT = 3000;
const JWT_SECRET = "easyqr_secret_key"; // move to env later

app.use(cors());
app.use(express.json());

// Health Check
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

// Create Session API
app.post("/create-session", (req, res) => {
  const sessionId = uuidv4();

  createSession(sessionId);

  const token = jwt.sign(
    { sessionId },
    JWT_SECRET,
    { expiresIn: "3m" }
  );

  res.status(201).json({
    sessionId,
    token,
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
