# EasyQR Service

## Prerequisites

- Node.js 18+
- npm 9+

## Setup

```bash
cd server
npm install
cp .env.example .env
```

Update `.env` values for your environment. The server now auto-loads `server/.env` at startup and validates required settings.

Required configuration:
- `PORT` (positive integer)
- `JWT_SECRET` (minimum 16 characters)
- `SESSION_TTL_SECONDS` (positive number)
- `EASYQR_STORAGE_BACKEND` (`memory` or `postgres`)

Phase 2 persistence/scaling configuration:
- `DATABASE_URL` required when `EASYQR_STORAGE_BACKEND=postgres`
- `EASYQR_REDIS_ENABLED=true` enables Redis event bus
- `REDIS_URL` required when Redis is enabled
- `EASYQR_REDIS_CHANNEL` pub/sub channel (default `easyqr.events`)
- `EASYQR_INSTANCE_ID` unique identifier per server instance

## Run

```bash
npm run dev
```

or

```bash
npm start
```

## Migrations (PostgreSQL mode)

```bash
npm run migrate
```

## Local Infra for Phase 2 (optional)

```bash
docker compose -f docker-compose.phase2.yml up -d
```

## Core Endpoints

- `GET /health`
- `POST /api/sessions`
- `GET /api/scans`
- `DELETE /api/scans`
- `WS /ws`

## Phase 1 Stability Baseline

- Every HTTP response includes `x-request-id`.
- API errors follow a standard envelope:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "requestId": "uuid"
  }
}
```

- Runtime logs are structured JSON lines for HTTP and WebSocket lifecycle events.

## Verification

```bash
npm run verify:phase1
npm run verify:phase2
```
