# Phase 5 Wave Breakdown

## Wave 1 — Containerization Baseline
### Scope
- Define and implement runtime container images for app.
- Define local/staging compose manifests.
- Validate app boot, migrations, and dependency wiring in containers.

### Risks
- Build/runtime mismatch (Node version, native modules).
- Secrets leakage through image layers.

### Validation
- Container startup logs clean.
- Health endpoint reachable.
- End-to-end session + WS flow passes.

### Definition of Done
- Reproducible image build.
- App + Postgres + Redis run in isolated network.
- No plaintext secrets embedded in images.

## Wave 2 — Health, Readiness, Graceful Draining
### Scope
- Liveness/readiness endpoints and semantics.
- Graceful shutdown sequencing.
- WS connection drain strategy.

### Risks
- Premature traffic routing to non-ready instances.
- Connection drops during rollout.

### Validation
- Readiness blocks traffic until dependencies are ready.
- Rolling restart preserves service availability.
- WS drain behavior documented and observed.

### Definition of Done
- Distinct liveness/readiness behavior implemented.
- Shutdown completes within configured timeout.
- No abrupt WS termination under normal rollout.

## Wave 3 — CI Pipeline Design & Enforcement
### Scope
- CI stages: lint, test, build, migration check, package verification.
- Artifact generation and retention policy.

### Risks
- False green pipeline missing runtime regressions.
- Long pipeline time reducing deployment velocity.

### Validation
- Pipeline blocks merge on failed gates.
- Artifacts produced per commit/tag.

### Definition of Done
- Required checks enforced.
- Deterministic build outputs.
- Release candidate artifact traceability.

## Wave 4 — Observability & Monitoring
### Scope
- Structured log conventions and correlation IDs.
- Metrics definitions and alert thresholds.
- Dependency health visibility.

### Risks
- Missing cardinal signals during incidents.
- Alert noise and fatigue.

### Validation
- Dashboards cover API, WS, DB, Redis, errors.
- Alert runbook tested with failure drills.

### Definition of Done
- Baseline dashboards live.
- Actionable alerts with runbooks.
- Incident triage path documented.

## Wave 5 — Deployment, Promotion, Rollback
### Scope
- Staging promotion rules.
- Zero-downtime production deployment model.
- Rollback procedure with DB safety rules.

### Risks
- Schema incompatibility during rollback.
- Partial rollout inconsistency.

### Validation
- Staging-to-prod promotion drill complete.
- Rollback drill executed and timed.

### Definition of Done
- Controlled production release process operational.
- Rollback path validated under time-bound objective.
- Post-release verification checklist enforced.

