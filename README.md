# EasyQR

<p align="center">
  <b>A production-grade system that syncs QR scans from mobile to desktop in real time.</b>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Status-Active-success"/>
  <img src="https://img.shields.io/badge/Phase-7%20Completed-blue"/>
  <img src="https://img.shields.io/badge/WebSockets-Real--Time-purple"/>
  <img src="https://img.shields.io/badge/Mobile-Optimized-green"/>
</p>

EasyQR is a real-time QR/barcode scanning infrastructure plugin for inventory systems. It replaces dedicated handheld scanners with mobile cameras while preserving low-latency desktop workflows.

## Problem Statement
Inventory teams often depend on USB/Bluetooth barcode scanners tied to a fixed workstation. That setup introduces operational friction:
- Hardware dependency and maintenance overhead
- Limited mobility at receiving, picking, and stock-check points
- Session collisions when multiple operators scan concurrently
- Weak visibility when scan input fails, duplicates, or disconnects

EasyQR exists to provide scanner-grade input behavior using a phone camera, with session-safe routing into desktop inventory workflows.

## Solution Overview
EasyQR provides a session-based architecture where a desktop host session is paired to a mobile scanner over WebSocket. Scans are validated, deduplicated, and streamed back to the desktop/client system in real time.

At integration time, the inventory application embeds `@easyqr/sdk` to:
- Create scan sessions
- Open/attach host connections
- Receive typed scan and session-state events
- Map scan events into inventory update APIs

## Core Features
- Real-time scan streaming from mobile to desktop/client
- WebSocket session pairing with JWT-backed session context
- SDK integration model (`@easyqr/sdk`) for browser clients
- Multi-tenant security controls (project auth, scoped access, key lifecycle)
- Docker deployment support (server + PostgreSQL + Redis)
- Observability and metrics endpoints for operations
- Graceful lifecycle handling (readiness, draining, controlled shutdown)

## Architecture Overview
EasyQR runtime path:

Bliski IMS UI -> EasyQR SDK -> EasyQR Server -> Mobile Scanner -> Scan event -> Bliski inventory update

```mermaid
flowchart LR
  A[Bliski IMS Web App] --> B[@easyqr/sdk]
  B -->|POST /api/sessions| C[EasyQR Server]
  B -->|WS /ws host| C
  D[Mobile Scanner Web App] -->|WS /ws mobile| C
  D -->|Camera scan payload| C
  C -->|SCAN + SESSION_STATE events| B
  B -->|Inventory API update| E[Bliski IMS Backend]
  C --> F[(PostgreSQL)]
  C --> G[(Redis)]
```

## Repository Structure
- `server/`: Node.js/Express API, WebSocket server, security middleware, persistence adapters, migrations, observability
- `sdk/`: `@easyqr/sdk` typed browser SDK (HTTP session creation + WS client events)
- `mobile-scanner/`: mobile-first scanner web app (camera scan UI)
- `desktop-app/`: desktop host-facing UI assets
- `examples/react/`: React integration example consuming `@easyqr/sdk`
- `examples/html/`: framework-free browser integration example
- `integration-test/`: external-consumer validation project for SDK resolution and runtime flow
- `deploy/`: deployment, health-check, and rollback scripts
- `docs/`: phase-by-phase plans, execution reports, test matrices, and proof packs
- `docker-compose.yml`: containerized runtime for server + PostgreSQL + Redis

## How EasyQR Works
1. Client integrates EasyQR SDK in inventory UI.
2. Client creates a session (`POST /api/sessions`) with project credentials.
3. Host session provides pairing context (desktop/mobile URLs, tokenized WS context).
4. Desktop and mobile connect over WebSocket to the same session.
5. Mobile scans barcode/QR; server validates and routes scan event.
6. Client receives typed SDK events and updates inventory state/backend.

## Deployment Modes
- EasyQR Cloud Hosted:
  - EasyQR runs in centrally managed infrastructure.
  - Client integrates SDK and calls hosted endpoints.
- Client Self-Hosted (Docker):
  - Client runs EasyQR stack (server + PostgreSQL + Redis) in their environment.
  - Suitable for data locality and internal-network requirements.
- Hybrid model:
  - Mixed ownership model (for example, hosted control plane with client-side runtime boundaries).
  - Useful when policy requires partial on-prem operation.

## Quick Start
Prerequisites:
- Docker + Docker Compose
- Node.js 18+ (for local non-container workflows)

1. Start full containerized stack:
```bash
docker compose up --build
```

2. Verify service health:
```bash
curl http://localhost:3000/health
curl http://localhost:3000/health/live
curl http://localhost:3000/health/ready
```

3. Optional local server-only workflow:
```bash
cd server
npm install
cp .env.example .env
npm run migrate
npm start
```

4. Try SDK integration example:
```bash
cd examples/react
npm install
npm run dev
```

## SDK Usage Example
```ts
import { createEasyQRClient } from "@easyqr/sdk";

const client = createEasyQRClient({
  baseUrl: "http://localhost:3000",
  projectId: "demo_project",
  apiKey: "demo_key"
});

client.on("connection.open", (e) => {
  console.log("connected", e.sessionId, e.role);
});

client.on("scan.received", (e) => {
  console.log("scan", e.scan.value, e.scan.format);
});

const session = await client.startHost();
console.log("session", session.session.sessionId, session.mobileUrl);
```

## Observability and Reliability
EasyQR includes operational visibility and lifecycle controls:
- Health endpoints: `/health`, `/health/live`, `/health/ready`
- Metrics endpoint: `/metrics`
- Structured logging with request correlation and WebSocket connection context
- Graceful shutdown/drain behavior for HTTP + WebSocket paths
- Restart-safe persistence with PostgreSQL and multi-instance coordination via Redis

## CI/CD and DevOps
The repository includes a GitHub Actions CI workflow that enforces deterministic checks:
- Install job
- Server test/typecheck gates
- SDK typecheck/build/test gates
- Build artifact generation for server and SDK outputs

Deployment and rollback runbooks are included under `deploy/` and `docs/phase-5/`.

## Security Model
Implemented security controls include:
- Project-scoped authentication for API usage
- Hashed API key storage and key lifecycle controls
- Tenant access enforcement (cross-project protections)
- JWT-backed WebSocket session context validation
- Input validation and standardized API error envelopes
- Rate limiting controls for API and WebSocket paths

## Project Phases
Execution is documented phase-by-phase in `docs/`:
- `docs/phase-1/`: stability baseline
- `docs/phase-2/`: persistence and scale foundations
- `docs/phase-3/`: security and tenant controls
- `docs/phase-5/`: deployment, lifecycle, CI, observability
- `docs/phase-6/`: acceptance hardening planning

Each phase includes plan, test matrix, execution report, and proof artifacts.

## Production Readiness
Current repository state is deployable and integration-capable:
- Runtime stack supports persistent multi-instance operation
- SDK supports typed client integration for session and scan events
- Operational controls (metrics, health, draining, rollback scripts) are in place
- Phase-based engineering documentation supports auditability and handoff

## Roadmap
Near-term productization priorities:
- Premium desktop host UX
- Premium mobile scanner UX
- Client onboarding/provisioning workflows
- Delivery packaging for enterprise implementation teams

## Contributing
- Use focused branches and clear commit messages.
- Keep changes aligned with documented phase plans.
- Add or update tests for behavior changes.
- Update phase docs when introducing operational or architecture-impacting changes.

## License
MIT License. See `LICENSE`.
