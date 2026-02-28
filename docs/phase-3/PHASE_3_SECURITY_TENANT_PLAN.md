# Phase 3 Security + Tenant Controls Plan

## Objective
Harden EasyQR for safe client-facing deployment by implementing secure tenant authentication and abuse protection:
- hashed API keys
- key rotation and revocation
- per-project and per-IP rate limiting
- security-grade audit trails

## Architectural Position
This plan extends Phase 2 (PostgreSQL + Redis) without changing the external product workflow.
- PostgreSQL is used for durable key metadata and audit events.
- Redis is used for distributed rate-limit counters across instances.
- Existing session creation and WebSocket entry points become policy-enforced.

## Scope

### Included
- Hashed key storage and verification path.
- Key lifecycle controls (create, rotate, revoke, expire).
- Rate limits for `/api/sessions` and `/ws` handshake.
- Security audit events for auth and limiter decisions.
- Backward compatibility strategy for legacy env-based keys.

### Excluded
- UI/admin dashboard implementation.
- Customer billing/plan management.
- Third-party IAM integration (SSO/OIDC).
- Full compliance certification workflows.

## Execution Checklist

### A) Design & Contracts
- [ ] Finalize client auth contract: `projectId`, `keyId`, `apiKeySecret`.
- [ ] Define error codes for all security rejects (`INVALID_KEY`, `KEY_REVOKED`, `RATE_LIMITED`, etc.).
- [ ] Define key rotation overlap policy and max overlap duration.
- [ ] Define revocation behavior and propagation guarantees.
- [ ] Define audit event schema and mandatory fields.

### B) Data Model & Migrations
- [ ] Add `easyqr_project_keys` migration with indexes and status fields.
- [ ] Add `easyqr_audit_events` migration for append-only security telemetry.
- [ ] Add migration rollback safety notes and compatibility checks.
- [ ] Verify migration idempotency in repeated runs.

### C) Key Security Implementation
- [ ] Implement key hashing service (Argon2id preferred, bcrypt fallback).
- [ ] Implement constant-time verification path.
- [ ] Ensure plaintext secrets are never persisted.
- [ ] Ensure plaintext secrets are never logged.
- [ ] Add key expiry and status validation in auth path.

### D) Rotation & Revocation
- [ ] Implement key create flow (secret shown once).
- [ ] Implement key revoke flow (immediate deny).
- [ ] Implement dual-active rotation overlap behavior.
- [ ] Track `last_used_at`, `last_used_ip` for operational safety.
- [ ] Emit audit events for create/revoke/expire.

### E) Rate Limiting & Abuse Controls
- [ ] Implement per-project limiter for session creation.
- [ ] Implement per-IP limiter for session creation.
- [ ] Implement per-project/IP limiter for WebSocket handshake.
- [ ] Return deterministic `429` responses with retry hint metadata.
- [ ] Emit limiter decision events to audit store.

### F) Audit Trail
- [ ] Emit auth allow/deny events with reason codes.
- [ ] Emit origin/CORS/security violation events.
- [ ] Emit key lifecycle events (create/revoke/expire/use).
- [ ] Add paginated audit query API for investigations.
- [ ] Add retention policy and archival guidance.

### G) Backward Compatibility & Migration
- [ ] Keep legacy `EASYQR_PROJECT_KEYS` path behind explicit compatibility mode.
- [ ] Log deprecation warnings for legacy mode usage.
- [ ] Publish migration path from env keys to hashed DB keys.
- [ ] Define legacy disable date and rollout guardrails.

### H) Testing & Proof
- [ ] Unit tests: hash/verify/expiry/revoke behavior.
- [ ] Integration tests: valid/invalid auth for `/api/sessions` and `/ws`.
- [ ] Rotation tests: overlap window and post-revoke deny.
- [ ] Rate-limit tests: per-project and per-IP policy enforcement.
- [ ] Audit tests: event completeness and queryability.

## Definition of Done
Phase 3 Security + Tenant Controls is complete only when all are true:
- API key authentication is hash-based with no plaintext persistence.
- Rotation/revocation are fully functional and validated.
- Distributed rate limiting protects API and WebSocket surfaces.
- Security audit events are complete, durable, and queryable.
- Legacy auth compatibility behavior is explicit, controlled, and documented.
- Test matrix and proof artifacts are complete and reproducible.

## Suggested Execution Order
1. Contract and error taxonomy finalization.
2. Schema migrations for keys and audit events.
3. Hash/verify auth path integration.
4. Rotation/revocation feature delivery.
5. Rate limiting implementation (API then WS).
6. Audit pipeline and query surface.
7. Compatibility mode + migration docs.
8. Full verification and sign-off.
