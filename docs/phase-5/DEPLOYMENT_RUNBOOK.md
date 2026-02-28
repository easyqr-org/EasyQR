# Deployment Runbook — Phase 5 Wave 5

## Scope
Script-based controlled deployment and rollback using Docker Compose and image tags.

## Promotion Model
1. Dev validation
2. Staging deployment
3. Production promotion

Flow: `dev -> staging -> production`

## Prerequisites
- Docker engine running.
- Compose file present at repo root.
- `deploy/` scripts executable.
- Environment values configured (`HOST_PORT`, secrets, DB/Redis URLs if overridden).

## Staging Deployment

```bash
export IMAGE_TAG=staging-<build-id>
export HOST_PORT=3000
./deploy/deploy.sh
```

Expected result:
- compose services up
- `/health/ready` returns HTTP 200 within timeout

## Production Promotion

```bash
export IMAGE_TAG=prod-<release-id>
export HOST_PORT=3000
./deploy/deploy.sh
```

Recommended process:
1. confirm staging success with same tag
2. promote same immutable tag to production
3. run post-deploy verification checklist

## Rollback

```bash
export PREVIOUS_IMAGE_TAG=<last-known-good-tag>
export HOST_PORT=3000
./deploy/rollback.sh
```

Rollback behavior:
- stop current stack (`docker compose down`)
- start previous image tag (`docker compose up -d --no-build`)
- block until readiness succeeds

## Post-Deploy Verification Checklist
- [ ] `docker compose ps` shows all services healthy/running.
- [ ] `curl -f http://localhost:${HOST_PORT}/health/live` succeeds.
- [ ] `curl -f http://localhost:${HOST_PORT}/health/ready` succeeds.
- [ ] `GET /metrics` reachable and returns counters.
- [ ] Basic session creation and WS connection smoke test passes.
- [ ] No spike in error logs after deploy.

