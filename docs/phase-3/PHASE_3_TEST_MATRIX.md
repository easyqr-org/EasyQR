# Phase 3 Test Matrix

## Automated Verification

| ID | Domain | Scenario | Expected Result | Evidence | Status |
|---|---|---|---|---|---|
| P3-T1 | Config | Invalid production config | Startup fails with explicit validation error | startup logs | [ ] |
| P3-T2 | Security | Invalid JWT / claim mismatch | Connection/request rejected with correct error code | test output + logs | [ ] |
| P3-T3 | Security | CORS origin denied | Request blocked and logged | test output + logs | [ ] |
| P3-T4 | Performance | API rate limit exceeded | 429 returned with throttle telemetry increment | test output + metrics snapshot | [ ] |
| P3-T5 | Performance | WS admission limit exceeded | New connection denied, existing stable | ws test output | [ ] |
| P3-T6 | Reliability | Redis disconnect during traffic | Local flow continues, degraded signal emitted | resilience test logs | [ ] |
| P3-T7 | Reliability | DB outage on write path | Explicit failure response, no silent fallback | resilience test logs | [ ] |
| P3-T8 | Reliability | Graceful shutdown with active sockets | Drains within timeout, no corrupted writes | shutdown logs | [ ] |
| P3-T9 | Observability | Metrics endpoint integrity | Required counters/histograms exposed | metrics dump | [ ] |
| P3-T10 | Data Integrity | Duplicate/retry scan behavior | Deterministic dedupe across retries | test output + DB query | [ ] |

## Manual / Staging Verification

| ID | Scenario | Expected Result | Proof Artifact | Status |
|---|---|---|---|---|
| P3-M1 | Sustained load test | Meets target p95 latency and error budget | `docs/phase-3/proofs/load-test-report.md` | [ ] |
| P3-M2 | Redis restart drill | Service enters and exits degraded mode cleanly | `docs/phase-3/proofs/redis-failure-recovery.md` | [ ] |
| P3-M3 | PostgreSQL outage drill | Readiness fails, recovery restores readiness | `docs/phase-3/proofs/db-failure-recovery.md` | [ ] |
| P3-M4 | Graceful deploy restart | No abrupt disconnect storm, clean drain | `docs/phase-3/proofs/graceful-shutdown.md` | [ ] |
| P3-M5 | Security regression pass | Abuse and invalid token paths blocked | `docs/phase-3/proofs/security-hardening-checks.md` | [ ] |

## Exit Gate
Phase 3 can only close when all `P3-T*` and `P3-M*` entries are marked complete with linked evidence.
