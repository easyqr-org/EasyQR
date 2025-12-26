const statusText = document.getElementById("statusText");
const statusDot = document.getElementById("statusDot");
const scanValue = document.getElementById("scanValue");

// WebSocket connection
const ws = new WebSocket(
  location.origin.replace("https", "wss")
);

// When desktop connects
ws.onopen = () => {
  statusText.innerText = "Connected to server…";
  ws.send(JSON.stringify({ type: "DESKTOP_JOIN" }));
};

// Incoming messages
ws.onmessage = (e) => {
  const msg = JSON.parse(e.data);

  // Desktop ready
  if (msg.type === "DESKTOP_READY") {
    statusText.innerText = "Waiting for mobile…";
    statusDot.style.background = "orange";
    statusDot.style.boxShadow = "0 0 10px orange";
  }

  // Mobile connected
  if (msg.type === "MOBILE_CONNECTED") {
    statusText.innerText = "Mobile connected";
    statusDot.style.background = "#22c55e";
    statusDot.style.boxShadow = "0 0 12px #22c55e";
  }

  // Scan received
  if (msg.type === "SCAN") {
    scanValue.innerText = msg.value;
    statusText.innerText = "Scan received ✔";
    statusDot.style.background = "#22c55e";
    statusDot.style.boxShadow = "0 0 16px #22c55e";
  }
};

// Connection lost
ws.onclose = () => {
  statusText.innerText = "Disconnected";
  statusDot.style.background = "red";
  statusDot.style.boxShadow = "0 0 10px red";
};
