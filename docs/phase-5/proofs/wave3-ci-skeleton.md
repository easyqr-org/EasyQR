# Wave 3A Proof — CI Pipeline Skeleton

## Workflow Summary
A minimal deterministic GitHub Actions workflow was added at:

- `.github/workflows/ci.yml`

Trigger conditions:

- `push`
- `pull_request`

## Job List

1. `install`
2. `server-test`
3. `sdk-test`

Failure behavior:

- `server-test` and `sdk-test` depend on `install` via `needs`.
- Any failing job causes the workflow to fail.
- No deploy or promotion logic exists in this workflow.

## Expected Commands per Job

### install

```bash
npm ci
```

### server-test (working-directory: `server/`)

```bash
npm ci
npm test
```

### sdk-test (working-directory: `sdk/`)

```bash
npm ci
npm run typecheck
npm run build
npm test
```

## Wave 3B Quality Gates

### Enforced Checks

- Server dependency install: `npm ci`
- Server typecheck gate: `npm run typecheck --if-present`
- Server test gate: `npm test`
- SDK dependency install: `npm ci`
- SDK typecheck gate: `npm run typecheck`
- SDK deterministic build gate: `npm run build`
- SDK test gate: `npm test`

### Execution Order

1. `install` job runs first.
2. `server-test` and `sdk-test` run after `install` succeeds.
3. In `sdk-test`, checks execute in strict order:
   - `npm ci`
   - `npm run typecheck`
   - `npm run build`
   - `npm test`
4. Any failed gate fails the workflow immediately.

## Wave 3C Artifact Generation

### Generated Artifacts

- `easyqr-server-build`
- `easyqr-sdk-build`

### Artifact Contents

- `easyqr-server-build`:
  - archive file: `easyqr-server-build.tar.gz`
  - packaged content:
    - `server/package.json`
    - `server/package-lock.json`
    - `server/src/`
    - `server/migrations/`

- `easyqr-sdk-build`:
  - directory upload: `sdk/dist/`

### Retention Policy

- Artifact retention is set to `7` days for both uploads.
