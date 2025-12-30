const WebSocket = require("ws");

let desktop = null;
let mobile = null;

function startWebSocketServer(server) {
  const wss = new WebSocket.Server({ server });

  wss.on("connection", (ws) => {
    ws.on("message", (msg) => {
      let data;
      try {
        data = JSON.parse(msg);
      } catch {
        return;
      }

      if (data.type === "DESKTOP_JOIN") {
        desktop = ws;
        desktop.send(JSON.stringify({ type: "DESKTOP_READY" }));
      }

      if (data.type === "MOBILE_JOIN") {
        mobile = ws;
        if (desktop) {
          desktop.send(JSON.stringify({ type: "MOBILE_CONNECTED" }));
        }
      }

      if (data.type === "SCAN" && data.payload && desktop) {
        desktop.send(JSON.stringify({
          type: "SCAN",
          payload: data.payload
        }));
      }
    });

    ws.on("close", () => {
      if (ws === desktop) desktop = null;
      if (ws === mobile) mobile = null;
    });
  });
}

module.exports = { startWebSocketServer };
