# Phase 2 Plan: Persistence + Scale

## Objective
Deliver persistent, multi-instance-ready data flow for EasyQR so sessions and scans survive process restarts and can be scaled beyond one server instance.

## Inputs from Phase 1
- Standard request IDs and structured logs already in place.
- Standardized API error envelopes already in place.
- Baseline test suite and verification discipline already established.

## Scope
- PostgreSQL-backed session + scan storage.
- Redis pub/sub event bus for cross-instance delivery.
- Storage abstraction so runtime can choose `memory` or `postgres` backend.
- Migration tooling and production-oriented configuration.
- Phase-2 documentation, checklist, and proof pack.

## Out of Scope
- Admin/tenant management UI.
- Rate limiting and key rotation (Phase 3).
- Full production deployment automation (later phase).

## Deliverables
- `server/src/data/*` store abstraction and adapters.
- `server/src/events/*` pub/sub event bus adapters.
- `server/migrations/001_init_easyqr.sql` schema.
- `server/scripts/run-migrations.js` migration runner.
- Runtime wiring updates in `server/src/index.js` and `server/src/wsServer.js`.

## Completion Checklist
- [x] Storage abstraction introduced.
- [x] Memory store retained for local fallback/testing.
- [x] PostgreSQL store implemented for sessions/scans.
- [x] Redis bus implemented for cross-instance scan/session propagation.
- [x] Server runtime selects backend by env config.
- [x] Health endpoint reports storage/redis mode.
- [x] Migration SQL and migration runner added.
- [x] Package scripts/dependencies updated for Phase 2.
- [x] Tests pass after integration.
- [x] Phase 2 docs + proofs created.
