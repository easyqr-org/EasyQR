# Phase 3 Wave 3 Plan: Rate Limiting

## Objective
Introduce production-grade request and connection throttling controls to protect EasyQR from abuse and traffic spikes while preserving tenant fairness.

## Scope
This wave defines and validates rate-limit behavior for API and WebSocket entry points.

## Included Endpoints
- `POST /api/sessions`
- `GET /api/scans`
- `DELETE /api/scans`
- `WS /ws` handshake

## Excluded Scope
- No business-level quota billing.
- No user-facing dashboard for rate-limit analytics.
- No adaptive machine-learning based traffic profiling.
- No route-level custom policies beyond listed endpoints.

## Algorithm Decision
Use fixed 1-minute bucket counters in Redis:
- Counter increment via `INCR`
- Window expiry via `EXPIRE`
- Bucket key format by dimension (project/ip/endpoint/type)

Rationale:
- deterministic and easy to audit
- simple distributed behavior across instances
- low operational complexity for initial rollout

## Configuration Variables
- `EASYQR_RATE_LIMIT_ENABLED` (default: `true`)
- `EASYQR_RATE_LIMIT_API_PROJECT_PER_MIN` (default: `60`)
- `EASYQR_RATE_LIMIT_API_IP_PER_MIN` (default: `120`)
- `EASYQR_RATE_LIMIT_WS_PROJECT_PER_MIN` (default: `30`)
- `EASYQR_RATE_LIMIT_WS_IP_PER_MIN` (default: `60`)

## Definition of Done Checklist
- [ ] Rate-limit config values are parsed and validated.
- [ ] API routes enforce per-project and per-IP caps.
- [ ] WS handshake enforces per-project and per-IP caps.
- [ ] `429` response contract is stable and documented.
- [ ] Redis degraded behavior is defined and tested.
- [ ] Per-project isolation under throttling is verified.
- [ ] Test matrix RL-T1 to RL-T10 is complete with proofs.
