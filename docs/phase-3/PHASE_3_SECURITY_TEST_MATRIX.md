# Phase 3 Security + Tenant Controls Test Matrix

## Automated Verification

| ID | Domain | Scenario | Expected Result | Evidence | Status |
|---|---|---|---|---|---|
| P3S-T1 | Auth | Valid `projectId + apiKey` | Session creation allowed | `docs/phase-3/proofs/security-key-rotation.md` | [x] |
| P3S-T2 | Auth | Invalid secret | `401` with security error code | `server/test/securityIntegration.test.js`, `docs/phase-3/proofs/security-audit-trail.md` | [x] |
| P3S-T3 | Auth | Revoked key | `401` deny + audit event | `docs/phase-3/proofs/security-key-rotation.md`, `docs/phase-3/proofs/security-audit-trail.md` | [x] |
| P3S-T4 | Auth | Expired session access | `410` deny + reason `SESSION_EXPIRED` | `server/test/securityIntegration.test.js`, `docs/phase-3/proofs/wave2-expiry-rejection.txt` | [x] |
| P3S-T5 | Rotation | Overlap window | Old+new key both valid during overlap | `docs/phase-3/proofs/security-key-rotation.md` | [x] |
| P3S-T6 | Rotation | Post-revoke use | Revoked key denied immediately | `docs/phase-3/proofs/security-key-rotation.md` | [x] |
| P3S-T7 | Limiter | Per-project API burst | Excess requests return `429` | `server/test/rateLimitIntegration.test.js`, `docs/phase-3/proofs/wave3-rate-limit.md` | [x] |
| P3S-T8 | Limiter | Per-IP API burst | Excess requests return `429` regardless of project | `server/test/rateLimitIntegration.test.js`, `docs/phase-3/proofs/wave3-rate-limit.md` | [x] |
| P3S-T9 | Limiter | WS handshake flood | Excess upgrades denied deterministically | `server/test/rateLimitIntegration.test.js`, `docs/phase-3/proofs/wave3-rate-limit.md` | [x] |
| P3S-T10 | Audit | Auth decisions logged | allow/deny events persisted with reason | `docs/phase-3/proofs/security-audit-trail.md`, `docs/phase-3/proofs/wave2-admin-auth.txt` | [x] |
| P3S-T11 | Audit | Key lifecycle events | create/revoke events persisted | `docs/phase-3/proofs/security-audit-trail.md` | [x] |
| P3S-T12 | Security | Plaintext key leakage guard | No plaintext key value in logs/DB | `docs/phase-3/proofs/security-db-hash-check.txt` | [x] |

## Manual / Staging Verification

| ID | Scenario | Expected Result | Proof Artifact | Status |
|---|---|---|---|---|
| P3S-M1 | Key creation and one-time display | Secret shown once, never retrievable in plaintext | `docs/phase-3/proofs/security-key-rotation.md`, `docs/phase-3/proofs/security-db-hash-check.txt` | [x] |
| P3S-M2 | Rotation cutover runbook | Zero downtime during key swap | `docs/phase-3/proofs/security-key-rotation.md` | [x] |
| P3S-M3 | API limiter under realistic traffic | Stable throttling with clear audit trail | `docs/phase-3/proofs/wave3-rate-limit.md` | [x] |
| P3S-M4 | WS limiter under connection storm | Controlled admission and service stability | `docs/phase-3/proofs/wave3-rate-limit.md` | [x] |
| P3S-M5 | Audit investigation drill | Can trace request from deny event to root cause | `docs/phase-3/proofs/security-audit-trail.md` | [x] |
| P3S-M6 | Cross-tenant access rejection | Tenant B cannot access Tenant A session/scan data | `docs/phase-3/proofs/wave2-cross-tenant-rejection.txt` | [x] |
| P3S-M7 | Admin auth enforcement | Missing/invalid admin token returns `401` | `docs/phase-3/proofs/wave2-admin-auth.txt` | [x] |
| P3S-M8 | Legacy compatibility flag behavior | Legacy auth disabled fails, enabled succeeds | `docs/phase-3/proofs/wave2-legacy-compatibility.txt` | [x] |

## Exit Gate
Phase 3 Security closes only when every `P3S-T*` and `P3S-M*` item is marked complete with linked artifacts.
