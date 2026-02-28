const LIFECYCLE_STATES = {
  STARTING: "STARTING",
  READY: "READY",
  DRAINING: "DRAINING",
  STOPPED: "STOPPED",
};

function createLifecycle() {
  let state = LIFECYCLE_STATES.STARTING;
  let migrationsComplete = false;

  return {
    getState() {
      return state;
    },
    isReady() {
      return state === LIFECYCLE_STATES.READY && migrationsComplete === true;
    },
    isDraining() {
      return state === LIFECYCLE_STATES.DRAINING;
    },
    markReady() {
      if (state === LIFECYCLE_STATES.STOPPED) return;
      state = LIFECYCLE_STATES.READY;
    },
    startDrain() {
      if (state === LIFECYCLE_STATES.STOPPED) return;
      state = LIFECYCLE_STATES.DRAINING;
    },
    markStopped() {
      state = LIFECYCLE_STATES.STOPPED;
    },
    setMigrationsComplete(value) {
      migrationsComplete = Boolean(value);
    },
    isMigrationsComplete() {
      return migrationsComplete;
    },
  };
}

module.exports = {
  createLifecycle,
  LIFECYCLE_STATES,
};

