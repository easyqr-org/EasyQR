window.addEventListener("DOMContentLoaded", () => {
  const baseUrl = (window.PUBLIC_BASE_URL || "").trim() || window.location.origin;
  const params = new URLSearchParams(location.search);
  const sessionId = params.get("sessionId");
  const token = params.get("token");

  const video = document.getElementById("video");
  const startBtn = document.getElementById("startBtn");
  const statusText = document.getElementById("statusText");
  const statusBadge = document.getElementById("statusBadge");
  const scanValue = document.getElementById("scanValue");
  const cameraPlaceholder = document.getElementById("cameraPlaceholder");
  const resultCard = document.querySelector(".result-card");

  const reader = new ZXing.BrowserMultiFormatReader();

  let ws = null;
  let scannerStarted = false;
  let lastValue = null;
  let lastScanTime = 0;

  function setStatus(label, detail, tone = "") {
    statusBadge.textContent = label;
    statusBadge.className = `status-badge ${tone}`.trim();
    statusText.textContent = detail;
  }

  function showSuccess(value) {
    scanValue.textContent = value;
    resultCard.classList.add("success");
    setStatus("Scanning", "Scan sent to desktop", "scanning");
    window.setTimeout(() => {
      resultCard.classList.remove("success");
      setStatus("Connected", "Ready for the next scan", "connected");
    }, 1200);
  }

  function normalizeFormat(result) {
    const rawFormat =
      typeof result?.getBarcodeFormat === "function"
        ? result.getBarcodeFormat()
        : result?.format;

    if (!rawFormat) return "QR_CODE";
    if (typeof rawFormat === "string") return rawFormat;
    if (typeof rawFormat === "object" && typeof rawFormat.toString === "function") {
      const rendered = rawFormat.toString();
      if (rendered && rendered !== "[object Object]") return rendered;
    }
    return String(rawFormat);
  }

  function handleScan(result) {
    if (!result?.text || !ws || ws.readyState !== WebSocket.OPEN) {
      return;
    }

    const value = result.text.trim();
    if (!value) return;

    const now = Date.now();
    if (value === lastValue && now - lastScanTime < 1500) {
      return;
    }

    lastValue = value;
    lastScanTime = now;

    const payload = {
      type: "SCAN",
      payload: {
        sessionId,
        value,
        format: normalizeFormat(result),
        timestamp: new Date().toISOString(),
        source: "mobile",
      },
    };

    console.log("Sending scan:", payload);
    ws.send(JSON.stringify(payload));
    showSuccess(value);
    navigator.vibrate?.(100);
  }

  async function startScanner() {
    if (scannerStarted) return;
    scannerStarted = true;
    startBtn.disabled = true;
    startBtn.textContent = "Camera Active";
    setStatus("Scanning", "Starting camera preview...", "scanning");

    try {
      await reader.decodeFromConstraints(
        { video: { facingMode: { ideal: "environment" } } },
        video,
        (result) => {
          if (!video.classList.contains("active")) {
            video.classList.add("active");
            cameraPlaceholder.classList.add("hidden");
          }

          if (result) {
            handleScan(result);
          }
        }
      );
    } catch (error) {
      scannerStarted = false;
      startBtn.disabled = false;
      startBtn.textContent = "Retry Camera";
      setStatus(
        "Camera Error",
        error instanceof Error ? error.message : "Unable to start camera",
        "error"
      );
    }
  }

  if (!sessionId || !token) {
    setStatus("Missing Session", "This scanner link is incomplete.", "error");
    startBtn.disabled = true;
    return;
  }

  const wsProtocol = baseUrl.startsWith("https") ? "wss" : "ws";
  const wsHost = baseUrl.replace(/^https?:\/\//, "");
  const wsUrl = `${wsProtocol}://${wsHost}/ws?token=${encodeURIComponent(
    token
  )}&role=MOBILE&sessionId=${encodeURIComponent(sessionId)}`;

  console.log("Connecting WebSocket:", wsUrl);
  ws = new WebSocket(wsUrl);

  ws.addEventListener("open", () => {
    console.log("WebSocket connected");
    ws.send(JSON.stringify({ type: "MOBILE_JOIN" }));
    startBtn.disabled = false;
    setStatus("Connected", "Ready to scan", "connected");
  });

  ws.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.type === "ERROR") {
      console.log("Scanner error:", message);
      setStatus("Scan Rejected", message.message || "Scan rejected", "error");
    }
  });

  ws.addEventListener("error", () => {
    setStatus("Connection Error", "Unable to reach the EasyQR server.", "error");
    startBtn.disabled = true;
  });

  ws.addEventListener("close", () => {
    if (statusBadge.textContent !== "Missing Session") {
      setStatus("Disconnected", "Connection closed. Reload the scanner link.", "error");
    }
    startBtn.disabled = true;
  });

  startBtn.addEventListener("click", () => {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      setStatus("Connecting", "Waiting for WebSocket connection...", "scanning");
      return;
    }

    void startScanner();
  });
});
