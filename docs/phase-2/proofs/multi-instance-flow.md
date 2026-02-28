# Multi-Instance Cross-Node Event Propagation Proof

## Objective
Prove that a scan sent through one EasyQR instance is delivered to a host socket connected to another EasyQR instance via Redis pub/sub.

## Topology
- Node A: `http://localhost:3000` (`EASYQR_INSTANCE_ID=easyqr-A`)
- Node B: `http://localhost:3001` (`EASYQR_INSTANCE_ID=easyqr-B`)
- Shared Postgres: `server-postgres-1`
- Shared Redis: `server-redis-1`

## Execution Summary
1. Started Node A and Node B in postgres+redis mode.
2. Created session on Node A (`POST /api/sessions`).
3. Connected HOST WebSocket to Node B for that session.
4. Connected MOBILE WebSocket to Node A for that session.
5. MOBILE sent SCAN payload.
6. HOST (on Node B) received `SCAN` with exact probe value.

## Probe Output Evidence
Source file: `docs/phase-2/proofs/multi-instance-probe-output.txt`

Observed lines:
- `host_open true`
- `host_msg_type SESSION_STATE`
- `host_state ACTIVE`
- `host_msg_type SCAN`
- `host_scan_received PROOF-1771931094834`
- `scanReceived true`

## Node Logs Evidence
Node A log (`docs/phase-2/proofs/multi-instance-nodeA.log`) includes:
- `ws.connection.accepted` with `role:"MOBILE"`
- `ws.scan.accepted` for the same session

Node B log (`docs/phase-2/proofs/multi-instance-nodeB.log`) includes:
- `ws.connection.accepted` with `role:"HOST"`
- Host received propagated scan event (captured in probe output)

## Result
Cross-node scan propagation is successful. Redis-backed event distribution works for multi-instance session routing.
