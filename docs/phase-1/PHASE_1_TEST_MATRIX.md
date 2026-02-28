# Phase 1 Test Matrix

## Automated Tests

| ID | Scenario | Expected Result | Status |
|---|---|---|---|
| T1 | `requestContext` generates request ID | Adds `req.requestId` and `x-request-id` header | [x] |
| T2 | `requestContext` preserves incoming request ID | Uses existing client-supplied `x-request-id` | [x] |
| T3 | `validateCreateSession` missing `projectId` | Returns `AppError` code `PROJECT_ID_REQUIRED` | [x] |
| T4 | `validateCreateSession` valid payload | Normalizes payload and calls `next()` | [x] |
| T5 | `notFoundHandler` envelope | Returns `404` with code `ROUTE_NOT_FOUND` | [x] |
| T6 | `errorHandler` client error envelope | Returns input code/message + `requestId` | [x] |
| T7 | `errorHandler` server error mask | Returns `500` with code `INTERNAL_ERROR` | [x] |
| T8 | `scanStore` valid payload | Accepted and stored | [x] |
| T9 | `scanStore` duplicate payload | Rejected as duplicate | [x] |
| T10 | `scanStore` invalid/mismatch payload | Rejected | [x] |
| T11 | `sessionStore` expiry behavior | Expired sessions detected correctly | [x] |
| T12 | `sessionStore` terminate state | Sets `EXPIRED` state on expiry termination | [x] |

## Manual Verification

| ID | Scenario | Evidence File | Status |
|---|---|---|---|
| M1 | Start server and confirm JSON startup log | `docs/phase-1/proofs/server-start.log` | [x] |
| M2 | Create session and inspect request/response IDs | `docs/phase-1/proofs/session-create.http` | [x] |
| M3 | Trigger validation error and verify envelope | `docs/phase-1/proofs/error-invalid-projectId.http` | [x] |
| M4 | Run test suite and capture output | `docs/phase-1/proofs/test-run.txt` | [x] |
