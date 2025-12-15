const WebSocket = require("ws");

const TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzZXNzaW9uSWQiOiJmYTk3MDY4MC04OTg1LTQ4MmUtODdlMC1lMTFlNTMwMjRhZTAiLCJpYXQiOjE3NjU4MTM0OTUsImV4cCI6MTc2NTgxNTI5NX0.Guhqfp7lvM3Qvj-S56VDhniEWAyfiMCRp0TPmAE2ULg";

const ws = new WebSocket("ws://localhost:3000");

ws.on("open", () => {
  console.log("🟢 Client connected to WebSocket");

  ws.send(
    JSON.stringify({
      token: TOKEN,
    })
  );
});

ws.on("message", (msg) => {
  console.log("FROM SERVER:", msg.toString());
});

ws.on("close", () => {
  console.log("🔴 WebSocket closed");
});

ws.on("error", (err) => {
  console.error("❌ WebSocket error:", err.message);
});
