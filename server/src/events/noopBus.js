function createNoopBus() {
  return {
    mode: "noop",
    async publish() {},
    async close() {},
    subscribe() {
      return () => {};
    },
  };
}

module.exports = { createNoopBus };
