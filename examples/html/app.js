import { createEasyQRClient } from "@easyqr/sdk";

const ui = {
  createBtn: document.getElementById("create-session-btn"),
  disconnectBtn: document.getElementById("disconnect-btn"),
  connectionState: document.getElementById("connection-state"),
  sessionId: document.getElementById("session-id"),
  sessionState: document.getElementById("session-state"),
  mobileUrl: document.getElementById("mobile-url"),
  scanList: document.getElementById("scan-list"),
  errorBox: document.getElementById("error-box"),
};

const client = createEasyQRClient({
  baseUrl: "http://localhost:3000",
  projectId: "html_demo",
  apiKey: "9f6520686452c580f7773c19413b689627c5170491b4b6838390cff3d8a22a37",
});

let currentSessionId = null;

function setConnectionState(value) {
  ui.connectionState.textContent = value;
}

function setSessionId(value) {
  ui.sessionId.textContent = value || "-";
}

function setSessionState(value) {
  ui.sessionState.textContent = value || "-";
}

function setMobileUrl(value) {
  if (!value) {
    ui.mobileUrl.textContent = "-";
    ui.mobileUrl.removeAttribute("href");
    return;
  }
  ui.mobileUrl.textContent = value;
  ui.mobileUrl.setAttribute("href", value);
}

function prependScan(scan) {
  const li = document.createElement("li");
  li.textContent = `${scan.value} (${scan.format}) @ ${new Date(scan.timestamp).toLocaleTimeString()}`;
  ui.scanList.prepend(li);
}

function setError(message) {
  if (!message) {
    ui.errorBox.hidden = true;
    ui.errorBox.textContent = "";
    return;
  }
  ui.errorBox.hidden = false;
  ui.errorBox.textContent = message;
}

async function startHost() {
  setError("");
  setConnectionState("connecting");

  try {
    const session = await client.startHost();
    currentSessionId = session.session.sessionId;
    setSessionId(session.session.sessionId);
    setSessionState(session.session.state);
    setMobileUrl(session.mobileUrl);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to start host";
    setConnectionState("error");
    setError(message);
  }
}

async function disconnect() {
  setError("");
  try {
    await client.disconnect();
    setConnectionState("disconnected");
    currentSessionId = null;
    setSessionState("-");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Disconnect failed";
    setConnectionState("error");
    setError(message);
  }
}

client.on("connection.open", () => {
  setConnectionState("connected");
});

client.on("connection.closed", (payload) => {
  setConnectionState("disconnected");
  if (payload?.sessionId && payload.sessionId === currentSessionId) {
    currentSessionId = null;
  }
});

client.on("connection.error", (payload) => {
  setConnectionState("error");
  setError(`${payload.code}: ${payload.message}`);
});

client.on("session.state", (payload) => {
  if (!currentSessionId || payload.sessionId !== currentSessionId) {
    return;
  }
  setSessionState(payload.state);
});

client.on("scan.received", (payload) => {
  if (!currentSessionId || payload.scan.sessionId !== currentSessionId) {
    return;
  }
  prependScan(payload.scan);
});

ui.createBtn.addEventListener("click", () => {
  void startHost();
});

ui.disconnectBtn.addEventListener("click", () => {
  void disconnect();
});

window.addEventListener("beforeunload", () => {
  void client.destroy();
});
