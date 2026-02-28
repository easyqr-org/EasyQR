# Wave 4B Proof — Metrics Exposure

## Objective
Expose minimal operational counters via HTTP endpoint (`/metrics`) without changing business/runtime contracts.

## Commands

```bash
# start server (memory mode, no redis dependency)
PORT=3013 JWT_SECRET=very_strong_secret_123 SESSION_TTL_SECONDS=600 \
EASYQR_STORAGE_BACKEND=memory EASYQR_REDIS_ENABLED=false \
EASYQR_PROJECT_KEYS='' EASYQR_ALLOW_LEGACY_KEYS=true \
node src/index.js

# generate some activity
curl http://localhost:3013/health/live
POST /api/sessions + one ws connect/close

# read metrics
curl http://localhost:3013/metrics
```

## Sample Output

```text
http_requests_total 3
http_errors_total 0
ws_connections_active 0
ws_connections_total 1
redis_disconnects_total 0
```

## Wiring Summary

- HTTP counters:
  - `incHttpRequest()` in `request.received`
  - `incHttpError()` when `statusCode >= 500` on `request.completed`
- WS counters:
  - `incWsTotal()` + `incWsConnected()` on accepted connection
  - `decWsConnected()` on connection close
- Redis counter:
  - `incRedisDisconnect()` where `redis.disconnected` is logged

