const video = document.getElementById("video");
const startBtn = document.getElementById("startBtn");
const statusText = document.getElementById("statusText");
const scanResult = document.getElementById("scanResult");
const frame = document.getElementById("frame");

const sessionId = localStorage.getItem("easyqr_token");

const ws = new WebSocket(
  location.origin.replace("https", "wss")
);

const reader = new ZXing.BrowserMultiFormatReader();

ws.onopen = () => {
  statusText.innerText = "🟢 Connected to server";
};

startBtn.addEventListener("click", async () => {
  startBtn.style.display = "none";
  frame.classList.remove("hidden");
  statusText.innerText = "📷 Camera starting…";

  try {
    await reader.decodeFromConstraints(
      { video: { facingMode: "environment" } },
      video,
      (res) => {
        if (!res) return;

        const payload = {
          sessionId,
          value: res.text,
          format: res.getBarcodeFormat(),
          timestamp: new Date().toISOString(),
          source: "mobile",
        };

        ws.send(JSON.stringify({
          type: "SCAN",
          payload
        }));

        scanResult.innerText = res.text;
        statusText.innerText = "✅ Scan sent";
        navigator.vibrate?.(100);
        reader.reset();
      }
    );
  } catch {
    statusText.innerText = "❌ Camera blocked";
  }
});
