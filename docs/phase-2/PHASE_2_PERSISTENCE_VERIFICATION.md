# Phase 2 Persistence Verification

## Objective
Verify that EasyQR runs in PostgreSQL + Redis mode and that session data persists across a full service restart.

## Environment
- Date: 2026-02-24
- Service: EasyQR (`server/src/index.js`)
- Storage mode: PostgreSQL
- Event bus mode: Redis
- PostgreSQL container: `server-postgres-1`
- Redis container: `server-redis-1`

## Execution Steps
1. Verified Docker infra is up.
   - Command: `docker ps`
   - Evidence: `docs/phase-2/proofs/docker-ps.txt`

2. Ran database migration.
   - Command: `export DATABASE_URL=postgres://easyqr:easyqr@localhost:5432/easyqr && npm run migrate`
   - Result: migration applied successfully.
   - Evidence: `docs/phase-2/proofs/migration-run.txt`

3. Started service in postgres/redis mode and captured startup logs.
   - Confirmed startup log fields:
     - `"storageBackend":"postgres"`
     - `"redisEnabled":true`
   - Evidence: `docs/phase-2/proofs/persistence_startup_log.txt`

4. Created a test session via curl on `localhost:3000` and captured request/response.
   - Endpoint: `POST /api/sessions`
   - Response: `201 Created` with session payload.
   - Evidence: `docs/phase-2/proofs/persistence_session_create.txt`

5. Stopped the running service process (simulated full restart).

6. Started service again and captured restart startup logs.
   - Confirmed startup log fields again:
     - `"storageBackend":"postgres"`
     - `"redisEnabled":true`
   - Evidence: `docs/phase-2/proofs/persistence_restart_log.txt`

7. Queried PostgreSQL after restart to verify persisted session row.
   - Requested query attempted: `SELECT * FROM sessions;` (failed because table does not exist in this schema)
   - Correct EasyQR table query executed: `SELECT ... FROM easyqr_sessions ...`
   - Result: created session row exists after restart.
   - Evidence: `docs/phase-2/proofs/persistence_db_query.txt`

## Evidence Captured
- `docs/phase-2/proofs/docker-ps.txt`
- `docs/phase-2/proofs/migration-run.txt`
- `docs/phase-2/proofs/persistence_startup_log.txt`
- `docs/phase-2/proofs/persistence_session_create.txt`
- `docs/phase-2/proofs/persistence_restart_log.txt`
- `docs/phase-2/proofs/persistence_db_query.txt`

## Result
- PostgreSQL + Redis activation verified at startup.
- Session creation works in postgres mode.
- Session row persisted across service restart.

## Conclusion
Phase 2 persistence restart verification is successful: EasyQR is operating with PostgreSQL persistence and Redis enabled, and session data survives full process restart.
