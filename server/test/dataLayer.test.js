const test = require("node:test");
const assert = require("node:assert/strict");

const { createDataLayer } = require("../src/data");

test("createDataLayer uses memory mode when configured", async () => {
  const logger = { info() {}, warn() {}, error() {} };
  const dataLayer = await createDataLayer(
    {
      storageBackend: "memory",
      redisEnabled: false,
    },
    logger
  );

  assert.equal(dataLayer.mode, "memory");

  const session = await dataLayer.sessionStore.createSession({
    sessionId: "s1",
    projectId: "p1",
    ttlSeconds: 60,
  });
  assert.equal(session.id, "s1");

  await dataLayer.close();
});
