const { SESSION_STATES } = require("./sessionStates");
const {
  getScanHash,
  isDuplicateScanWithinWindow,
  isSessionExpired,
  isValidScanPayload,
} = require("./utils");
const { v4: uuidv4 } = require("uuid");
const {
  generateApiKey,
  hashApiKey,
  verifyApiKey,
} = require("../security/apiKeyCrypto");

function mapSessionRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    projectId: row.project_id,
    state: row.state,
    context: row.context_json,
    webhookUrl: row.webhook_url,
    createdAt: Number(row.created_at_ms),
    expiresAt: Number(row.expires_at_ms),
    lastScanHash: row.last_scan_hash || null,
  };
}

function mapScanRow(row) {
  if (!row) return null;
  return {
    sessionId: row.session_id,
    value: row.value,
    format: row.format,
    timestamp: row.scan_timestamp,
    source: row.source || "mobile",
  };
}

function mapAuditRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    projectId: row.project_id,
    actorType: row.actor_type,
    eventType: row.event_type,
    metadataJson: row.metadata_json || {},
    createdAt: row.created_at,
  };
}

function createPostgresStore({ databaseUrl, logger }) {
  let pool;

  function getPool() {
    if (pool) return pool;
    const { Pool } = require("pg");
    pool = new Pool({ connectionString: databaseUrl });
    return pool;
  }

  return {
    mode: "postgres",

    async ping() {
      const p = getPool();
      await p.query("SELECT 1");
    },

    async createSession({
      sessionId,
      projectId,
      context = null,
      webhookUrl = null,
      ttlSeconds = 180,
    }) {
      const now = Date.now();
      const expiresAt = now + ttlSeconds * 1000;
      const p = getPool();
      await this.ensureProject(projectId);

      const result = await p.query(
        `
        INSERT INTO easyqr_sessions (
          id, project_id, state, context_json, webhook_url, created_at_ms, expires_at_ms, last_scan_hash
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
        `,
        [
          sessionId,
          projectId || null,
          SESSION_STATES.CREATED,
          context,
          webhookUrl,
          now,
          expiresAt,
          null,
        ]
      );

      return mapSessionRow(result.rows[0]);
    },

    async ensureProject(projectId) {
      const p = getPool();
      await p.query(
        `
        INSERT INTO easyqr_projects (id, created_at)
        VALUES ($1, NOW())
        ON CONFLICT (id) DO NOTHING
        `,
        [projectId]
      );
      return { id: projectId };
    },

    async getSession(sessionId) {
      const p = getPool();
      const result = await p.query(
        "SELECT * FROM easyqr_sessions WHERE id = $1 LIMIT 1",
        [sessionId]
      );
      return mapSessionRow(result.rows[0]);
    },

    async updateSession(sessionId, patch) {
      const existing = await this.getSession(sessionId);
      if (!existing) return null;

      const merged = { ...existing, ...patch };
      const p = getPool();
      const result = await p.query(
        `
        UPDATE easyqr_sessions
        SET state = $2,
            context_json = $3,
            webhook_url = $4,
            expires_at_ms = $5,
            last_scan_hash = $6
        WHERE id = $1
        RETURNING *
        `,
        [
          sessionId,
          merged.state,
          merged.context || null,
          merged.webhookUrl || null,
          merged.expiresAt,
          merged.lastScanHash || null,
        ]
      );

      return mapSessionRow(result.rows[0]);
    },

    async setSessionState(sessionId, state) {
      const p = getPool();
      const result = await p.query(
        `
        UPDATE easyqr_sessions
        SET state = $2
        WHERE id = $1
        RETURNING *
        `,
        [sessionId, state]
      );
      return mapSessionRow(result.rows[0]);
    },

    async terminateSession(sessionId, reason = SESSION_STATES.TERMINATED) {
      const nextState =
        reason === SESSION_STATES.EXPIRED
          ? SESSION_STATES.EXPIRED
          : SESSION_STATES.TERMINATED;
      return this.setSessionState(sessionId, nextState);
    },

    isSessionExpired,

    async saveScan(sessionId, payload) {
      if (!isValidScanPayload(payload)) {
        return { accepted: false, reason: "invalid_payload" };
      }
      if (payload.sessionId !== sessionId) {
        return { accepted: false, reason: "session_mismatch" };
      }

      const p = getPool();
      const client = await p.connect();
      const scanHash = getScanHash(payload);

      try {
        await client.query("BEGIN");

        const sessionRow = await client.query(
          "SELECT id, last_scan_hash FROM easyqr_sessions WHERE id = $1 FOR UPDATE",
          [sessionId]
        );
        if (!sessionRow.rows.length) {
          await client.query("ROLLBACK");
          return { accepted: false, reason: "unknown_session" };
        }

        const lastScanRow = await client.query(
          `
          SELECT session_id, value, format, scan_timestamp, source
          FROM easyqr_scans
          WHERE session_id = $1
          ORDER BY id DESC
          LIMIT 1
          `,
          [sessionId]
        );
        const lastScan = mapScanRow(lastScanRow.rows[0]);
        if (isDuplicateScanWithinWindow(payload, lastScan)) {
          await client.query("ROLLBACK");
          return { accepted: false, reason: "duplicate_scan" };
        }

        await client.query(
          `
          INSERT INTO easyqr_scans (
            session_id, value, format, scan_timestamp, source, created_at_ms
          )
          VALUES ($1, $2, $3, $4, $5, $6)
          `,
          [
            sessionId,
            payload.value,
            payload.format,
            payload.timestamp,
            payload.source || "mobile",
            Date.now(),
          ]
        );

        await client.query(
          "UPDATE easyqr_sessions SET last_scan_hash = $2 WHERE id = $1",
          [sessionId, scanHash]
        );

        await client.query("COMMIT");
        return { accepted: true, reason: null };
      } catch (error) {
        await client.query("ROLLBACK");
        logger.error("store.postgres.scan_write_failed", {
          sessionId,
          error,
        });
        return { accepted: false, reason: "storage_error" };
      } finally {
        client.release();
      }
    },

    async getLastScan(sessionId) {
      const p = getPool();
      const result = await p.query(
        `
        SELECT session_id, value, format, scan_timestamp, source
        FROM easyqr_scans
        WHERE session_id = $1
        ORDER BY id DESC
        LIMIT 1
        `,
        [sessionId]
      );
      return mapScanRow(result.rows[0]);
    },

    async getAllScans(sessionId) {
      const p = getPool();
      const params = [];
      let whereClause = "";
      if (sessionId) {
        params.push(sessionId);
        whereClause = "WHERE session_id = $1";
      }

      const result = await p.query(
        `
        SELECT session_id, value, format, scan_timestamp, source
        FROM easyqr_scans
        ${whereClause}
        ORDER BY id DESC
        LIMIT 500
        `,
        params
      );
      return result.rows.map(mapScanRow);
    },

    async getAllScansByProject(projectId) {
      const p = getPool();
      const now = Date.now();
      const result = await p.query(
        `
        SELECT sc.session_id, sc.value, sc.format, sc.scan_timestamp, sc.source
        FROM easyqr_scans sc
        INNER JOIN easyqr_sessions s
          ON s.id = sc.session_id
        WHERE s.project_id = $1
          AND s.expires_at_ms >= $2
        ORDER BY sc.id DESC
        LIMIT 500
        `,
        [projectId, now]
      );
      return result.rows.map(mapScanRow);
    },

    async clearScans(sessionId) {
      const p = getPool();
      if (sessionId) {
        await p.query("DELETE FROM easyqr_scans WHERE session_id = $1", [sessionId]);
        await p.query("UPDATE easyqr_sessions SET last_scan_hash = NULL WHERE id = $1", [
          sessionId,
        ]);
        return;
      }

      await p.query("DELETE FROM easyqr_scans");
      await p.query("UPDATE easyqr_sessions SET last_scan_hash = NULL");
    },

    async clearScansByProject(projectId) {
      const p = getPool();
      await p.query(
        `
        DELETE FROM easyqr_scans
        WHERE session_id IN (
          SELECT id FROM easyqr_sessions WHERE project_id = $1
        )
        `,
        [projectId]
      );
      await p.query(
        "UPDATE easyqr_sessions SET last_scan_hash = NULL WHERE project_id = $1",
        [projectId]
      );
    },

    async cleanupExpiredSessions({ purge = false } = {}) {
      const p = getPool();
      const mark = await p.query(
        `
        UPDATE easyqr_sessions
        SET state = $2
        WHERE expires_at_ms < $1
          AND state <> $2
        `,
        [Date.now(), SESSION_STATES.EXPIRED]
      );

      let purgeCount = 0;
      if (purge) {
        const del = await p.query(
          `
          DELETE FROM easyqr_sessions
          WHERE expires_at_ms < $1
          `,
          [Date.now()]
        );
        purgeCount = del.rowCount;
      }

      return {
        expiredMarked: mark.rowCount,
        expiredPurged: purgeCount,
      };
    },

    async hasActiveApiKeys(projectId) {
      const p = getPool();
      const result = await p.query(
        `
        SELECT 1
        FROM project_api_keys
        WHERE project_id = $1 AND revoked = false
        LIMIT 1
        `,
        [projectId]
      );
      return result.rows.length > 0;
    },

    async verifyProjectApiKey(projectId, apiKey) {
      const p = getPool();
      const result = await p.query(
        `
        SELECT id, version, api_key_hash
        FROM project_api_keys
        WHERE project_id = $1
          AND revoked = false
        ORDER BY version DESC
        `,
        [projectId]
      );

      for (const row of result.rows) {
        if (verifyApiKey(apiKey, row.api_key_hash)) {
          await p.query(
            "UPDATE project_api_keys SET last_used_at = NOW() WHERE id = $1",
            [row.id]
          );
          return { valid: true, version: row.version };
        }
      }
      return { valid: false };
    },

    async createOrRotateApiKey(projectId) {
      const p = getPool();
      const client = await p.connect();
      const rawApiKey = generateApiKey();
      const keyHash = hashApiKey(rawApiKey);

      try {
        await client.query("BEGIN");
        await client.query(
          `
          INSERT INTO easyqr_projects (id, created_at)
          VALUES ($1, NOW())
          ON CONFLICT (id) DO NOTHING
          `,
          [projectId]
        );

        const versionRow = await client.query(
          `
          SELECT COALESCE(MAX(version), 0) AS max_version
          FROM project_api_keys
          WHERE project_id = $1
          `,
          [projectId]
        );
        const nextVersion = Number(versionRow.rows[0].max_version || 0) + 1;

        await client.query(
          `
          INSERT INTO project_api_keys (
            id, project_id, api_key_hash, version, revoked, created_at, revoked_at, last_used_at
          )
          VALUES ($1, $2, $3, $4, false, NOW(), NULL, NULL)
          `,
          [uuidv4(), projectId, keyHash, nextVersion]
        );

        await client.query("COMMIT");
        return {
          projectId,
          version: nextVersion,
          apiKey: rawApiKey,
        };
      } catch (error) {
        await client.query("ROLLBACK");
        logger.error("store.postgres.key_rotate_failed", { projectId, error });
        throw error;
      } finally {
        client.release();
      }
    },

    async revokeApiKey(projectId, version) {
      const p = getPool();
      const result = await p.query(
        `
        UPDATE project_api_keys
        SET revoked = true,
            revoked_at = NOW()
        WHERE project_id = $1
          AND version = $2
          AND revoked = false
        RETURNING id, project_id, version, revoked, revoked_at
        `,
        [projectId, version]
      );
      return result.rows[0] || null;
    },

    async createAuditLog({
      projectId = null,
      actorType = "system",
      eventType,
      metadata = {},
    }) {
      const p = getPool();
      const id = uuidv4();
      const result = await p.query(
        `
        INSERT INTO audit_logs (
          id, project_id, actor_type, event_type, metadata_json, created_at
        )
        VALUES ($1, $2, $3, $4, $5, NOW())
        RETURNING *
        `,
        [id, projectId, actorType, eventType, metadata || {}]
      );
      return mapAuditRow(result.rows[0]);
    },

    async getAuditLogs({ projectId = null, eventType = null, limit = 50, offset = 0 } = {}) {
      const p = getPool();
      const params = [];
      const where = [];
      if (projectId) {
        params.push(projectId);
        where.push(`project_id = $${params.length}`);
      }
      if (eventType) {
        params.push(eventType);
        where.push(`event_type = $${params.length}`);
      }
      const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";

      params.push(limit);
      params.push(offset);
      const list = await p.query(
        `
        SELECT *
        FROM audit_logs
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${params.length - 1}
        OFFSET $${params.length}
        `,
        params
      );

      const countParams = params.slice(0, params.length - 2);
      const count = await p.query(
        `
        SELECT COUNT(*)::int AS total
        FROM audit_logs
        ${whereClause}
        `,
        countParams
      );

      return {
        items: list.rows.map(mapAuditRow),
        total: count.rows[0].total,
        limit,
        offset,
      };
    },

    async close() {
      if (!pool) return;
      await pool.end();
      pool = null;
    },
  };
}

module.exports = {
  createPostgresStore,
};
