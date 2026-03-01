# 1. What is EasyQR SDK?
EasyQR SDK is the client-side integration layer that connects a business application (for example, Blisky IMS) to EasyQR scanning infrastructure.

The SDK abstracts:
- HTTP session creation (`POST /api/sessions`)
- WebSocket connection setup (`/ws`)
- session-scoped event mapping
- typed event handling for scan and connection lifecycle

Why use SDK instead of direct API wiring:
- less integration code in your app
- consistent event contract (`scan.received`, `session.state`, connection events)
- centralized handling of session + transport concerns
- lower risk of protocol-level mistakes

EasyQR SDK does not contain inventory business logic. It transports scan data; your system interprets and persists it.

---

# 2. High-Level Workflow
1. Blisky UI creates SDK client with server URL and project credentials.
2. SDK requests a new session from EasyQR server.
3. EasyQR returns session metadata (`sessionId`, URLs, token, expiry).
4. Host side connects WebSocket for that session.
5. Mobile scanner joins same session and scans barcode.
6. EasyQR validates and routes scan event.
7. SDK receives event (`scan.received`).
8. Blisky calls its own backend to update inventory.
9. Blisky UI refreshes domain state.

Flow summary:
`Blisky UI -> SDK -> EasyQR Server -> Mobile Scanner -> WS Event -> Blisky Backend -> Inventory Update`

---

# 3. SDK Architecture
## SDK Client
Created via `createEasyQRClient(config)`. Owns HTTP + WS client behavior and event subscription.

## EasyQR Server API
Receives session creation requests and returns session/token metadata.

## WebSocket Gateway
Session-bound `/ws` channel where scan/state events are pushed.

## Mobile Scanner
Sends scan payloads into EasyQR WebSocket session.

## Host Application (Blisky)
Consumes SDK events and applies inventory logic through Blisky backend.

Responsibility split:
- SDK/EasyQR: session + transport
- Blisky: meaning + persistence

---

# 4. SDK Initialization
```ts
import { createEasyQRClient } from "@easyqr/sdk";

const client = createEasyQRClient({
  baseUrl: "https://easyqr.internal",
  projectId: "blisky-prod",
  apiKey: "<project-api-key>"
});
```

Parameter meaning:
- `baseUrl`: EasyQR server base URL
- `projectId`: tenant/project scope used for authorization
- `apiKey`: project credential validated by EasyQR server

Authentication model:
- SDK sends project credentials during session creation.
- EasyQR server enforces project-scoped authentication and session isolation.

---

# 5. Session Lifecycle
Operational lifecycle in client UX terms:
- `idle`: no active session/connection
- `connecting`: session requested and/or WS handshake in progress
- `connected`: WS open and session active
- `scanning`: scan events being received
- `disconnected`: WS closed intentionally or unexpectedly
- `expired`: session TTL reached / server expired session
- `error`: auth, network, protocol, or runtime failures

What happens during `client.startHost()`:
1. SDK calls `POST /api/sessions`.
2. Receives `sessionId`, `desktopUrl`, `mobileUrl`, token, expiry metadata.
3. SDK opens host WebSocket connection for returned session.
4. Session is ready for mobile pairing.

Pairing/QR logic:
- EasyQR returns `mobileUrl`.
- Your host UI can render this URL as QR (or open directly on mobile).
- Server does not generate QR image binaries; pairing is URL/token based.

---

# 6. Scan Event Flow (CRITICAL)
Exact path:
1. Phone scans barcode.
2. Mobile client sends scan payload to EasyQR server over WebSocket.
3. Server validates session, payload shape, and session constraints.
4. Server emits scan event to host subscribers.
5. SDK receives WS frame and emits `scan.received`.
6. Client app processes event and calls its own backend.

Important boundary:
- EasyQR does **not** update client database directly.
- Client backend decides how scans affect inventory.

---

# 7. Handling Scan Events
Developer integration point:
```ts
client.on("scan.received", async ({ scan }) => {
  // 1) interpret scan in domain context
  // 2) call Blisky backend API
  // 3) refresh UI data/state
});
```

Recommended logical flow:
- receive scan
- lookup/validate product in your domain
- execute inventory mutation in your backend
- refresh UI table/state

Separation of responsibility:
- EasyQR guarantees transport/session integrity
- Blisky guarantees business correctness

---

# 8. Operational Usage Model
Typical daily operator flow:
1. Operator clicks **Scan with EasyQR**.
2. Session starts.
3. Mobile connects to session.
4. Operator scans continuously.
5. Blisky inventory updates in near real time.
6. Session ends by disconnect, expiry, or workflow completion.

---

# 9. Error Handling & Recovery
Handle these conditions in your UI:
- connection loss
- session expiry
- mobile disconnect
- transient network interruption

SDK event signals to subscribe:
- `connection.open`
- `connection.closed`
- `connection.error`
- `session.state`

Reconnection behavior (current implementation):
- The SDK does **not** implement automatic reconnect loops.
- Recovery is application-driven (start a new session or reconnect flow in UI).

---

# 10. Runtime Operations
Operational expectations:
- EasyQR server must be reachable for session creation and WS traffic.
- Sessions are temporary (TTL-based).
- Multiple concurrent operators/sessions are supported by server architecture.
- Client should handle closed/expired sessions by creating new sessions.

---

# 11. Deployment Interaction
Relationship model:
- SDK runs in client browser/app.
- EasyQR server runs as deployed backend service (commonly Docker-based in this repo).
- SDK points to whichever EasyQR base URL is active (client-hosted or externally hosted).

Key point:
- SDK integration code stays mostly the same across deployment models.
- Only endpoint/configuration and operational ownership change.

---

# 12. Security Model
Implemented security concepts relevant to SDK consumers:
- project API keys for access control
- project-scoped session authorization
- session/token validation on WebSocket handshake
- tenant separation and cross-project access prevention
- rate-limit enforcement on API and WS paths

Client guidance:
- avoid exposing privileged secrets unnecessarily
- rotate project keys through provided management APIs
- use HTTPS/WSS in production

---

# 13. Observability During Operation
EasyQR runtime provides operational visibility via:
- health endpoints (`/health/live`, `/health/ready`, `/health`)
- metrics endpoint (`/metrics`)
- structured logs (request + connection lifecycle)

During integration, use these signals to verify:
- server readiness before starting scans
- active WS connectivity
- error trends and degraded conditions

---

# 14. Recommended Integration Pattern
Enterprise best-practice pattern:
1. Initialize one SDK client per active UI context.
2. Start host session from explicit user action.
3. Display pairing information clearly (mobile URL/QR).
4. Handle `scan.received` by calling backend API (not direct client-only mutation).
5. Treat disconnect/expiry as expected states and provide restart action.
6. Keep backend inventory writes idempotent where possible.

---

# 15. Responsibilities Matrix
| Responsibility | EasyQR | Client (Blisky) |
|---|---|---|
| Session management and pairing transport | Yes | Initiates via SDK |
| Scanning transport and event streaming | Yes | Consumes events |
| Inventory rule execution | No | Yes |
| Database writes | No | Yes |
| UI refresh logic | No | Yes |
| Infrastructure uptime | Depends on hosting model | Depends on hosting model |

Hosting note:
- Client-hosted: client owns runtime uptime.
- EasyQR-hosted: EasyQR team owns runtime uptime.

---

# 16. Common Integration Mistakes
1. Expecting EasyQR to update inventory DB automatically.
2. Hardcoding production API keys in frontend bundles without environment controls.
3. Ignoring session lifecycle transitions (especially expiry/disconnect).
4. Not subscribing to `connection.closed` and `connection.error`.
5. Treating scan transport as business validation (domain validation still required in Blisky).

---

# 17. Operational Checklist
- [ ] SDK installed and version pinned
- [ ] `baseUrl`, `projectId`, `apiKey` configured per environment
- [ ] Host session launch path wired from UI action
- [ ] `scan.received` callback connected to backend inventory API
- [ ] Connection/session lifecycle events handled in UI
- [ ] Session restart flow implemented for expiry/disconnect
- [ ] EasyQR health endpoints integrated into operational checks
- [ ] Metrics/log monitoring connected to client observability stack
- [ ] HTTPS/WSS and key management policy validated for production
