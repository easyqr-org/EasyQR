# Phase 1 Plan: Stability Baseline

## Objective
Deliver a predictable and debuggable baseline for EasyQR integration with Bliski's inventory system.

## Scope
- Structured JSON logs for HTTP and WebSocket lifecycle.
- Request correlation with request IDs.
- Standard API error envelope across all failures.
- Stronger automated tests for core invariants.
- Verification-first documentation and proof artifacts.

## In Scope
- `server/src/index.js` middleware and route instrumentation.
- `server/src/wsServer.js` event-level logs.
- Error/validation middleware alignment.
- Test suite expansion under `server/test/`.

## Out of Scope (Phase 1)
- Database persistence and distributed session state.
- API key rotation and tenant admin panel.
- Rate limiting and deployment automation.

## Risks
- Behavior regressions while standardizing error format.
- Flaky tests if server bootstrap is not isolated.

## Mitigations
- App/server factory refactor (`createServer`) for deterministic tests.
- Preserve existing business behavior; only standardize envelopes/logging.
- Run full test suite after each change set.

## Definition of Done
- Every API error follows one schema: `error.code`, `error.message`, `error.requestId`.
- Every HTTP request includes `x-request-id` response header.
- WebSocket accept/reject/scan/disconnect events are logged as JSON.
- Automated tests cover happy-path and key rejection paths.
- Documentation and proof index are complete.
