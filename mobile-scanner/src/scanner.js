const video = document.getElementById("video");
const startBtn = document.getElementById("startBtn");
const statusText = document.getElementById("statusText");
const scanResult = document.getElementById("scanResult");
const frame = document.getElementById("frame");

const sessionId = localStorage.getItem("easyqr_token");
let lastSent = null;
let locked = false;

const ws = new WebSocket(
  location.origin.replace("https", "wss")
);

const reader = new ZXing.BrowserMultiFormatReader();

ws.onopen = () => {
  ws.send(JSON.stringify({ type: "MOBILE_JOIN" }));
  statusText.innerText = "🟢 Connected";
};

ws.onmessage = (e) => {
  const msg = JSON.parse(e.data);
  if (msg.type === "ERROR") {
    statusText.innerText = "⚠️ Scan rejected";
    locked = false;
  }
};

startBtn.addEventListener("click", async () => {
  startBtn.style.display = "none";
  frame.classList.remove("hidden");
  statusText.innerText = "📷 Scanning…";

  await reader.decodeFromConstraints(
    { video: { facingMode: "environment" } },
    video,
    (res) => {
      if (!res || locked) return;

      if (res.text === lastSent) return;

      locked = true;
      lastSent = res.text;

      const payload = {
        sessionId,
        value: res.text,
        format: res.getBarcodeFormat(),
        timestamp: new Date().toISOString(),
        source: "mobile"
      };

      ws.send(JSON.stringify({ type: "SCAN", payload }));

      scanResult.innerText = res.text;
      statusText.innerText = "✅ Scan sent";
      navigator.vibrate?.(100);

      setTimeout(() => locked = false, 1500);
    }
  );
});
// 🔥 Task 2.7 — Invalid Payload Test
document.getElementById("sendInvalid").addEventListener("click", () => {
  const invalidPayload = {
    value: null,           // ❌ invalid
    format: 123,           // ❌ invalid
    timestamp: "INVALID",  // ❌ invalid
    // sessionId missing ❌
  };

  ws.send(JSON.stringify({
    type: "SCAN",
    payload: invalidPayload
  }));

  statusText.innerText = "❌ Invalid payload sent (test)";
});
