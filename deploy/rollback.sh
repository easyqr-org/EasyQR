#!/usr/bin/env bash
set -euo pipefail

PREVIOUS_IMAGE_TAG="${PREVIOUS_IMAGE_TAG:-}"
HOST_PORT="${HOST_PORT:-3000}"
TIMEOUT_SECONDS="${TIMEOUT_SECONDS:-90}"

if [ -z "$PREVIOUS_IMAGE_TAG" ]; then
  echo "PREVIOUS_IMAGE_TAG is required" >&2
  exit 1
fi

export IMAGE_TAG="$PREVIOUS_IMAGE_TAG"
export HOST_PORT

echo "[rollback] image tag: $IMAGE_TAG"
echo "[rollback] host port: $HOST_PORT"

docker compose down
docker compose up -d --no-build

TIMEOUT_SECONDS="$TIMEOUT_SECONDS" HOST_PORT="$HOST_PORT" ./deploy/health-check.sh

echo "[rollback] success"
