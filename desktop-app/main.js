const DEMO_PROJECT_ID = "dev_project";
const DEMO_API_KEY = "dev_key";
const BASE_URL = window.PUBLIC_BASE_URL || window.location.origin;

const ui = {
  createSessionBtn: document.getElementById("createSessionBtn"),
  resetBtn: document.getElementById("resetBtn"),
  statusText: document.getElementById("statusText"),
  statusDot: document.getElementById("statusDot"),
  errorBox: document.getElementById("errorBox"),
  qrEmptyState: document.getElementById("qrEmptyState"),
  qrCard: document.getElementById("qrCard"),
  qrImage: document.getElementById("qrImage"),
  mobileUrlLink: document.getElementById("mobileUrlLink"),
  sessionIdValue: document.getElementById("sessionIdValue"),
  sessionStateValue: document.getElementById("sessionStateValue"),
  desktopUrlLink: document.getElementById("desktopUrlLink"),
  backendUrlValue: document.getElementById("backendUrlValue"),
  scanValue: document.getElementById("scanValue"),
  scanList: document.getElementById("scanList"),
};

let currentSession = null;
let ws = null;

function getSessionFromLocation() {
  const url = new URL(window.location.href);
  const token = url.searchParams.get("token");
  const parts = url.pathname.split("/").filter(Boolean);
  const sessionId = parts[0] === "session" ? parts[1] || null : null;

  if (!sessionId || !token) {
    return null;
  }

    return {
    sessionId,
    desktopUrl: `${BASE_URL}/session/${encodeURIComponent(sessionId)}?token=${encodeURIComponent(token)}`,
    mobileUrl: `${BASE_URL}/mobile?sessionId=${encodeURIComponent(sessionId)}&token=${encodeURIComponent(token)}`,
  };
}

function setStatus(text, tone) {
  ui.statusText.textContent = text;
  ui.statusDot.dataset.tone = tone || "idle";
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

function resetScanFeed() {
  ui.scanValue.textContent = "No scans yet";
  ui.scanList.innerHTML = "";
}

function setLink(anchor, href) {
  if (!href) {
    anchor.textContent = "-";
    anchor.removeAttribute("href");
    return;
  }

  anchor.textContent = href;
  anchor.href = href;
}

function renderQrCode(url) {
  if (!url) {
    ui.qrCard.hidden = true;
    ui.qrEmptyState.hidden = false;
    ui.qrImage.removeAttribute("src");
    return;
  }

  ui.qrEmptyState.hidden = true;
  ui.qrCard.hidden = false;
  ui.qrImage.src = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(url)}`;
}

function rewriteBaseUrl(rawUrl) {
  if (!rawUrl) return rawUrl;

  const source = new URL(rawUrl, window.location.origin);
  const target = new URL(BASE_URL);
  source.protocol = target.protocol;
  source.host = target.host;
  return source.toString();
}

function resetUi() {
  currentSession = null;
  ui.sessionIdValue.textContent = "-";
  ui.sessionStateValue.textContent = "-";
  ui.backendUrlValue.textContent = BASE_URL;
  setLink(ui.mobileUrlLink, "");
  setLink(ui.desktopUrlLink, "");
  renderQrCode("");
  resetScanFeed();
  setError("");
  setStatus("Ready to create a session", "idle");
}

function closeSocket() {
  if (!ws) return;
  ws.onclose = null;
  ws.close();
  ws = null;
}

function prependScan(scan) {
  const item = document.createElement("li");
  item.className = "scan-item";
  item.innerHTML = `
    <div>
      <strong>${scan.value}</strong>
      <span>${scan.format}</span>
    </div>
    <time>${new Date(scan.timestamp).toLocaleTimeString()}</time>
  `;
  ui.scanList.prepend(item);
}

function connectDesktopSocket(session) {
  closeSocket();

  const desktopUrl = new URL(session.desktopUrl, BASE_URL);
  const token = desktopUrl.searchParams.get("token");
  const sessionId = session.sessionId;
  const wsProtocol = BASE_URL.startsWith("https") ? "wss" : "ws";
  const wsHost = BASE_URL.replace(/^https?:\/\//, "");
  const wsUrl = `${wsProtocol}://${wsHost}/ws?token=${encodeURIComponent(
    token
  )}&role=DESKTOP&sessionId=${encodeURIComponent(sessionId)}`;

  ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    setStatus("Desktop host connected. Waiting for mobile to pair.", "pending");
  };

  ws.onmessage = (event) => {
    const message = JSON.parse(event.data);

    if (message.type === "SESSION_STATE") {
      ui.sessionStateValue.textContent = message.state;
      if (message.mobileConnected) {
        setStatus("Mobile connected. Scan a barcode on the phone.", "connected");
      } else if (message.state === "WAITING_MOBILE" || message.state === "PENDING_DESKTOP") {
        setStatus("Session ready. Scan the QR code with a phone.", "pending");
      } else {
        setStatus(`Session state: ${message.state}`, "idle");
      }
      return;
    }

    if (message.type === "SCAN") {
      ui.scanValue.textContent = message.payload.value;
      prependScan(message.payload);
      setStatus("Scan received live on desktop.", "connected");
      return;
    }

    if (message.type === "ERROR") {
      setError(message.message || "WebSocket error");
      setStatus("Desktop connection error", "error");
    }
  };

  ws.onerror = () => {
    setStatus("Desktop connection error", "error");
  };

  ws.onclose = () => {
    if (currentSession) {
      setStatus("Desktop disconnected. Create a new session to continue.", "error");
    }
  };
}

async function createSession() {
  ui.createSessionBtn.disabled = true;
  setError("");
  setStatus("Creating session and QR code...", "pending");
  resetScanFeed();

  try {
    const response = await fetch("/api/sessions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        projectId: DEMO_PROJECT_ID,
        apiKey: DEMO_API_KEY,
        context: {
          demo: "desktop-app",
        },
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      const message = data?.error?.message || "Failed to create session";
      throw new Error(message);
    }

    const publicSession = {
      ...data,
      desktopUrl: rewriteBaseUrl(data.desktopUrl),
      mobileUrl: rewriteBaseUrl(data.mobileUrl),
    };

    currentSession = publicSession;
    ui.sessionIdValue.textContent = publicSession.sessionId;
    ui.sessionStateValue.textContent = "PENDING_DESKTOP";
    ui.backendUrlValue.textContent = BASE_URL;
    setLink(ui.mobileUrlLink, publicSession.mobileUrl);
    setLink(ui.desktopUrlLink, publicSession.desktopUrl);
    renderQrCode(publicSession.mobileUrl);
    connectDesktopSocket(publicSession);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create session";
    setError(message);
    setStatus("Unable to create demo session", "error");
  } finally {
    ui.createSessionBtn.disabled = false;
  }
}

ui.createSessionBtn.addEventListener("click", () => {
  void createSession();
});

ui.resetBtn.addEventListener("click", () => {
  closeSocket();
  resetUi();
});

window.addEventListener("beforeunload", () => {
  closeSocket();
});

resetUi();

const existingSession = getSessionFromLocation();
if (existingSession) {
  currentSession = existingSession;
  ui.sessionIdValue.textContent = existingSession.sessionId;
  ui.sessionStateValue.textContent = "PENDING_DESKTOP";
  ui.backendUrlValue.textContent = BASE_URL;
  setLink(ui.mobileUrlLink, existingSession.mobileUrl);
  setLink(ui.desktopUrlLink, existingSession.desktopUrl);
  renderQrCode(existingSession.mobileUrl);
  connectDesktopSocket(existingSession);
}
