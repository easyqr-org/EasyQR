# 1. Integration Overview
EasyQR is a plugin layer that adds real-time mobile scanning capability to an existing inventory UI.

EasyQR is responsible for scan session orchestration and scan event delivery.
Blisky is responsible for business meaning and data persistence.

Architecture intent:
- EasyQR handles pairing, scan transport, and session-safe routing.
- Blisky handles inventory rules, backend writes, and UI state updates.

Important boundary:
- EasyQR does **not** update Blisky database.
- EasyQR does **not** execute Blisky business logic.
- EasyQR emits scan/session events; Blisky decides what to do with them.

# 2. Integration Architecture Diagram
```text
+---------------------+
| Blisky Frontend     |
+----------+----------+
           |
           v
+---------------------+
| EasyQR SDK          |
+----------+----------+
           |
           | HTTP + WS
           v
+---------------------+
| EasyQR Server       |
+----------+----------+
           |
           v
+---------------------+
| Mobile Scanner      |
+----------+----------+
           |
           | Barcode Scan Event
           v
+---------------------+
| SDK Event Callback  |
+----------+----------+
           |
           v
+---------------------+
| Blisky Backend/API  |
+----------+----------+
           |
           v
+---------------------+
| Inventory DB Update |
+----------+----------+
           |
           v
+---------------------+
| UI Refresh          |
+---------------------+
```

# 3. Integration Responsibility Model
| Responsibility | EasyQR | Client (Blisky) |
|---|---|---|
| Session creation and pairing URLs | Yes | Initiates via SDK |
| Mobile camera scan capture (reference app) | Yes | Optional embed/launch choice |
| Scan payload transport (real-time) | Yes | Consumes events |
| Scan payload structural validation | Yes | Additional domain checks if needed |
| Inventory business logic (item lookup, quantity rules, etc.) | No | Yes |
| Database update | No | Yes |
| Inventory UI update | No | Yes |
| Tenant/project credential configuration | Validates | Provides and manages |

# 4. SDK Installation
This repository provides two client integration surfaces.

For local development from this repository:
```bash
npm install ../sdk
```

What this installs conceptually:
- HTTP client for `POST /api/sessions`
- WebSocket client for `/ws`
- Typed runtime events (`scan.received`, `session.state`, connection lifecycle)

## Option B: Hosted browser SDK script
Served by EasyQR server at:
- `/sdk/easyqr-sdk.v1.js`

This exposes global `EasyQR.init(...)` and `EasyQR.startScan(...)`.

# 5. SDK Initialization
## npm SDK initialization
```ts
import { createEasyQRClient } from "@easyqr/sdk";

const client = createEasyQRClient({
  baseUrl: "http://localhost:3000",
  projectId: "your_project_id",
  apiKey: "your_api_key"
});
```

Config meaning:
- `baseUrl`: EasyQR server base URL (environment-specific)
- `projectId`: tenant/project identifier used for auth scope
- `apiKey`: project credential validated by EasyQR

Why initialization is required:
- binds server endpoint and auth context
- creates the client instance that can start sessions and subscribe to events

## Browser SDK initialization
```html
<script src="https://<easyqr-host>/sdk/easyqr-sdk.v1.js"></script>
<script>
  EasyQR.init({
    baseUrl: "https://<easyqr-host>",
    projectId: "your_project_id",
    apiKey: "your_api_key",
    onScan: function (payload, meta) {},
    onSessionState: function (state, meta) {}
  });
</script>
```

# 6. Starting Host Session
## npm SDK
```ts
const session = await client.startHost();
console.log(session.session.sessionId);
console.log(session.mobileUrl);
```

Internal behavior:
1. SDK sends `POST /api/sessions`.
2. EasyQR server authenticates project and creates session.
3. Server returns `sessionId`, `mobileUrl`, `desktopUrl`, `wsToken`, `expiresAt`.
4. SDK opens host WebSocket connection for that session.
5. Session becomes ready for mobile pairing.

## Browser SDK
```js
const session = await EasyQR.startScan({ context: { itemId: "ITEM-123" } });
```
Browser SDK also opens desktop session window automatically if `desktopUrl` is returned.

# 7. Scan Event Flow (MOST IMPORTANT)
1. Phone scanner reads barcode/QR.
2. Mobile scanner sends `SCAN` payload over WebSocket to EasyQR server.
3. EasyQR validates session, tenant scope, payload shape, and duplicate constraints.
4. EasyQR emits scan event to host/desktop subscribers.
5. SDK receives WS message and maps it to client event (`scan.received` or `onScan`).
6. Blisky callback executes.
7. Blisky calls its own backend API endpoint.
8. Blisky backend updates inventory database.
9. Blisky frontend refreshes table/state.

This event callback is the integration handoff point between EasyQR and Blisky domain logic.

# 8. Receiving Scan Data
## npm SDK event listener
```ts
client.on("scan.received", ({ scan }) => {
  console.log(scan.value);      // barcode value
  console.log(scan.timestamp);  // event timestamp
  console.log(scan.sessionId);  // session context
  console.log(scan.format);     // barcode format
});
```

## Browser SDK listener
```js
EasyQR.init({
  // ...
  onScan: function (payload, meta) {
    console.log(payload.value, payload.timestamp, payload.sessionId);
  }
});
```

Notes:
- In `@easyqr/sdk`, there is no `client.onScan(...)` method; use `client.on("scan.received", ...)`.
- `scan` payload fields from current SDK types:
  - `sessionId: string`
  - `value: string`
  - `format: string`
  - `timestamp: number`
  - `source?: string`

# 9. Updating Inventory (CLIENT RESPONSIBILITY)
EasyQR does not modify inventory records.

Recommended pattern:
1. Receive scan event in Blisky frontend.
2. Call Blisky backend API with mapped payload.
3. Commit DB update in Blisky backend.
4. Return updated record/state.
5. Refresh inventory UI.

Conceptual example:
```ts
client.on("scan.received", async ({ scan }) => {
  await fetch("/api/inventory/scan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      barcode: scan.value,
      format: scan.format,
      scannedAt: scan.timestamp,
      easyqrSessionId: scan.sessionId
    })
  });

  // refresh table/query in Blisky UI
});
```

# 10. Frontend Integration Pattern
Recommended placement:
- Add a **"Scan with EasyQR"** action in inventory rows/screens where barcode input is needed.

Typical UX flow:
1. User clicks scan button in Blisky UI.
2. Blisky starts host session via SDK.
3. Blisky displays/opens host session page and/or pairing URL as QR.
4. User scans using mobile camera.
5. Scan events return to original Blisky page via SDK callback.
6. Blisky updates its own state and backend.

Implementation note:
- If using browser SDK (`easyqr-sdk.v1.js`), host window opening is handled by SDK.
- If using npm SDK, session URLs are returned and Blisky controls host UI behavior.

# 11. Error Handling Expectations
Common conditions and ownership:

| Condition | SDK / EasyQR behavior | Client (Blisky) action |
|---|---|---|
| Invalid project credentials | HTTP error (e.g., unauthorized) | show integration/auth error UI |
| WS connection issue | `connection.error` / `connection.closed` events | show retry action; allow restart |
| Mobile disconnect | session state/connection events | indicate scanner disconnected; keep operator flow clear |
| Session expiry | server marks expired; further operations fail | create new session and re-pair |
| Rate limit exceeded | HTTP 429 or WS rejection | backoff and retry after window |

Practical client guidance:
- Subscribe to `connection.open`, `connection.closed`, `connection.error`, and `session.state`.
- Make session restart explicit in UI.
- Keep inventory mutation idempotent on your backend side.

# 12. Deployment Integration Options
## Option A: Client-hosted EasyQR server (Docker)
- Blisky infra runs EasyQR stack (`docker-compose.yml`) with server + PostgreSQL + Redis.
- SDK `baseUrl` points to client-hosted EasyQR endpoint.
- Client controls runtime, scaling, and operational policy.

## Option B: EasyQR-managed deployment
- EasyQR server is hosted externally by EasyQR team.
- Blisky sets SDK `baseUrl` to managed endpoint.
- Integration code is the same; operational ownership differs.

Integration difference summary:
- Application integration contract (SDK/API/events) stays same.
- Only endpoint/ownership/operations change.

# 13. Minimal Integration Checklist
- [ ] SDK installed (`@easyqr/sdk` or browser SDK script)
- [ ] `projectId` and `apiKey` configured per environment
- [ ] `baseUrl` configured for target EasyQR deployment
- [ ] "Scan with EasyQR" button added in Blisky UI
- [ ] Session launch (`startHost` or `startScan`) confirmed
- [ ] Scan event callback wired (`scan.received` / `onScan`)
- [ ] Blisky backend inventory update endpoint connected
- [ ] UI refresh after backend update implemented
- [ ] Connection/session error states handled

# 14. Mental Model Summary
EasyQR provides scanning events.
Your system decides what those scans mean.
