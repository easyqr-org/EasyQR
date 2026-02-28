# Wave 3 Rate Limit Proof Pack

## API 429 Proof
- Commands:
  - `npm test -- test/rateLimitIntegration.test.js`
- Output:
  - API limiter deny events were emitted:
    - `event":"rate_limit.denied","scope":"project"`
    - `event":"rate_limit.denied","scope":"ip"`
  - Integration assertions passed:
    - `project exceeds limit returns 429`
    - `ip exceeds limit returns 429`
- Result:
  - API limiter returns `429` with deterministic project/IP scope behavior.

## WS Rejection Proof
- Commands:
  - `npm test -- test/rateLimitIntegration.test.js`
- Output:
  - WS limiter deny events were emitted:
    - `event":"rate_limit.ws_denied","scope":"project"`
    - `event":"rate_limit.ws_denied","scope":"ip"`
  - Integration assertions passed:
    - `WS project limit exceeded returns denied decision`
    - `WS IP limit exceeded returns denied decision`
- Result:
  - WS handshake limiter denies excess connections with project/IP isolation.

## Redis Degraded Mode Proof
- Commands:
  - `npm test -- test/rateLimitIntegration.test.js`
- Output:
  - Degraded mode events were emitted:
    - `event":"rate_limit.degraded"`
    - `event":"rate_limit.ws_degraded"`
  - Integration assertions passed:
    - `degraded mode allows request when redis throws`
    - `WS degraded mode allows when redis fails`
- Result:
  - Redis failure degrades safely to allow-mode for API and WS without crashes.

## Test Run Output
- Command:
  - `npm test`
- Summary:
  - `50` total tests, `50` passed, `0` failed.
- Evidence File:
  - `docs/phase-3/proofs/test-run-wave3.txt`
