-- Ensure every session has a project id for tenant scoping.
UPDATE easyqr_sessions
SET project_id = '__legacy_default_project__'
WHERE project_id IS NULL;

INSERT INTO easyqr_projects (id, created_at)
VALUES ('__legacy_default_project__', NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO easyqr_projects (id, created_at)
SELECT DISTINCT project_id, NOW()
FROM easyqr_sessions
WHERE project_id IS NOT NULL
ON CONFLICT (id) DO NOTHING;

ALTER TABLE easyqr_sessions
  ALTER COLUMN project_id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_easyqr_sessions_project'
      AND table_name = 'easyqr_sessions'
  ) THEN
    ALTER TABLE easyqr_sessions
      ADD CONSTRAINT fk_easyqr_sessions_project
      FOREIGN KEY (project_id)
      REFERENCES easyqr_projects(id)
      ON DELETE RESTRICT;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_easyqr_sessions_project_id
  ON easyqr_sessions (project_id);

CREATE INDEX IF NOT EXISTS idx_easyqr_scans_session_id
  ON easyqr_scans (session_id);
