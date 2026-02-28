#!/usr/bin/env bash
set -euo pipefail

IMAGE_TAG="${IMAGE_TAG:-latest}"
HOST_PORT="${HOST_PORT:-3000}"
TIMEOUT_SECONDS="${TIMEOUT_SECONDS:-90}"

export IMAGE_TAG HOST_PORT

echo "[deploy] image tag: $IMAGE_TAG"
echo "[deploy] host port: $HOST_PORT"

docker compose pull postgres redis || true
docker compose build easyqr-server
docker compose up -d

TIMEOUT_SECONDS="$TIMEOUT_SECONDS" HOST_PORT="$HOST_PORT" ./deploy/health-check.sh

echo "[deploy] success"
