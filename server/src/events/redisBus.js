const { incRedisDisconnect } = require("../observability/metrics");

function createRedisBus({ redisUrl, channel, logger, instanceId }) {
  let publisher = null;
  let subscriber = null;
  const listeners = new Set();

  async function ensureClients() {
    if (publisher && subscriber) return;

    const { createClient } = require("redis");
    publisher = createClient({ url: redisUrl });
    subscriber = createClient({ url: redisUrl });

    publisher.on("error", (error) => {
      logger.error("event_bus.redis.publisher_error", { error });
    });
    subscriber.on("error", (error) => {
      logger.error("event_bus.redis.subscriber_error", { error });
    });

    await publisher.connect();
    await subscriber.connect();
    logger.info("redis.connected", {
      source: "event_bus",
    });

    await subscriber.subscribe(channel, (raw) => {
      let message;
      try {
        message = JSON.parse(raw);
      } catch (error) {
        logger.warn("event_bus.redis.invalid_message", { raw });
        return;
      }

      if (message.sourceInstanceId === instanceId) return;

      for (const listener of listeners) {
        try {
          listener(message);
        } catch (error) {
          logger.error("event_bus.redis.listener_error", { error });
        }
      }
    });
  }

  return {
    mode: "redis",
    async publish(event, payload) {
      await ensureClients();
      const message = JSON.stringify({
        event,
        payload,
        sourceInstanceId: instanceId,
        timestamp: Date.now(),
      });
      await publisher.publish(channel, message);
    },
    subscribe(handler) {
      listeners.add(handler);
      ensureClients().catch((error) => {
        logger.error("event_bus.redis.subscribe_failed", { error });
      });
      return () => listeners.delete(handler);
    },
    async close() {
      listeners.clear();
      if (subscriber) {
        await subscriber.quit();
        subscriber = null;
      }
      if (publisher) {
        await publisher.quit();
        publisher = null;
      }
      incRedisDisconnect();
      logger.info("redis.disconnected", {
        source: "event_bus",
      });
    },
  };
}

module.exports = { createRedisBus };
