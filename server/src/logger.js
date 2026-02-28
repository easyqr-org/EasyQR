function serializeError(err) {
  if (!err) return undefined;
  return {
    name: err.name,
    message: err.message,
    stack: err.stack,
  };
}

function createLogger(baseContext = {}) {
  function write(level, event, context = {}) {
    const payload = {
      timestamp: new Date().toISOString(),
      level,
      event,
      ...baseContext,
      ...context,
    };

    if (payload.error instanceof Error) {
      payload.error = serializeError(payload.error);
    }

    const line = JSON.stringify(payload);
    if (level === "error") {
      console.error(line);
      return;
    }

    console.log(line);
  }

  return {
    child(context = {}) {
      return createLogger({ ...baseContext, ...context });
    },
    debug(event, context) {
      write("debug", event, context);
    },
    info(event, context) {
      write("info", event, context);
    },
    warn(event, context) {
      write("warn", event, context);
    },
    error(event, context) {
      write("error", event, context);
    },
  };
}

module.exports = { createLogger };
