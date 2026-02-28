const { SESSION_STATES } = require("./sessionStates");
const { getScanHash, isSessionExpired, isValidScanPayload } = require("./utils");
const {
  generateApiKey,
  hashApiKey,
  verifyApiKey,
} = require("../security/apiKeyCrypto");

function createMemoryStore() {
  const sessions = new Map();
  const scansBySession = new Map();
  const lastHashBySession = new Map();
  const keysByProject = new Map();
  const auditLogs = [];

  function getProjectKeys(projectId) {
    return keysByProject.get(projectId) || [];
  }

  return {
    mode: "memory",
    async createSession({
      sessionId,
      projectId,
      context = null,
      webhookUrl = null,
      ttlSeconds = 180,
    }) {
      const now = Date.now();
      const session = {
        id: sessionId,
        projectId: projectId || null,
        state: SESSION_STATES.CREATED,
        context,
        webhookUrl,
        createdAt: now,
        expiresAt: now + ttlSeconds * 1000,
        lastScanHash: null,
      };

      sessions.set(sessionId, session);
      return session;
    },

    async ensureProject(projectId) {
      return { id: projectId };
    },

    async getSession(sessionId) {
      return sessions.get(sessionId) || null;
    },

    async updateSession(sessionId, patch) {
      const existing = sessions.get(sessionId);
      if (!existing) return null;
      const updated = { ...existing, ...patch };
      sessions.set(sessionId, updated);
      return updated;
    },

    async setSessionState(sessionId, state) {
      return this.updateSession(sessionId, { state });
    },

    async terminateSession(sessionId, reason = SESSION_STATES.TERMINATED) {
      const existing = sessions.get(sessionId);
      if (!existing) return null;
      const nextState =
        reason === SESSION_STATES.EXPIRED
          ? SESSION_STATES.EXPIRED
          : SESSION_STATES.TERMINATED;
      return this.updateSession(sessionId, { state: nextState });
    },

    isSessionExpired,

    async saveScan(sessionId, payload) {
      if (!isValidScanPayload(payload)) {
        return { accepted: false, reason: "invalid_payload" };
      }
      if (payload.sessionId !== sessionId) {
        return { accepted: false, reason: "session_mismatch" };
      }

      const hash = getScanHash(payload);
      const lastHash = lastHashBySession.get(sessionId) || null;
      if (hash === lastHash) {
        return { accepted: false, reason: "duplicate_scan" };
      }

      lastHashBySession.set(sessionId, hash);
      const session = sessions.get(sessionId);
      if (session) {
        sessions.set(sessionId, { ...session, lastScanHash: hash });
      }

      const arr = scansBySession.get(sessionId) || [];
      arr.push(payload);
      if (arr.length > 50) arr.shift();
      scansBySession.set(sessionId, arr);

      return { accepted: true, reason: null };
    },

    async getLastScan(sessionId) {
      const arr = scansBySession.get(sessionId);
      if (!arr || !arr.length) return null;
      return arr[arr.length - 1];
    },

    async getAllScans(sessionId) {
      if (sessionId) return scansBySession.get(sessionId) || [];

      const all = [];
      for (const [, list] of scansBySession.entries()) {
        all.push(...list);
      }
      return all;
    },

    async getAllScansByProject(projectId) {
      const all = [];
      const now = Date.now();
      for (const [sessionId, session] of sessions.entries()) {
        if (session.projectId !== projectId) continue;
        if (typeof session.expiresAt === "number" && now > session.expiresAt) continue;
        const scans = scansBySession.get(sessionId) || [];
        all.push(...scans);
      }
      return all;
    },

    async clearScans(sessionId) {
      if (sessionId) {
        scansBySession.delete(sessionId);
        lastHashBySession.delete(sessionId);
        const session = sessions.get(sessionId);
        if (session) sessions.set(sessionId, { ...session, lastScanHash: null });
        return;
      }

      scansBySession.clear();
      lastHashBySession.clear();
      for (const [id, s] of sessions.entries()) {
        sessions.set(id, { ...s, lastScanHash: null });
      }
    },

    async clearScansByProject(projectId) {
      for (const [sessionId, session] of sessions.entries()) {
        if (session.projectId !== projectId) continue;
        scansBySession.delete(sessionId);
        lastHashBySession.delete(sessionId);
        sessions.set(sessionId, { ...session, lastScanHash: null });
      }
    },

    async cleanupExpiredSessions({ purge = false } = {}) {
      let expiredMarked = 0;
      let expiredPurged = 0;
      const now = Date.now();

      for (const [sessionId, session] of sessions.entries()) {
        if (typeof session.expiresAt === "number" && now > session.expiresAt) {
          if (session.state !== SESSION_STATES.EXPIRED) {
            sessions.set(sessionId, { ...session, state: SESSION_STATES.EXPIRED });
            expiredMarked += 1;
          }
          if (purge) {
            sessions.delete(sessionId);
            scansBySession.delete(sessionId);
            lastHashBySession.delete(sessionId);
            expiredPurged += 1;
          }
        }
      }

      return { expiredMarked, expiredPurged };
    },

    async hasActiveApiKeys(projectId) {
      return getProjectKeys(projectId).some((k) => !k.revoked);
    },

    async verifyProjectApiKey(projectId, apiKey) {
      const keyRows = getProjectKeys(projectId).filter((k) => !k.revoked);
      for (const key of keyRows) {
        if (verifyApiKey(apiKey, key.apiKeyHash)) {
          key.lastUsedAt = new Date().toISOString();
          return {
            valid: true,
            version: key.version,
          };
        }
      }
      return { valid: false };
    },

    async createOrRotateApiKey(projectId) {
      const rows = getProjectKeys(projectId);
      const nextVersion =
        rows.length === 0
          ? 1
          : Math.max(...rows.map((r) => Number(r.version || 0))) + 1;
      const rawApiKey = generateApiKey();
      const apiKeyHash = hashApiKey(rawApiKey);
      const now = new Date().toISOString();

      const row = {
        id: `${projectId}-${nextVersion}`,
        projectId,
        apiKeyHash,
        version: nextVersion,
        revoked: false,
        createdAt: now,
        revokedAt: null,
        lastUsedAt: null,
      };
      keysByProject.set(projectId, [...rows, row]);

      return {
        projectId,
        version: nextVersion,
        apiKey: rawApiKey,
        createdAt: now,
      };
    },

    async revokeApiKey(projectId, version) {
      const rows = getProjectKeys(projectId);
      let found = false;
      const now = new Date().toISOString();

      const next = rows.map((row) => {
        if (Number(row.version) !== Number(version)) return row;
        found = true;
        if (row.revoked) return row;
        return {
          ...row,
          revoked: true,
          revokedAt: now,
        };
      });

      if (!found) return null;
      keysByProject.set(projectId, next);
      return next.find((r) => Number(r.version) === Number(version)) || null;
    },

    async createAuditLog({
      projectId = null,
      actorType = "system",
      eventType,
      metadata = {},
    }) {
      const entry = {
        id: `${Date.now()}-${auditLogs.length + 1}`,
        projectId,
        actorType,
        eventType,
        metadataJson: metadata || {},
        createdAt: new Date().toISOString(),
      };
      auditLogs.push(entry);
      return entry;
    },

    async getAuditLogs({ projectId = null, eventType = null, limit = 50, offset = 0 } = {}) {
      const filtered = auditLogs.filter((row) => {
        if (projectId && row.projectId !== projectId) return false;
        if (eventType && row.eventType !== eventType) return false;
        return true;
      });
      const items = filtered
        .slice()
        .reverse()
        .slice(offset, offset + limit);
      return {
        items,
        total: filtered.length,
        limit,
        offset,
      };
    },

    async close() {},

    _internal: {
      sessions,
      scansBySession,
      lastHashBySession,
      keysByProject,
      auditLogs,
    },
  };
}

module.exports = { createMemoryStore };
