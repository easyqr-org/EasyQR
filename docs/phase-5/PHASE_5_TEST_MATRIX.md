# Phase 5 Test Matrix

## A. Infrastructure & Build

| ID | Area | Scenario | Expected Result | Stage |
|---|---|---|---|---|
| P5-I1 | Image Build | Build app image from clean environment | Deterministic image created | CI Build |
| P5-I2 | Container Boot | App + Postgres + Redis startup | All services healthy | Staging |
| P5-I3 | Config Injection | Env + secrets supplied at runtime | No missing/invalid critical config | Staging |

## B. Deployment Safety

| ID | Area | Scenario | Expected Result | Stage |
|---|---|---|---|---|
| P5-D1 | Readiness Gate | App starts before dependencies ready | Instance stays not-ready | Staging |
| P5-D2 | Rolling Deploy | Deploy new version with active traffic | No downtime, no elevated 5xx spike | Staging |
| P5-D3 | Rollback | Revert failed release | Service restored within rollback SLO | Staging |

## C. WebSocket Reliability

| ID | Area | Scenario | Expected Result | Stage |
|---|---|---|---|---|
| P5-W1 | Connection Drain | Pod receives shutdown signal | Existing WS sessions drain cleanly | Staging |
| P5-W2 | Multi-node Routing | Sessions span multiple nodes | Events continue via Redis coordination | Staging |
| P5-W3 | Reconnect Behavior | Node restarts during active sessions | Clients recover without data corruption | Staging |

## D. Data & Migration Safety

| ID | Area | Scenario | Expected Result | Stage |
|---|---|---|---|---|
| P5-M1 | Forward Migration | Apply latest migration | Schema update succeeds | CI/Staging |
| P5-M2 | Backward Compatibility | Old app reads post-migration schema | No critical break during rollout window | Staging |
| P5-M3 | Backup Restore | Restore latest backup snapshot | Recoverable and consistent state | Staging Drill |

## E. Observability

| ID | Area | Scenario | Expected Result | Stage |
|---|---|---|---|---|
| P5-O1 | Logging | Error event occurs | Structured logs include request/session/project IDs | Staging |
| P5-O2 | Metrics | API and WS load generated | Dashboard metrics update correctly | Staging |
| P5-O3 | Alerts | Forced dependency outage | Alert fires and runbook path is actionable | Staging Drill |

## F. CI/CD Governance

| ID | Area | Scenario | Expected Result | Stage |
|---|---|---|---|---|
| P5-C1 | Required Checks | Unit/integration test fail | Merge/deploy blocked | CI |
| P5-C2 | Artifact Traceability | Release tag built | Immutable artifact linked to commit SHA | CI |
| P5-C3 | Approval Gate | Promote to production | Manual approval required and logged | Release |

