# Phase 3 Wave 3 Rate Limit Test Matrix

| ID | Scenario | Expected Result | Status |
|---|---|---|---|
| RL-T1 | API per-project threshold not exceeded | Requests allowed | [ ] |
| RL-T2 | API per-project threshold exceeded | `429` returned | [ ] |
| RL-T3 | API per-IP threshold exceeded | `429` returned | [ ] |
| RL-T4 | WS per-project threshold exceeded | Handshake rejected deterministically | [ ] |
| RL-T5 | WS per-IP threshold exceeded | Handshake rejected deterministically | [ ] |
| RL-T6 | Counter window rollover after 1 minute | Requests accepted after reset | [ ] |
| RL-T7 | Two projects under same IP | One project throttled does not block the other (project cap path) | [ ] |
| RL-T8 | Redis degraded mode during limiter checks | Behavior follows defined degraded policy and is logged | [ ] |
| RL-T9 | API `429` response structure | Includes stable error code + retry metadata | [ ] |
| RL-T10 | No regression for non-limited paths | Existing behavior unchanged where limiter not applied | [ ] |
