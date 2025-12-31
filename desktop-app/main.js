const statusText = document.getElementById("statusText");
const statusDot = document.getElementById("statusDot");
const scanValue = document.getElementById("scanValue");

const ws = new WebSocket(
  location.origin.replace("https", "wss")
);

// Desktop connects
ws.onopen = () => {
  statusText.innerText = "Connected to server…";
  ws.send(JSON.stringify({ type: "DESKTOP_JOIN" }));
};

// Incoming messages
ws.onmessage = (e) => {
  const msg = JSON.parse(e.data);

  if (msg.type === "DESKTOP_READY") {
    statusText.innerText = "Waiting for mobile…";
    statusDot.style.background = "orange";
  }

  if (msg.type === "MOBILE_CONNECTED") {
    statusText.innerText = "Mobile connected";
    statusDot.style.background = "#22c55e";
  }

  if (msg.type === "SCAN") {
    const { value, format, timestamp } = msg.payload;

    scanValue.innerText = value;
    statusText.innerText = `Scan received (${format})`;
    statusDot.style.background = "#22c55e";

    console.log("📦 Persisted Scan:", msg.payload);
  }
};

ws.onclose = () => {
  statusText.innerText = "Disconnected";
  statusDot.style.background = "red";
};
