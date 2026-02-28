# Phase 3 Proof Pack

## Core Phase 3 Operational Proofs
- `load-test-report.md`
- `redis-failure-recovery.md`
- `db-failure-recovery.md`
- `graceful-shutdown.md`
- `security-hardening-checks.md`
- `metrics-snapshot.txt`

## Security + Tenant Control Proofs
- `security-key-rotation.md`
  - key create, overlap rotation, revoke validation, command outputs.

- `security-rate-limit.md`
  - per-project and per-IP throttling proof for API and WS, with metrics.

- `security-audit-trail.md`
  - audit event persistence, query examples, root-cause trace walkthrough.

- `security-migration-output.txt`
  - migration command output including security schema migration.

- `test-run-wave1.txt`
  - complete automated test output for Wave 1.

- `security-db-hash-check.txt`
  - PostgreSQL evidence that only hashed keys are stored.

- `wave2-migration-output.txt`
  - migration output including tenant isolation and FK constraints migration.

- `wave2-cross-tenant-rejection.txt`
  - live cross-project access rejection evidence.

- `wave2-expiry-rejection.txt`
  - expired session rejection evidence (`410`).

- `wave2-admin-auth.txt`
  - admin endpoint auth checks for missing/invalid/valid token.

- `wave2-legacy-compatibility.txt`
  - legacy fallback behavior with `EASYQR_ALLOW_LEGACY_KEYS` false/true.

- `wave2-fk-constraints.txt`
  - PostgreSQL query output proving FK constraints on sessions/scans.

- `test-run-wave2.txt`
  - full automated Wave 2 test output.

## Evidence Standard
Each proof must include:
- timestamp and environment
- exact command sequence
- raw output excerpts
- pass/fail decision
- linked logs/queries/screenshots where relevant

## Closure Rule
Phase 3 cannot close until:
- `docs/phase-3/PHASE_3_TEST_MATRIX.md` is complete, and
- `docs/phase-3/PHASE_3_SECURITY_TEST_MATRIX.md` is complete, and
- all listed artifacts exist with reproducible evidence.
