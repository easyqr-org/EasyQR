const video = document.getElementById("video");
const startBtn = document.getElementById("startBtn");
const statusText = document.getElementById("statusText");
const scanResult = document.getElementById("scanResult");
const frame = document.getElementById("frame");

function getSessionInfo() {
  const url = new URL(window.location.href);
  const sessionId = url.searchParams.get("sessionId");
  const token = url.searchParams.get("token");
  return { sessionId, token };
}

const { sessionId, token: wsToken } = getSessionInfo();

let lastSent = null;
let locked = false;

let ws = null;

if (!sessionId || !wsToken) {
  statusText.innerText = "Missing session info";
} else {
  const origin = window.location.origin;
  const wsBase = origin.replace(/^http/, "ws");
  const wsUrl = `${wsBase}/ws?token=${encodeURIComponent(
    wsToken
  )}&role=MOBILE&sessionId=${encodeURIComponent(sessionId)}`;

  ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    // Kept for backwards compatibility; server treats MOBILE_JOIN as no-op.
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
}

const reader = new ZXing.BrowserMultiFormatReader();

startBtn.addEventListener("click", async () => {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    statusText.innerText = "WebSocket not connected";
    return;
  }

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
        source: "mobile",
      };

      ws.send(JSON.stringify({ type: "SCAN", payload }));

      scanResult.innerText = res.text;
      statusText.innerText = "✅ Scan sent";
      navigator.vibrate?.(100);

      setTimeout(() => (locked = false), 1500);
    }
  );
});

// 🔥 Task 2.7 — Invalid Payload Test
document.getElementById("sendInvalid").addEventListener("click", () => {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    statusText.innerText = "WebSocket not connected";
    return;
  }

  const invalidPayload = {
    value: null, // ❌ invalid
    format: 123, // ❌ invalid
    timestamp: "INVALID", // ❌ invalid
    // sessionId missing ❌
  };

  ws.send(
    JSON.stringify({
      type: "SCAN",
      payload: invalidPayload,
    })
  );

  statusText.innerText = "❌ Invalid payload sent (test)";
});

