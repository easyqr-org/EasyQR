const WebSocket = require("ws");
const { saveScan, getLastScan } = require("./scanStore");

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

      // Desktop joins
      if (data.type === "DESKTOP_JOIN") {
        desktop = ws;
        desktop.send(JSON.stringify({ type: "DESKTOP_READY" }));

        // 🔁 Replay last scan if exists
        const lastScan = getLastScan();
        if (lastScan) {
          desktop.send(JSON.stringify({
            type: "SCAN",
            payload: lastScan
          }));
        }
      }

      // Mobile joins
      if (data.type === "MOBILE_JOIN") {
        mobile = ws;
        if (desktop) {
          desktop.send(JSON.stringify({ type: "MOBILE_CONNECTED" }));
        }
      }

      // Scan received
      if (data.type === "SCAN" && data.payload) {
        saveScan(data.payload);

        if (desktop) {
          desktop.send(JSON.stringify({
            type: "SCAN",
            payload: data.payload
          }));
        }
      }
    });

    ws.on("close", () => {
      if (ws === desktop) desktop = null;
      if (ws === mobile) mobile = null;
    });
  });
}

module.exports = { startWebSocketServer };
