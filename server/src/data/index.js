const { createMemoryStore } = require("./memoryStore");
const { createPostgresStore } = require("./postgresStore");
const { createNoopBus } = require("../events/noopBus");
const { createRedisBus } = require("../events/redisBus");
const { incRedisDisconnect } = require("../observability/metrics");

async function createDataLayer(config, logger) {
  let store;
  if (config.storageBackend === "postgres") {
    store = createPostgresStore({
      databaseUrl: config.databaseUrl,
      logger,
    });
    await store.ping();
    logger.info("postgres.connected", {
      storageBackend: "postgres",
    });
  } else {
    store = createMemoryStore();
  }

  let eventBus;
  let rateLimitRedisClient = null;
  if (config.redisEnabled) {
    eventBus = createRedisBus({
      redisUrl: config.redisUrl,
      channel: config.redisChannel,
      logger,
      instanceId: config.instanceId,
    });

    try {
      const { createClient } = require("redis");
      rateLimitRedisClient = createClient({ url: config.redisUrl });
      rateLimitRedisClient.on("error", (error) => {
        logger.warn("rate_limit.redis.error", { error: error.message || String(error) });
      });
      rateLimitRedisClient.on("end", () => {
        incRedisDisconnect();
        logger.warn("redis.disconnected", {
          source: "rate_limit",
        });
      });
      await rateLimitRedisClient.connect();
      logger.info("redis.connected", {
        source: "rate_limit",
      });
    } catch (error) {
      logger.warn("rate_limit.redis.unavailable", {
        message: error?.message || String(error),
      });
      rateLimitRedisClient = null;
    }
  } else {
    eventBus = createNoopBus();
  }

  return {
    mode: store.mode,
    sessionStore: store,
    scanStore: store,
    eventBus,
    rateLimitRedisClient,
    rateLimitState: {
      degraded: false,
    },
    async close() {
      await eventBus.close();
      if (rateLimitRedisClient) {
        await rateLimitRedisClient.quit();
        incRedisDisconnect();
        logger.info("redis.disconnected", {
          source: "rate_limit",
        });
      }
      await store.close();
    },
  };
}

module.exports = { createDataLayer };
