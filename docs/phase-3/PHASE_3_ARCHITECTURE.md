# Phase 3 Architecture: Resilience, Performance, and Operability

## Architectural Intent
Phase 3 introduces operational control planes around the existing data plane.

Existing data plane (from Phase 2):
- HTTP session API
- WebSocket role routing
- PostgreSQL persistence
- Redis pub/sub cross-instance propagation

New control planes in Phase 3:
- Capacity control plane (rate limiting, admission control, backpressure)
- Reliability control plane (dependency health, retries, graceful degradation)
- Observability control plane (metrics, readiness/liveness, enriched logs)
- Security control plane (hardened validation and abuse protections)

## Target Topology
1. Edge/API Layer
- Express endpoints with per-project/IP rate limiting and request shaping.

2. Realtime Layer
- WebSocket acceptor with connection quotas and message size constraints.
- Session-aware throttling for scan ingestion.

3. Persistence Layer
- PostgreSQL remains source of truth for sessions and scans.
- Transactional guarantees for scan dedupe and write consistency.

4. Coordination Layer
- Redis pub/sub for cross-instance event propagation.
- Redis degraded-mode contract defined (local delivery + warning signals, bounded behavior).

5. Operational Layer
- `/health/live` for process liveness.
- `/health/ready` for dependency readiness.
- `/metrics` for Prometheus scraping.
- Structured logs with consistent dimensions.

## Failure Mode Strategy

### PostgreSQL Unavailable
- Startup: service must fail readiness and refuse full operation.
- Runtime: write paths fail fast with explicit error codes; no silent fallback to memory.
- Recovery: periodic dependency check restores readiness when DB returns.

### Redis Unavailable
- Startup: service may start in degraded mode if policy allows.
- Runtime: local node functionality continues; cross-node propagation flagged degraded.
- Recovery: reconnect with exponential backoff and jitter; publish/subscribe resumes automatically.

### Overload Conditions
- Session create bursts: rate limit and return explicit throttling errors.
- WS connection spikes: admission control prevents resource exhaustion.
- Scan flood: per-session throttling and bounded buffers prevent event-loop starvation.

## Data Integrity Controls
- Idempotent scan write path through dedupe keys/hash semantics.
- Clear duplicate rejection telemetry (`scan_rejected_duplicate_total`).
- Strict payload schema and message size limits before persistence path.

## Graceful Lifecycle
- Startup sequence:
  - Parse/validate config
  - Initialize dependencies
  - Validate readiness state
  - Begin accepting traffic

- Shutdown sequence:
  - Stop accepting new connections
  - Drain active sockets with timeout
  - Flush/persist in-flight operations
  - Close DB/Redis clients
  - Exit with explicit status

## Security Posture Enhancements
- JWT verification hardening (claims, algorithm pinning, expiry handling).
- CORS and origin enforcement by default-deny in production config.
- Input boundaries for HTTP/WS payload sizes and field constraints.
- Abuse visibility and controls via rate limiting and security event logs.

## Observability Model
Metrics domains:
- Traffic: requests/sec, ws connect rate.
- Errors: auth failures, validation failures, dependency errors.
- Latency: API and scan propagation histograms.
- Saturation: open sockets, queue depth, throttled events.

Logs:
- JSON structured events with correlation identifiers and consistent event naming.

Readiness/liveness:
- Liveness: process operational.
- Readiness: dependencies and critical subsystems healthy for traffic.

## Deployment Readiness Principles
- Immutable runtime image, non-root execution.
- Explicit env contracts and startup validation.
- Healthcheck integration for orchestrators.
- Migration execution policy defined per release.
