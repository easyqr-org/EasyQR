# Phase 2 Test Matrix

## Automated Verification

| ID | Scenario | Expected Result | Status |
|---|---|---|---|
| P2-T1 | Existing middleware/store tests | Continue passing after Phase 2 refactor | [x] |
| P2-T2 | Config validation for storage modes | Reject invalid `EASYQR_STORAGE_BACKEND` and missing `DATABASE_URL` in postgres mode | [x] |
| P2-T3 | Config validation for Redis mode | Reject missing `REDIS_URL` when enabled | [x] |
| P2-T4 | Data layer fallback | Memory backend remains default and operational | [x] |

## Manual/Infra Verification (Staging)

| ID | Scenario | Evidence File | Status |
|---|---|---|---|
| P2-M1 | Run DB migration against PostgreSQL | `docs/phase-2/proofs/migration-run.txt` | [x] |
| P2-M2 | Start two server instances with Redis and validate cross-instance delivery | `docs/phase-2/proofs/multi-instance-flow.md`, `docs/phase-2/proofs/multi-instance-probe-output.txt` | [x] |
| P2-M3 | Restart server and validate persisted session/scan data | `docs/phase-2/proofs/persistence_restart_log.txt`, `docs/phase-2/proofs/persistence_db_query.txt` | [x] |
| P2-M4 | Run `npm run verify:phase2` and capture output | `docs/phase-2/proofs/test-run.txt` | [x] |
