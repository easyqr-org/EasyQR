# Phase 1 Implementation Notes

## Logging Standard
All runtime logs are JSON lines with these common fields:
- `timestamp`
- `level`
- `event`
- `service`

Context-specific fields:
- HTTP: `requestId`, `method`, `path`, `statusCode`, `durationMs`
- Session create: `sessionId`, `projectId`, `expiresAt`
- WebSocket: `sessionId`, `projectId`, `role`, `reason`, `code`, `durationMs`

## Error Envelope Standard
All API errors return:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "requestId": "uuid"
  }
}
```

Optional details:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "requestId": "uuid",
    "details": {"field": "value"}
  }
}
```

## Middleware Flow
1. `requestContext` assigns/propagates `requestId`.
2. `requestLogger` emits one completion log per HTTP request.
3. Route/middleware business logic executes.
4. `notFoundHandler` and `errorHandler` enforce standard envelope.

## WebSocket Log Events
- `ws.connection.accepted`
- `ws.connection.rejected`
- `ws.message.rejected`
- `ws.scan.accepted`
- `ws.scan.rejected`
- `ws.connection.closed`
