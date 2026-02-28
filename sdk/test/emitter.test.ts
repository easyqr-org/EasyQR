import test from "node:test";
import assert from "node:assert/strict";

import { createEmitter } from "../src/events/emitter.js";

type TestEventMap = {
  alpha: { value: number };
  beta: { text: string };
};

test("subscribe/unsubscribe works", () => {
  const emitter = createEmitter<TestEventMap>();
  let calls = 0;
  const handler = () => {
    calls += 1;
  };

  emitter.on("alpha", handler);
  emitter.emit("alpha", { value: 1 });
  emitter.off("alpha", handler);
  emitter.emit("alpha", { value: 2 });

  assert.equal(calls, 1);
});

test("multiple listeners fire", () => {
  const emitter = createEmitter<TestEventMap>();
  const seen: number[] = [];

  emitter.on("alpha", (payload) => {
    seen.push(payload.value + 1);
  });
  emitter.on("alpha", (payload) => {
    seen.push(payload.value + 2);
  });

  emitter.emit("alpha", { value: 10 });

  assert.deepEqual(seen, [11, 12]);
});

test("handler error isolation", () => {
  const emitter = createEmitter<TestEventMap>();
  let safeHandlerCalled = false;

  emitter.on("beta", () => {
    throw new Error("listener failure");
  });
  emitter.on("beta", () => {
    safeHandlerCalled = true;
  });

  assert.doesNotThrow(() => {
    emitter.emit("beta", { text: "ok" });
  });
  assert.equal(safeHandlerCalled, true);
});
