const statusText = document.getElementById("statusText");
const statusDot = document.getElementById("statusDot");
const scanValue = document.getElementById("scanValue");

function getSessionInfo() {
  const url = new URL(window.location.href);
  const token = url.searchParams.get("token");
  // sessionId encoded in path: /session/:sessionId
  const parts = url.pathname.split("/").filter(Boolean);
  const sessionId = parts[1] || null;
  return { token, sessionId };
}

const { token: wsToken, sessionId } = getSessionInfo();

if (!wsToken || !sessionId) {
  statusText.innerText = "Missing session info";
  statusDot.style.background = "red";
} else {
  const origin = window.location.origin;
  const wsBase = origin.replace(/^http/, "ws");
  const wsUrl = `${wsBase}/ws?token=${encodeURIComponent(
    wsToken
  )}&role=DESKTOP&sessionId=${encodeURIComponent(sessionId)}`;

  const ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    // Kept for backwards compatibility; server treats DESKTOP_JOIN as no-op.
    ws.send(JSON.stringify({ type: "DESKTOP_JOIN" }));
    statusText.innerText = "Connected";
  };

  ws.onmessage = (e) => {
    const msg = JSON.parse(e.data);

    if (msg.type === "SESSION_STATE") {
      statusText.innerText = `Session: ${msg.state}`;
      statusDot.style.background = msg.mobileConnected ? "#22c55e" : "orange";
    }

    if (msg.type === "SCAN") {
      scanValue.innerText = msg.payload.value;
      statusText.innerText = "Scan received ✔";
      statusDot.style.background = "#22c55e";
    }

    if (msg.type === "ERROR") {
      statusText.innerText = msg.message || "Error";
      statusDot.style.background = "red";
    }
  };

  ws.onclose = () => {
    statusText.innerText = "Disconnected";
    statusDot.style.background = "red";
  };
}

