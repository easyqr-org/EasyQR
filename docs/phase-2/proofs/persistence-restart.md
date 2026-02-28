# Persistence Restart Proof Template

## Goal
Confirm no data loss after server restart with PostgreSQL backend.

## Steps
1. Start server in postgres mode.
2. Create a session and submit at least one scan.
3. Stop server process.
4. Start server again with same DB.
5. Verify:
- session can still be fetched/used (if not expired)
- last scan history remains available

## Evidence to include
- pre-restart session/scan output
- post-restart output showing same records
