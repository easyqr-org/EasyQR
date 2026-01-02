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
        ws.send(JSON.stringify({ type: "ERROR", message: "Invalid JSON" }));
        return;
      }

      if (data.type === "DESKTOP_JOIN") {
        desktop = ws;
        desktop.send(JSON.stringify({ type: "DESKTOP_READY" }));

        const last = getLastScan();
        if (last) {
          desktop.send(JSON.stringify({ type: "SCAN", payload: last }));
        }
      }

      if (data.type === "MOBILE_JOIN") {
        mobile = ws;
        desktop?.send(JSON.stringify({ type: "MOBILE_CONNECTED" }));
      }

      if (data.type === "SCAN") {
        const accepted = saveScan(data.payload);

        if (!accepted) {
          ws.send(JSON.stringify({
            type: "ERROR",
            message: "Duplicate or invalid scan"
          }));
          return;
        }

        desktop?.send(JSON.stringify({
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
