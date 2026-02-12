## EasyQR Integration Guide (Inventory Systems)

This guide explains how to embed **EasyQR** into any web‑based inventory management system (IMS) as a plugin, using the browser SDK and WebSocket bridge that have been implemented in this project.

---

## 1. Concepts

- **EasyQR Service**: The standalone server running this repo (Node + Express + WebSockets).
- **Inventory App (IMS)**: Your existing web dashboard where users manage inventory.
- **Session**: A short‑lived pairing between:
  - An IMS page (host)
  - An EasyQR desktop session window
  - A mobile scanner page

Scans from the phone flow to the EasyQR server and are streamed in real time to the IMS page.

---

## 2. Server Setup

1. **Install dependencies (if not present)** and run the server:

```bash
cd server
node src/index.js
```

2. **Environment variables**

Set these in your environment before starting the server:

```bash
export PORT=3000                            # optional
export JWT_SECRET="replace_with_strong_key"
export SESSION_TTL_SECONDS=180              # default 3 minutes

# Comma-separated list of allowed browser origins (your IMS frontends)
export EASYQR_ALLOWED_ORIGINS="https://inventory.example.com"

# Optional per-project API keys, comma-separated list of projectId:key pairs
export EASYQR_PROJECT_KEYS="demo_project:demo_secret"
```

3. **URLs exposed**

- Desktop session UI: `http://<host>:<port>/session/:sessionId`
- Mobile scanner UI: `http://<host>:<port>/mobile?sessionId=...&token=...`
- SDK script: `http://<host>:<port>/sdk/easyqr-sdk.v1.js`
- Session API: `POST http://<host>:<port>/api/sessions`

In production, you will typically serve this over HTTPS, e.g. `https://easyqr.example.com`.

---

## 3. Embedding the SDK in Your Inventory App

### 3.1. Include the SDK

In your IMS HTML (e.g. main layout template):

```html
<script src="https://easyqr.example.com/sdk/easyqr-sdk.v1.js"></script>
```

### 3.2. Initialize EasyQR

In your IMS JavaScript:

```html
<script>
  EasyQR.init({
    baseUrl: "https://easyqr.example.com",   // EasyQR server base URL
    projectId: "demo_project",               // must match your server config
    apiKey: "demo_secret",                   // if EASYQR_PROJECT_KEYS is configured
    onScan: function (payload, meta) {
      // payload: { sessionId, value, format, timestamp, source }
      // meta: { sessionId, context }
      console.log("Scan received:", payload.value, "for session", meta.sessionId);

      // Example: update a row in your inventory table
      // updateInventoryRow(meta.context.itemId, payload.value);
    },
    onSessionState: function (state, meta) {
      console.log("Session state changed:", state.state, "for session", meta.sessionId);
    },
  });
</script>
```

### 3.3. Triggering a Scan from a Widget/Button

Attach a button in your inventory table:

```html
<button
  onclick="startEasyQrScan('ITEM-123')">
  Scan with EasyQR
</button>

<script>
  function startEasyQrScan(itemId) {
    EasyQR.startScan({
      context: {
        itemId: itemId,
        mode: "update",   // or "create", "lookup", etc.
      },
      // webhookUrl: "https://your-backend.example.com/api/easyqr/webhook" // optional future use
    })
    .then(function (session) {
      console.log("EasyQR session started:", session.sessionId);
    })
    .catch(function (err) {
      console.error("Failed to start EasyQR session:", err);
    });
  }
</script>
```

When the user clicks the button:

1. The IMS page calls `POST /api/sessions` on the EasyQR server.
2. EasyQR creates a session and returns `{ sessionId, wsToken, desktopUrl, mobileUrl }`.
3. The SDK opens the EasyQR desktop session UI in a new window/tab.
4. The IMS page connects as a **HOST** via WebSocket to receive `SCAN` and `SESSION_STATE` events.
5. When the phone scans a barcode/QR, the IMS `onScan` callback fires.

---

## 4. What the User Sees

1. User clicks **“Scan with EasyQR”** on a row in the inventory table.
2. A new EasyQR window opens showing the desktop session status.
3. The EasyQR window shows a QR code / instructions (future UX).
4. User opens the mobile URL (e.g. by scanning a pairing QR from the desktop window).
5. Mobile camera UI appears; user scans the physical barcode/QR.
6. The scan value instantly appears:
   - In the EasyQR desktop window
   - In your IMS page via the `onScan` callback

Your IMS code then decides whether to:

- Look up an existing item,
- Create a new item, or
- Update quantities, etc.

---

## 5. Security & Isolation

- **Per-session JWT**: Every session returns a short‑lived `wsToken` used for WebSocket connections.
- **Session isolation**:
  - WebSockets are routed by `sessionId` on the server.
  - Scans are stored per session and never broadcast across sessions.
- **Tenant isolation**:
  - Each session is associated with a `projectId`.
  - WebSocket tokens encode the project, and the server validates that they match.
- **Origin restrictions**:
  - Only origins listed in `EASYQR_ALLOWED_ORIGINS` may call the APIs or open WebSocket connections.

---

## 6. Example Scan Payload

```json
{
  "sessionId": "bf3e34b6-2de3-4d88-9a2b-123456789abc",
  "value": "012345678905",
  "format": "EAN_13",
  "timestamp": "2026-02-12T10:15:30.000Z",
  "source": "mobile"
}
```

Your IMS logic should treat `value` as the primary barcode/QR content and map it into your own domain (product, SKU, batch, etc.).

---

## 7. End-to-End Test Checklist

1. Start the EasyQR server with appropriate env vars.
2. From your IMS domain (allowed in `EASYQR_ALLOWED_ORIGINS`), open a page that:
   - Includes the EasyQR SDK script.
   - Calls `EasyQR.init(...)`.
   - Has a “Scan with EasyQR” button calling `EasyQR.startScan(...)`.
3. Click the button → confirm that:
   - An EasyQR window opens.
   - No CORS or auth errors appear in the browser console.
4. On a phone, open the `mobileUrl` (for now, copy from the server logs or desktop window if exposed).
5. Scan a barcode/QR → verify that:
   - The EasyQR desktop window shows the scanned value.
   - Your IMS page receives the scan in `onScan` and updates its UI/backend as expected.

Once this flow works, EasyQR is successfully integrated as a reusable scanning plugin for your inventory system.

