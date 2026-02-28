# Phase 2 Implementation Notes

## Runtime Data Mode
Configured by environment:
- `EASYQR_STORAGE_BACKEND=memory` (default)
- `EASYQR_STORAGE_BACKEND=postgres` (requires `DATABASE_URL`)

Redis coordination:
- `EASYQR_REDIS_ENABLED=true` requires `REDIS_URL`
- Pub/sub channel configured with `EASYQR_REDIS_CHANNEL`

## New Components
- `server/src/data/memoryStore.js`:
  - In-memory fallback preserving existing behavior.
- `server/src/data/postgresStore.js`:
  - Persistent sessions/scans.
  - Transactional duplicate-scan guard using `last_scan_hash`.
- `server/src/events/redisBus.js`:
  - Cross-instance event propagation.
- `server/src/events/noopBus.js`:
  - Local single-instance no-op event bus.

## Multi-Instance Behavior
1. Instance A accepts a scan and stores it.
2. Instance A publishes `scan.accepted` on Redis.
3. Instance B receives event and broadcasts to local sockets for that session.

Session state changes are propagated similarly with `session.state_changed`.

## Database Schema
Migration file: `server/migrations/001_init_easyqr.sql`
- `easyqr_sessions`
- `easyqr_scans`
- indexes on project, expiry, and scan lookup paths.

## Operational Notes
- Health endpoint now reports `storageBackend` and `redisEnabled`.
- Existing API/SDK response contracts remain unchanged.
- In-memory mode continues to support local development without DB/Redis.
