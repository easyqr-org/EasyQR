const { createLogger } = require("../logger");

function createObservabilityLogger({ service }) {
  const base = createLogger({ service });

  function normalize(data = {}) {
    const context = { ...data };
    if (context.req && context.requestId == null) {
      context.requestId = context.req.requestId || null;
      delete context.req;
    }
    return context;
  }

  return {
    logInfo(event, data = {}) {
      base.info(event, normalize(data));
    },
    logWarn(event, data = {}) {
      base.warn(event, normalize(data));
    },
    logError(event, data = {}) {
      base.error(event, normalize(data));
    },
    raw: base,
  };
}

module.exports = { createObservabilityLogger };

