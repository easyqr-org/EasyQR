const statusText = document.getElementById("statusText");
const statusDot = document.getElementById("statusDot");
const scanValue = document.getElementById("scanValue");

const ws = new WebSocket(
  location.origin.replace("https", "wss")
);

ws.onopen = () => {
  ws.send(JSON.stringify({ type: "DESKTOP_JOIN" }));
  statusText.innerText = "Connected";
};

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
    scanValue.innerText = msg.payload.value;
    statusText.innerText = "Scan received ✔";
    statusDot.style.background = "#22c55e";
  }

  if (msg.type === "ERROR") {
    statusText.innerText = msg.message;
    statusDot.style.background = "red";
  }
};

ws.onclose = () => {
  statusText.innerText = "Disconnected";
  statusDot.style.background = "red";
};
