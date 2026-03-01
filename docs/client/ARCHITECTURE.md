# 1. Executive Overview
EasyQR is a real-time scanning plugin system that allows an inventory web application (Blisky) to use mobile phone cameras as barcode/QR input devices.

The system is designed to preserve scanner-like operational behavior while removing dedicated hardware dependency:
- session-based desktop/mobile pairing
- low-latency scan delivery over WebSocket
- project-scoped authentication and tenant boundaries
- deployable runtime with PostgreSQL + Redis support

EasyQR is integrated as an external service with a browser SDK (`@easyqr/sdk`) so Blisky can embed scanning without rewriting its core inventory backend.

# 2. System Actors
| Actor | Responsibility | Runtime Location |
|---|---|---|
| Blisky Application | Initiates scan sessions and applies scan results to inventory workflows | Client environment |
| EasyQR SDK (`@easyqr/sdk`) | Creates sessions via HTTP, opens WS connections, emits typed events (`scan.received`, `session.state`, connection lifecycle) | Browser (inside Blisky UI) |
| EasyQR Server | Authenticates projects, creates sessions, validates and routes scan payloads, serves health/metrics, manages lifecycle | Independent Node.js service |
| Desktop Host UI (`desktop-app/`) | Reference host UI that connects to session WS and displays status/latest scan | Served by EasyQR server |
| Mobile Scanner (`mobile-scanner/`) | Camera-driven scan sender using ZXing and session WS context | Served by EasyQR server |
| End User (Operator) | Starts scan flow in desktop UI and scans via mobile camera | Warehouse / operations user |

# 3. High-Level Architecture Diagram
```text
+--------------------+
| Blisky Web UI      |
| (inventory screen) |
+---------+----------+
          |
          | SDK calls (HTTP + WS)
          v
+--------------------+
| @easyqr/sdk        |
+---------+----------+
          |
          | POST /api/sessions
          v
+-------------------------------+
| EasyQR Server (Express + WS)  |
| - session/auth/routing        |
| - health/metrics/lifecycle    |
+---------+---------------------+
          |
          | WS session pairing (/ws)
          v
+--------------------+
| Mobile Scanner UI  |
| (camera + ZXing)   |
+---------+----------+
          |
          | SCAN payload
          v
+--------------------+
| EasyQR Server      |
+---------+----------+
          |
          | SCAN event -> SDK listener
          v
+--------------------+
| Blisky Inventory   |
| Update Logic       |
+--------------------+
```

# 4. Repository Architecture Breakdown
- `server/`
  - Node.js/Express runtime
  - REST APIs: session creation, scan history, admin/audit, health, metrics
  - WebSocket server (`/ws`) for desktop/mobile roles
  - Storage abstraction: memory or PostgreSQL (`server/src/data/*`)
  - Redis event bus + Redis-backed rate-limit counters (when enabled)
  - lifecycle controls (ready/drain/stop), structured logging, request context
- `sdk/`
  - Browser SDK package `@easyqr/sdk`
  - HTTP transport for session creation (`POST /api/sessions`)
  - WS transport and typed client event mapping
- `desktop-app/`
  - Reference desktop host UI served by EasyQR (`/` and `/session/:sessionId`)
- `mobile-scanner/`
  - Reference mobile scanner UI served by EasyQR (`/mobile`)
- `deploy/`
  - deployment, readiness check, rollback scripts
- `docs/`
  - phase-based engineering docs, test matrices, proof packs
- Docker-related files
  - root `docker-compose.yml`: EasyQR server + PostgreSQL + Redis
  - `server/Dockerfile`: server container build
  - `.env.docker.example`: runtime env template

# 5. Runtime Execution Flow (MOST IMPORTANT)
1. **User clicks “Scan with EasyQR” in Blisky**
   - Blisky frontend triggers SDK workflow (`createSession` / `startHost`).

2. **SDK initialization**
   - Blisky constructs `createEasyQRClient({ baseUrl, projectId, apiKey })`.
   - SDK stores config for HTTP and WS usage.

3. **Session creation**
   - SDK sends `POST /api/sessions` with project credentials.
   - EasyQR server validates credentials and project scope.

4. **Server allocation**
   - Server creates `sessionId`, expiry, and project-linked session record.
   - Session state transitions to `PENDING_DESKTOP`.
   - Server returns `desktopUrl`, `mobileUrl`, and `wsToken`.

5. **QR generation / pairing artifact**
   - EasyQR returns `mobileUrl`; this is the pairing artifact.
   - A host UI (Blisky or desktop-app) can convert `mobileUrl` to QR for camera pairing.
   - Server does not generate QR image binaries; it provides pairing URLs/tokens.

6. **Mobile pairing**
   - User opens/scans into `mobileUrl`.
   - Mobile scanner page gets `sessionId` + `token` from URL query.

7. **WebSocket connection**
   - Desktop and mobile open `/ws` with role + token + session context.
   - Server validates JWT, session existence/expiry, project match, and WS rate limits.

8. **Barcode scan**
   - Mobile scanner reads code (ZXing), builds scan payload, sends `type: "SCAN"`.
   - Server validates payload shape and session constraints (including duplicates).

9. **Event propagation**
   - Accepted scans are emitted to desktop/host subscribers as WS `SCAN` events.
   - Session state messages are sent as `SESSION_STATE`.
   - In multi-instance mode, Redis event bus propagates events across nodes.

10. **Inventory update inside Blisky**
   - SDK emits `scan.received` in Blisky frontend.
   - Blisky maps event data to its own inventory update endpoint/business rule.

# 6. Communication Architecture
## HTTP APIs
Used for control-plane and query operations:
- session creation (`POST /api/sessions`)
- scan history read/clear (`GET/DELETE /api/scans`)
- health/readiness/liveness (`/health`, `/health/live`, `/health/ready`)
- metrics (`/metrics`)
- admin/project/key/audit endpoints

HTTP is request/response, suitable for deterministic setup, auth, and operational checks.

## WebSockets
Used for data-plane real-time scan transport and session state broadcast:
- endpoint: `/ws`
- role-based clients (DESKTOP/HOST/MOBILE)
- server emits `SCAN` and `SESSION_STATE`

WebSockets are required because scan input must be pushed immediately to active host sessions without polling overhead.

# 7. Session Lifecycle Model
EasyQR has two layers of state: persisted server session states and client-facing operational states.

## Server-persisted session states (implemented)
- `CREATED`
- `PENDING_DESKTOP`
- `WAITING_MOBILE`
- `ACTIVE`
- `TERMINATED`
- `EXPIRED`

## Client-facing operational states (for integration UX)
| Operational State | Typical Trigger | Backing Server/Event Signal |
|---|---|---|
| `idle` | Before session creation | No active session context |
| `connecting` | Session created, WS handshake in progress | `PENDING_DESKTOP` / WS not yet open |
| `connected` | Desktop/mobile WS established | `SESSION_STATE` updates, `connection.open` |
| `scanning` | Mobile actively sending scan frames | `SCAN` events received |
| `expired` | Session TTL elapsed or server marks expired | `EXPIRED`, 410 responses, WS close |
| `error` | Auth/payload/rate-limit/connection failures | API errors, `connection.error`, WS close codes |

# 8. Data Ownership Boundary
| Boundary | Owned by Blisky | Owned by EasyQR |
|---|---|---|
| Inventory domain model (items, stock logic) | Yes | No |
| Session orchestration for scanning | Via SDK call sites | Yes |
| Scan transport protocol and validation | Consumes results | Yes |
| Mobile scanner runtime | Can embed/redirect | Yes (reference app in repo) |
| Audit, rate-limit, readiness/liveness internals | No | Yes |
| Final inventory update persistence | Yes | No |

# 9. Deployment Boundary
EasyQR server is intentionally independent from the client backend:
- Blisky remains the system of record for inventory.
- EasyQR acts as a specialized real-time input service.
- Integration contract is API + SDK, not shared process/runtime.
- This separation allows independent deployment, scaling, and lifecycle control without coupling to Blisky’s backend release cycle.

# 10. Technology Responsibilities
| Technology | Responsibility in EasyQR |
|---|---|
| Docker / Compose | Reproducible runtime packaging for server + PostgreSQL + Redis |
| Redis Event Bus | Cross-instance event propagation (`scan.accepted`, session state change fan-out) |
| Redis (Rate Limit) | Minute-bucket counters for API/WS rate limit enforcement |
| Node.js Server (Express + ws) | Session API, auth, WS routing, validation, health/metrics, lifecycle |
| SDK Layer (`@easyqr/sdk`) | Client integration API and typed event interface |
| WebSockets | Low-latency bidirectional session communication for scans/state |
| PostgreSQL | Persistent sessions/scans/security/audit data (when enabled) |

# 11. Reliability Principles
- **Real-time first path**: scan data is pushed via WS, not polled.
- **Plugin isolation**: EasyQR is an external service boundary; Blisky integration remains explicit and controlled.
- **Scale readiness**: data layer supports PostgreSQL persistence; Redis bus supports multi-instance event coordination.
- **Graceful lifecycle**: readiness/liveness/draining states avoid abrupt cutovers.
- **Operational visibility**: structured logs, request IDs, health endpoints, and `/metrics` expose runtime behavior.
- **Failure containment**: auth, tenant checks, and payload validation reject invalid traffic early.

# 12. Mental Model Summary
If you remember only one thing about EasyQR architecture: **EasyQR is a dedicated real-time scanning transport layer that sits beside Blisky, not inside it; Blisky owns inventory decisions, EasyQR owns session-safe scan capture and delivery.**
