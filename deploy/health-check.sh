#!/usr/bin/env bash
set -euo pipefail

HEALTH_URL="${HEALTH_URL:-http://localhost:${HOST_PORT:-3000}/health/ready}"
TIMEOUT_SECONDS="${TIMEOUT_SECONDS:-90}"
INTERVAL_SECONDS="${INTERVAL_SECONDS:-2}"

start_ts=$(date +%s)

while true; do
  if curl -fsS "$HEALTH_URL" >/dev/null 2>&1; then
    echo "ready: $HEALTH_URL"
    exit 0
  fi

  now_ts=$(date +%s)
  elapsed=$((now_ts - start_ts))
  if [ "$elapsed" -ge "$TIMEOUT_SECONDS" ]; then
    echo "readiness timeout after ${TIMEOUT_SECONDS}s: $HEALTH_URL" >&2
    exit 1
  fi

  sleep "$INTERVAL_SECONDS"
done
