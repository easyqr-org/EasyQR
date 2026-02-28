import { createEasyQRClient } from "@easyqr/sdk";

const ui = {
  start: document.getElementById("start") as HTMLButtonElement,
  disconnect: document.getElementById("disconnect") as HTMLButtonElement,
  connection: document.getElementById("connection") as HTMLSpanElement,
  sessionId: document.getElementById("sessionId") as HTMLSpanElement,
  sessionState: document.getElementById("sessionState") as HTMLSpanElement,
  mobileUrl: document.getElementById("mobileUrl") as HTMLAnchorElement,
  error: document.getElementById("error") as HTMLDivElement,
  scans: document.getElementById("scans") as HTMLUListElement,
};

const client = createEasyQRClient({
  baseUrl: "http://localhost:3000",
  projectId: "html_demo",
  apiKey: "9f6520686452c580f7773c19413b689627c5170491b4b6838390cff3d8a22a37",
});

let activeSessionId: string | null = null;

function setConnection(value: string) {
  ui.connection.textContent = value;
}

function setError(value: string) {
  ui.error.textContent = value;
}

client.on("connection.open", (payload) => {
  setConnection(`connected (${payload.role})`);
});

client.on("connection.closed", () => {
  setConnection("disconnected");
});

client.on("connection.error", (payload) => {
  setConnection("error");
  setError(`${payload.code}: ${payload.message}`);
});

client.on("session.state", (payload) => {
  if (!activeSessionId || payload.sessionId !== activeSessionId) return;
  ui.sessionState.textContent = payload.state;
});

client.on("scan.received", (payload) => {
  if (!activeSessionId || payload.scan.sessionId !== activeSessionId) return;
  const li = document.createElement("li");
  li.textContent = `${payload.scan.value} (${payload.scan.format}) @ ${new Date(payload.scan.timestamp).toLocaleTimeString()}`;
  ui.scans.prepend(li);
});

async function startHost() {
  setError("");
  setConnection("connecting");
  try {
    const session = await client.startHost();
    activeSessionId = session.session.sessionId;
    ui.sessionId.textContent = session.session.sessionId;
    ui.sessionState.textContent = session.session.state;
    ui.mobileUrl.href = session.mobileUrl;
    ui.mobileUrl.textContent = session.mobileUrl;
  } catch (error) {
    setConnection("error");
    setError(error instanceof Error ? error.message : "Unknown error");
  }
}

async function disconnect() {
  await client.disconnect();
  setConnection("disconnected");
}

ui.start.addEventListener("click", () => {
  void startHost();
});

ui.disconnect.addEventListener("click", () => {
  void disconnect();
});

window.addEventListener("beforeunload", () => {
  void client.destroy();
});
