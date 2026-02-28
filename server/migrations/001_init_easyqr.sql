CREATE TABLE IF NOT EXISTS easyqr_sessions (
  id TEXT PRIMARY KEY,
  project_id TEXT,
  state TEXT NOT NULL,
  context_json JSONB,
  webhook_url TEXT,
  created_at_ms BIGINT NOT NULL,
  expires_at_ms BIGINT NOT NULL,
  last_scan_hash TEXT
);

CREATE INDEX IF NOT EXISTS idx_easyqr_sessions_project
  ON easyqr_sessions (project_id);

CREATE INDEX IF NOT EXISTS idx_easyqr_sessions_expires
  ON easyqr_sessions (expires_at_ms);

CREATE TABLE IF NOT EXISTS easyqr_scans (
  id BIGSERIAL PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES easyqr_sessions(id) ON DELETE CASCADE,
  value TEXT NOT NULL,
  format TEXT NOT NULL,
  scan_timestamp TEXT NOT NULL,
  source TEXT,
  created_at_ms BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_easyqr_scans_session_created
  ON easyqr_scans (session_id, id DESC);
