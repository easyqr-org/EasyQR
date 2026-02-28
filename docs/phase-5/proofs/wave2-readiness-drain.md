# Wave 2 Proof — Health, Readiness, Graceful Shutdown

## Objective
Validate production lifecycle safety for EasyQR:
- liveness endpoint
- readiness endpoint
- graceful shutdown on signals
- WebSocket drain behavior during stop

## Commands Executed

```bash
npm test

docker compose build easyqr-server
HOST_PORT=3005 EASYQR_STARTUP_READY_DELAY_MS=30000 docker compose up -d --force-recreate easyqr-server

# Liveness
HOST_PORT=3005 docker compose exec -T easyqr-server wget -qO- --server-response http://localhost:3000/health/live 2>&1

# Readiness before ready (during startup delay)
HOST_PORT=3005 docker compose exec -T easyqr-server sh -lc "wget -qO- --server-response http://localhost:3000/health/ready 2>&1"

# Readiness after ready
sleep 31
HOST_PORT=3005 docker compose exec -T easyqr-server sh -lc "wget -qO- --server-response http://localhost:3000/health/ready 2>&1"

# WS drain probe with controlled stop
docker compose exec -T easyqr-server node -e "...open ws and wait for close..."
HOST_PORT=3005 docker compose stop easyqr-server

# Shutdown and drain logs
HOST_PORT=3005 docker compose logs --no-color --tail=200 easyqr-server
```

## Liveness Result

```text
HTTP/1.1 200 OK
{"status":"alive"}
```

## Readiness Result (Before Ready)

```text
HTTP/1.1 503 Service Unavailable
```

## Readiness Result (After Ready)

```text
HTTP/1.1 200 OK
{"status":"ready"}
```

## Graceful Shutdown + WS Drain Evidence

### WS Probe Output

```text
ws_open:54fd37da-4824-4cb0-bdd5-c7a8105694c4
ws_close:1001:Service draining
```

### Server Logs

```text
{"event":"service.shutdown.start","signal":"SIGTERM","timeoutMs":15000,"wsDrainGraceMs":5000}
{"event":"ws.drain.start","graceMs":5000,"activeConnections":1}
{"event":"ws.connection.closed","code":1001,"reason":"Service draining"}
{"event":"service.shutdown.complete","signal":"SIGTERM"}
```

## Container Stop Timing

From logs:
- `service.shutdown.start`: `06:11:35.137Z`
- `service.shutdown.complete`: `06:11:40.162Z`
- Observed graceful stop window: ~5.0 seconds (within configured timeout 15s).

## Regression Check

- `npm test` result: `50 passed, 0 failed`.
- Phase 1–4 regression not detected.

## Validation Checklist

- [x] `/health/live` always 200 when process is up.
- [x] `/health/ready` returns 503 before readiness.
- [x] `/health/ready` returns 200 after readiness.
- [x] `docker compose stop` triggers graceful shutdown path.
- [x] Existing WS connections drain with close code `1001`.
- [x] No test regression in existing server suite.

