# Wave 5 Proof — Deployment, Promotion, Rollback

## Objective
Validate controlled script-based deployment and rollback flow with tagged images and readiness gating.

## Execution

### Baseline previous tag preparation

```bash
IMAGE_TAG=wave5-prev HOST_PORT=3005 docker compose build easyqr-server
IMAGE_TAG=wave5-prev HOST_PORT=3005 docker compose up -d
TIMEOUT_SECONDS=120 HOST_PORT=3005 ./deploy/health-check.sh
```

### Deploy current release

```bash
IMAGE_TAG=wave5-current HOST_PORT=3005 TIMEOUT_SECONDS=120 ./deploy/deploy.sh
```

Result snippet:

```text
[deploy] image tag: wave5-current
ready: http://localhost:3005/health/ready
[deploy] success
```

### Rollback to previous release

```bash
PREVIOUS_IMAGE_TAG=wave5-prev HOST_PORT=3005 TIMEOUT_SECONDS=120 ./deploy/rollback.sh
```

Result snippet:

```text
[rollback] image tag: wave5-prev
ready: http://localhost:3005/health/ready
[rollback] success
```

## Readiness Verification

```json
{"status":"ready"}```

## Validation Checklist

- [x] deploy script executes build/up/readiness flow.
- [x] readiness gate blocks until `/health/ready` succeeds.
- [x] rollback script restores previous tagged image and verifies readiness.
- [x] promotion model remains manual/scripted (`dev -> staging -> production`).

