import test from "node:test";
import assert from "node:assert/strict";

import { createEasyQRClient } from "../src/index.js";
import type {
  CreateSessionRequest,
  EasyQRClientConfig,
  EasyQREventName,
} from "../src/index.js";

test("factory returns object with expected method names", () => {
  const config: EasyQRClientConfig = {
    baseUrl: "http://localhost:3000",
    projectId: "demo_project",
    apiKey: "demo_key",
  };

  const client = createEasyQRClient(config);

  assert.equal(typeof client.createSession, "function");
  assert.equal(typeof client.startHost, "function");
  assert.equal(typeof client.startMobile, "function");
  assert.equal(typeof client.connectHost, "function");
  assert.equal(typeof client.connectMobile, "function");
  assert.equal(typeof client.disconnect, "function");
  assert.equal(typeof client.on, "function");
  assert.equal(typeof client.off, "function");
  assert.equal(typeof client.destroy, "function");
});

test("public type contracts compile in test context", () => {
  const request: CreateSessionRequest = {
    context: { itemId: "SKU-1" },
  };
  const eventName: EasyQREventName = "session.state";

  assert.ok(request);
  assert.equal(eventName, "session.state");
});
