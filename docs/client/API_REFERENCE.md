# What is EasyQR API?
EasyQR API is the integration interface for real-time scan session orchestration.

It exposes:
- REST endpoints for session/control/observability operations
- WebSocket endpoint for live scan and session-state streaming

Scope boundary:
- EasyQR API manages scan sessions and emits scan events.
- EasyQR API does not update your inventory database.

---

# 1. API Overview
EasyQR provides four API groups:

1. Session and scan APIs (`/api/*`)
2. Project/key and admin APIs (`/api/projects*`, `/api/admin/*`)
3. Health/readiness/liveness endpoints (`/health*`)
4. Metrics endpoint (`/metrics`)

Runtime interaction model:
- HTTP is used for setup, querying, and operational control.
- WebSocket (`/ws`) is used for real-time scan + state events.

---

# 2. Base URL
Use your deployed EasyQR host as base URL.

Examples:
- Local: `http://localhost:3000`
- Client-hosted: `https://easyqr.internal`
- Cloud-hosted: `https://api.easyqr.io` (only if such environment is provided to you)

All routes below are relative to this base URL.

---

# 3. Authentication Model
EasyQR uses project-scoped credentials.

## 3.1 Required credentials
- `projectId`
- `apiKey`

## 3.2 How credentials are sent
Current implementation uses **project headers/body fields**, not bearer token auth.

- For `POST /api/sessions`: credentials are in JSON body.
- For `GET/DELETE /api/scans`: credentials are expected in headers:
  - `x-project-id`
  - `x-api-key`
  - query fallback also exists (`projectId`, `apiKey`) but headers are recommended.

Admin endpoints require:
- `x-admin-token` header

> Note: `Authorization: Bearer <API_KEY>` is **not** the implemented auth mechanism in current server code.

Security rationale:
- project-scoped auth + tenant checks prevent cross-project access.
- server validates session/project consistency for both HTTP and WebSocket paths.

---

# 4. Session APIs
## 4.1 Create Session
**Method**: `POST`  
**Route**: `/api/sessions`

Purpose:
Creates a desktop-mobile pairing session and returns session URLs + WS token.

Request body:
```json
{
  "projectId": "blisky-prod",
  "apiKey": "project_api_key",
  "context": { "itemId": "ITEM-123" },
  "webhookUrl": "https://example.com/webhook"
}
```

Body rules:
- `projectId` required string
- `apiKey` optional string (required depending on server key mode)
- `context` optional object
- `webhookUrl` optional valid `http(s)` URL

Success response (`201`):
```json
{
  "sessionId": "a3a6c9ff-...",
  "wsToken": "<jwt>",
  "desktopUrl": "https://.../session/<id>?token=<jwt>",
  "mobileUrl": "https://.../mobile?sessionId=<id>&token=<jwt>",
  "expiresAt": 1760000000000
}
```

Common errors:
- `400 PROJECT_ID_REQUIRED`
- `400 INVALID_BODY`
- `400 INVALID_CONTEXT`
- `400 INVALID_WEBHOOK_URL`
- `401 PROJECT_AUTH_REQUIRED`
- `401 INVALID_PROJECT_CREDENTIALS`
- `429 RATE_LIMIT_EXCEEDED` (non-standard envelope; see section 9)

---

## 4.2 Get Scans
**Method**: `GET`  
**Route**: `/api/scans`

Purpose:
Returns scan history.

Auth headers:
- `x-project-id`
- `x-api-key`

Query params:
- `sessionId` (optional) — if provided, returns scans for that session only

Example request:
```http
GET /api/scans?sessionId=<sessionId>
x-project-id: blisky-prod
x-api-key: <key>
```

Success response (`200`):
```json
[
  {
    "sessionId": "a3a6c9ff-...",
    "value": "8901234567890",
    "format": "EAN_13",
    "timestamp": "2026-03-01T12:00:00.000Z",
    "source": "mobile"
  }
]
```

Common errors:
- `401 PROJECT_AUTH_REQUIRED`
- `401 INVALID_PROJECT_CREDENTIALS`
- `403 CROSS_PROJECT_ACCESS_DENIED`
- `404 SESSION_NOT_FOUND`
- `410 SESSION_EXPIRED`
- `429 RATE_LIMIT_EXCEEDED`

---

## 4.3 Clear Scans
**Method**: `DELETE`  
**Route**: `/api/scans`

Purpose:
Clears scan history.

Auth headers:
- `x-project-id`
- `x-api-key`

Query params:
- `sessionId` (optional):
  - present -> clear only that session
  - absent -> clear all scans for auth project

Success response (`200`):
```json
{ "status": "cleared" }
```

Common errors:
- `401 PROJECT_AUTH_REQUIRED`
- `401 INVALID_PROJECT_CREDENTIALS`
- `403 CROSS_PROJECT_ACCESS_DENIED`
- `404 SESSION_NOT_FOUND`
- `429 RATE_LIMIT_EXCEEDED`

---

## 4.4 Project and API Key Management
### Create Project + Initial API Key
**Method**: `POST`  
**Route**: `/api/projects`

Request body:
```json
{ "projectId": "blisky-prod" }
```

Success (`201`):
```json
{
  "projectId": "blisky-prod",
  "version": 1,
  "apiKey": "<raw_key_returned_once>"
}
```

### Rotate API Key
**Method**: `POST`  
**Route**: `/api/projects/:id/keys/rotate`

Success (`201`):
```json
{
  "projectId": "blisky-prod",
  "version": 2,
  "apiKey": "<raw_key_returned_once>"
}
```

### Revoke API Key Version
**Method**: `POST`  
**Route**: `/api/projects/:id/keys/:version/revoke`

Success (`200`):
```json
{
  "projectId": "blisky-prod",
  "version": 1,
  "revoked": true
}
```

Notes:
- In current implementation, these routes are available without `x-admin-token` middleware.
- Admin protection is applied to `/api/admin/*` routes.

---

## 4.5 Admin APIs
### Audit Logs
**Method**: `GET`  
**Route**: `/api/admin/audit`

Required header:
- `x-admin-token`

Query params:
- `project_id` (optional)
- `event_type` (optional)
- `limit` (optional, default `50`, max `200`)
- `offset` (optional, default `0`)

Success (`200`):
```json
{
  "items": [
    {
      "id": "...",
      "projectId": "blisky-prod",
      "actorType": "system",
      "eventType": "AUTH_SUCCESS",
      "metadataJson": {},
      "createdAt": "..."
    }
  ],
  "total": 1,
  "limit": 50,
  "offset": 0
}
```

### Cleanup Expired Sessions
**Method**: `POST`  
**Route**: `/api/admin/cleanup-expired`

Required header:
- `x-admin-token`

Optional controls:
- query `purge=true`
- or JSON body `{ "purge": true }`

Success (`200`):
```json
{
  "expiredMarked": 3,
  "expiredPurged": 3
}
```

---

# 5. Health & Readiness APIs
## 5.1 Liveness
**Method**: `GET`  
**Route**: `/health/live`

Purpose:
Process liveness probe. Returns `200` when process is running.

Response:
```json
{ "status": "alive" }
```

## 5.2 Readiness
**Method**: `GET`  
**Route**: `/health/ready`

Purpose:
Readiness probe for traffic routing.

- Returns `200 {"status":"ready"}` only when runtime is ready.
- Returns `503 {"status":"not_ready"}` when dependencies/lifecycle are not ready.

## 5.3 Health Summary
**Method**: `GET`  
**Route**: `/health`

Response shape:
```json
{
  "status": "ok",
  "requestId": "...",
  "storageBackend": "postgres",
  "redisEnabled": true,
  "redisConnected": true,
  "rateLimitDegraded": false
}
```

---

# 6. Metrics Endpoint
**Method**: `GET`  
**Route**: `/metrics`

Purpose:
Operational metrics for monitoring.

Content type:
- `text/plain; charset=utf-8`

Example output:
```text
http_requests_total 12
http_errors_total 0
ws_connections_active 2
ws_connections_total 5
redis_disconnects_total 0
```

---

# 7. WebSocket API
## 7.1 Connection URL
`ws(s)://<base>/ws?token=<wsToken>&role=<ROLE>&sessionId=<id>`

Query params:
- `token` (required): JWT from `POST /api/sessions` (`wsToken`)
- `role` (required/recommended): `HOST`, `DESKTOP`, or `MOBILE`
- `sessionId` (required/recommended): must match token session

## 7.2 Handshake behavior
Server validates:
- JWT validity and expiration
- session existence
- session expiry
- project consistency (token vs session)
- origin allowlist (if configured)
- WS rate limits

Possible close codes/reasons during reject path:
- `4000`: origin not allowed
- `4001`: missing token
- `4002`: invalid/expired token
- `4003`: token missing session id
- `4004`: session mismatch
- `4005`: unknown session
- `4006`: session expired
- `4007`: project mismatch
- `1008`: rate limit exceeded
- `1011`: internal server error

## 7.3 Client -> server message format
Supported inbound messages:
- `{"type":"DESKTOP_JOIN"}` (no-op compatibility)
- `{"type":"MOBILE_JOIN"}` (no-op compatibility)
- `{"type":"SCAN","payload":{...}}`

`SCAN` payload accepted by server validation currently requires:
- `sessionId: string`
- `value: string`
- `format: string`
- `timestamp: string`

Duplicate scan rule:
- dedupe key is `sessionId:value:format` vs last accepted scan.

## 7.4 Server -> client message format
- Session state:
```json
{
  "type": "SESSION_STATE",
  "sessionId": "...",
  "state": "WAITING_MOBILE",
  "mobileConnected": true,
  "desktopConnected": true
}
```

- Scan event:
```json
{
  "type": "SCAN",
  "payload": {
    "sessionId": "...",
    "value": "8901234567890",
    "format": "EAN_13",
    "timestamp": "2026-03-01T12:00:00.000Z",
    "source": "mobile"
  }
}
```

- Error frame:
```json
{
  "type": "ERROR",
  "message": "Duplicate or invalid scan"
}
```

---

# 8. Event Types
Two event layers are relevant:

## 8.1 Raw WebSocket frame types (server protocol)
- `SESSION_STATE`
- `SCAN`
- `ERROR`

## 8.2 SDK-level events (`@easyqr/sdk`)
- `session.state`
- `scan.received`
- `connection.open`
- `connection.closed`
- `connection.error`

Mapping example:
- WS `SCAN` -> SDK `scan.received`
- WS `SESSION_STATE` -> SDK `session.state`

---

# 9. Error Model
## 9.1 Standard HTTP error envelope
Most errors use:
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "requestId": "uuid"
  }
}
```

`x-request-id` is also returned on responses.

## 9.2 Rate limit error envelope (special case)
API rate-limit middleware returns:
```json
{
  "error": "RATE_LIMIT_EXCEEDED",
  "scope": "project",
  "retryAfterSeconds": 60
}
```
With header:
- `Retry-After: <seconds>`

## 9.3 Common failures
- invalid/missing project credentials (`401`)
- cross-project access denied (`403`)
- unknown session (`404`)
- expired session (`410`)
- malformed body/payload (`400`)
- service not ready/draining (`503`)

---

# 10. Deployment Networking Notes
For client-hosted deployments:
- Expose EasyQR HTTP/WS port (default `3000`) to consuming frontend network.
- Ensure frontend can reach:
  - REST routes on same host/base URL
  - WebSocket `/ws` endpoint
- Configure CORS/allowed origins for Blisky frontend origin(s).
- Ensure PostgreSQL and Redis connectivity from EasyQR server (internal network in compose).

Firewall/proxy considerations:
- allow HTTP upgrade to WebSocket on `/ws`
- preserve query string (`token`, `role`, `sessionId`) through proxies

---

# 11. Recommended Integration Flow
1. Configure project credentials (`projectId`, `apiKey`) for each environment.
2. From Blisky frontend, call `POST /api/sessions` (or SDK `startHost`).
3. Display/use returned `mobileUrl` for operator pairing.
4. Connect host listener to `/ws` with returned `wsToken`.
5. Receive `SCAN` events.
6. Call Blisky backend API to apply inventory update.
7. Optionally query/clear scan history via `/api/scans`.
8. Monitor `/health/ready` and `/metrics` operationally.

---

# 12. API Lifecycle Summary
API lifecycle in one path:
1. Create session (`POST /api/sessions`).
2. Share/scan pairing URL (`mobileUrl`).
3. Mobile and host connect over `/ws`.
4. Mobile sends `SCAN` payload.
5. EasyQR validates + routes event.
6. Host/SDK receives scan event.
7. Blisky updates inventory in its own backend/database.
8. Session eventually expires or is terminated by lifecycle.
