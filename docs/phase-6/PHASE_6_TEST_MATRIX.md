# Phase 6 Test Matrix

## Wave 1 — Load & Stability

| ID | Scenario | Expected Result | Evidence | Status |
|---|---|---|---|---|
| P6-W1-T1 | Session create throughput burst | Success/error ratio within target | proofs/wave1-load.md | [ ] |
| P6-W1-T2 | Concurrent WS connection load | Stable WS admission and continuity | proofs/wave1-load.md | [ ] |
| P6-W1-T3 | Sustained scan stream | No memory/CPU runaway | proofs/wave1-stability.md | [ ] |
| P6-W1-T4 | Recovery after load stop | Service returns to steady baseline | proofs/wave1-stability.md | [ ] |

## Wave 2 — Compatibility & UX

| ID | Scenario | Expected Result | Evidence | Status |
|---|---|---|---|---|
| P6-W2-T1 | Chrome desktop + Android scan flow | End-to-end pass | proofs/wave2-compat.md | [ ] |
| P6-W2-T2 | Safari iOS camera flow | End-to-end pass | proofs/wave2-compat.md | [ ] |
| P6-W2-T3 | Firefox desktop host flow | End-to-end pass | proofs/wave2-compat.md | [ ] |
| P6-W2-T4 | Error/retry UX states | Clear user messaging and recovery path | proofs/wave2-ux.md | [ ] |

## Wave 3 — Handoff & Acceptance

| ID | Scenario | Expected Result | Evidence | Status |
|---|---|---|---|---|
| P6-W3-T1 | Deploy runbook dry run | Reproducible by non-author operator | proofs/wave3-handoff.md | [ ] |
| P6-W3-T2 | Client integration checklist | Complete and actionable | proofs/wave3-handoff.md | [ ] |
| P6-W3-T3 | Acceptance sign-off package | All required artifacts linked | proofs/wave3-acceptance.md | [ ] |

