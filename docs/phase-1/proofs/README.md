# Phase 1 Proof Artifacts

Store command outputs and screenshots here to support client documentation.

## Required Files
- `server-start.log`: startup and first request logs.
- `session-create.http`: request/response sample for successful session creation.
- `error-invalid-projectId.http`: request/response sample showing standard error envelope.
- `test-run.txt`: full output of `npm run verify:phase1`.

## Capture Commands

```bash
# from repo root
cd server
npm run verify:phase1 | tee ../docs/phase-1/proofs/test-run.txt
```

Use curl for HTTP proof samples and copy request + response (including headers) into the `.http` files.
