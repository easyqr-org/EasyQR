import test from "node:test";
import assert from "node:assert/strict";

import { createEasyQRClient } from "../src/index.js";

class MockWebSocket {
  static instances: MockWebSocket[] = [];

  public onopen: null | (() => void) = null;
  public onmessage: null | ((event: { data?: unknown }) => void) = null;
  public onclose: null | ((event: { code?: number; reason?: string }) => void) = null;
  public onerror: null | ((event: unknown) => void) = null;
  public readonly url: string;
  public closed = false;

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
  }

  close(): void {
    this.closed = true;
  }

  emitOpen(): void {
    this.onopen?.();
  }

  emitMessage(data: unknown): void {
    this.onmessage?.({ data });
  }

  emitError(error: unknown): void {
    this.onerror?.(error);
  }
}

const originalWebSocket = (globalThis as { WebSocket?: unknown }).WebSocket;

test.beforeEach(() => {
  MockWebSocket.instances = [];
  (globalThis as { WebSocket?: unknown }).WebSocket = MockWebSocket;
});

test.afterEach(() => {
  (globalThis as { WebSocket?: unknown }).WebSocket = originalWebSocket;
});

test("WS messages map to SDK events", async () => {
  const client = createEasyQRClient({
    baseUrl: "http://localhost:3000",
    projectId: "demo_project",
    apiKey: "demo_key",
  });

  const seen: string[] = [];
  client.on("session.state", (payload) => {
    seen.push(`state:${payload.state}:${payload.sessionId}`);
  });
  client.on("scan.received", (payload) => {
    seen.push(`scan:${payload.scan.value}`);
  });

  await client.connectHost({ sessionId: "s1" });
  const socket = MockWebSocket.instances[0];

  socket.emitMessage(JSON.stringify({
    type: "SESSION_STATE",
    sessionId: "s1",
    state: "ACTIVE",
  }));
  socket.emitMessage(JSON.stringify({
    type: "SCAN",
    payload: {
      sessionId: "s1",
      value: "ABC",
      format: "CODE_128",
      timestamp: 1700000000000,
    },
  }));

  assert.deepEqual(seen, ["state:ACTIVE:s1", "scan:ABC"]);
});

test("disconnect emits connection.closed", async () => {
  const client = createEasyQRClient({
    baseUrl: "http://localhost:3000",
    projectId: "demo_project",
    apiKey: "demo_key",
  });

  let closedReason = "";
  client.on("connection.closed", (payload) => {
    closedReason = payload.reason || "";
  });

  await client.connectHost({ sessionId: "s-close" });
  await client.disconnect();

  assert.equal(closedReason, "client_disconnect");
});

test("connection lifecycle emits open and error", async () => {
  const client = createEasyQRClient({
    baseUrl: "http://localhost:3000",
    projectId: "demo_project",
    apiKey: "demo_key",
  });

  let openSeen = "";
  let errorCode = "";

  client.on("connection.open", (payload) => {
    openSeen = `${payload.role}:${payload.sessionId}`;
  });
  client.on("connection.error", (payload) => {
    errorCode = payload.code;
  });

  await client.connectMobile({ sessionId: "m1" });
  const socket = MockWebSocket.instances[0];
  socket.emitOpen();
  socket.emitError(new Error("boom"));

  assert.equal(openSeen, "MOBILE:m1");
  assert.equal(errorCode, "E_WS_CONNECT_FAILED");
});

