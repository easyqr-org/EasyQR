# Wave 4A Proof — Observability Foundation

## Objective
Establish structured observability baseline with request correlation IDs, HTTP lifecycle logs, WebSocket connection correlation, and dependency connectivity visibility.

## Middleware Wiring Points

- `server/src/index.js`
  - `app.use(requestContext)` registered early before routes.
  - `app.use(requestLogger(logger))` registered early before routes.
- `server/src/observability/requestContext.js`
  - Sets/reuses `req.requestId`.
  - Sets `res.locals.requestId`.
  - Sets response header `x-request-id`.

## Sample Structured HTTP Log

```json
{"timestamp":"2026-02-26T06:25:39.006Z","level":"info","event":"request.received","service":"easyqr-service","requestId":"req-wave4a-1","method":"GET","path":"/health/live"}
{"timestamp":"2026-02-26T06:25:39.011Z","level":"info","event":"request.completed","service":"easyqr-service","requestId":"req-wave4a-1","method":"GET","path":"/health/live","statusCode":200,"durationMs":5.14}
```

## Sample Structured WS Log

```json
{"timestamp":"2026-02-26T06:25:56.891Z","level":"info","event":"ws.connected","service":"easyqr-service","sessionId":"b1396acd-3e2e-4807-b2e6-013fe2b0bbd3","projectId":"wave4a_demo","role":"HOST","connectionId":"01a94551-80de-4996-939b-6525b85c4d89"}
{"timestamp":"2026-02-26T06:25:57.094Z","level":"info","event":"ws.closed","service":"easyqr-service","sessionId":"b1396acd-3e2e-4807-b2e6-013fe2b0bbd3","role":"HOST","code":1005,"reason":null,"connectionId":"01a94551-80de-4996-939b-6525b85c4d89"}
```

## Request ID Propagation Example

Incoming request header:

```http
x-request-id: req-wave4a-2
```

Observed logs for same request:

```json
{"event":"request.received","requestId":"req-wave4a-2","method":"POST","path":"/api/sessions"}
{"event":"request.completed","requestId":"req-wave4a-2","method":"POST","path":"/api/sessions","statusCode":401}
```

## Dependency Visibility Logs

```json
{"timestamp":"2026-02-26T06:26:52.103Z","level":"info","event":"postgres.connected","service":"easyqr-service","storageBackend":"postgres"}
{"timestamp":"2026-02-26T06:26:52.179Z","level":"info","event":"redis.connected","service":"easyqr-service","source":"rate_limit"}
{"timestamp":"2026-02-26T06:26:52.184Z","level":"info","event":"redis.connected","service":"easyqr-service","source":"event_bus"}
{"timestamp":"2026-02-26T06:27:20.253Z","level":"info","event":"redis.disconnected","service":"easyqr-service","source":"event_bus"}
```

## Validation Notes

- JSON-only structured log output is preserved.
- Correlation IDs are now consistently available on request logs.
- WebSocket logs include per-connection `connectionId`.
- No API contract or business-flow behavior changes were introduced.

