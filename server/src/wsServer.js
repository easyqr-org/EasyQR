const WebSocket = require("ws");
const jwt = require("jsonwebtoken");

const JWT_SECRET = "easyqr_secret_key";

function startWebSocketServer(server) {
  const wss = new WebSocket.Server({ server });

  wss.on("connection", (ws) => {
    console.log("🟡 WebSocket connection attempt");

    ws.on("message", (message) => {
      try {
        const data = JSON.parse(message);

        const { token } = data;

        if (!token) {
          ws.send(JSON.stringify({ error: "Token missing" }));
          ws.close();
          return;
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        ws.sessionId = decoded.sessionId;

        console.log(`🟢 Session CONNECTED: ${ws.sessionId}`);

        ws.send(
          JSON.stringify({
            type: "CONNECTED",
            sessionId: ws.sessionId,
          })
        );
      } catch (err) {
        console.log("🔴 Invalid WebSocket connection");
        ws.close();
      }
    });

    ws.on("close", () => {
      console.log("🔴 WebSocket disconnected");
    });
  });
}

module.exports = { startWebSocketServer };
