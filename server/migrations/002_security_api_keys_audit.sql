CREATE TABLE IF NOT EXISTS easyqr_projects (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS project_api_keys (
  id UUID PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES easyqr_projects(id) ON DELETE CASCADE,
  api_key_hash VARCHAR(128) NOT NULL,
  version INTEGER NOT NULL,
  revoked BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ NULL,
  last_used_at TIMESTAMPTZ NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_project_api_keys_project_version
  ON project_api_keys (project_id, version);

CREATE INDEX IF NOT EXISTS idx_project_api_keys_hash
  ON project_api_keys (api_key_hash);

CREATE INDEX IF NOT EXISTS idx_project_api_keys_project_active
  ON project_api_keys (project_id, revoked);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'audit_actor_type') THEN
    CREATE TYPE audit_actor_type AS ENUM ('api_key', 'system');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY,
  project_id TEXT NULL REFERENCES easyqr_projects(id) ON DELETE SET NULL,
  actor_type audit_actor_type NOT NULL,
  event_type VARCHAR(64) NOT NULL,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_project
  ON audit_logs (project_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_event
  ON audit_logs (event_type, created_at DESC);
