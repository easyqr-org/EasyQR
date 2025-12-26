const express = require("express");
const http = require("http");
const path = require("path");
const { startWebSocketServer } = require("./wsServer");

const app = express();
const server = http.createServer(app);

app.use(express.static(path.join(__dirname, "../../desktop-app")));
app.use("/mobile", express.static(path.join(__dirname, "../../mobile-scanner")));

startWebSocketServer(server);

server.listen(3000, () => {
  console.log("🚀 EasyQR running at http://localhost:3000");
  console.log("🖥 Desktop UI → /");
  console.log("📱 Mobile UI → /mobile");
});
