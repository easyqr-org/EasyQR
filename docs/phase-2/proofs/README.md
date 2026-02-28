# Phase 2 Proof Artifacts

## Captured in this environment
- `test-run.txt`: output from `npm run verify:phase2`.
- `docker-ps.txt`: running Postgres/Redis containers.
- `migration-run.txt`: actual migration command output.
- `persistence_startup_log.txt`: startup log (postgres + redis active).
- `persistence_session_create.txt`: session creation request/response proof.
- `persistence_restart_log.txt`: startup log after restart.
- `persistence_db_query.txt`: PostgreSQL query output proving persisted session row.
- `multi-instance-nodeA.log`: Node A runtime log for multi-instance test.
- `multi-instance-nodeB.log`: Node B runtime log for multi-instance test.
- `multi-instance-probe-output.txt`: automated cross-node probe output with `scanReceived true`.
- `multi-instance-flow.md`: narrative and evidence mapping for cross-node propagation proof.

## To capture in staging/prod-like environment
- None pending for Phase 2 baseline verification.

These require actual PostgreSQL + Redis runtime connectivity.
