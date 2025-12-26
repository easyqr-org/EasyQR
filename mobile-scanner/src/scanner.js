const video = document.getElementById("video");
const startBtn = document.getElementById("startBtn");
const statusText = document.getElementById("statusText");
const scanResult = document.getElementById("scanResult");
const frame = document.getElementById("frame");

const token = localStorage.getItem("easyqr_token");

const ws = new WebSocket(
  location.origin.replace("https", "wss")
);

const reader = new ZXing.BrowserMultiFormatReader();

ws.onopen = () => {
  ws.send(JSON.stringify({ type: "AUTH", token }));
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
        if (res) {
          scanResult.innerText = res.text;
          statusText.innerText = "✅ Scan sent";
          ws.send(JSON.stringify({
            type: "SCAN",
            value: res.text
          }));
          navigator.vibrate?.(100);
          reader.reset();
        }
      }
    );
  } catch (err) {
    statusText.innerText = "❌ Camera blocked";
  }
});
