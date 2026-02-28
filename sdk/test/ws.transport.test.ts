import test from "node:test";
import assert from "node:assert/strict";

import { connectWebSocket } from "../src/transport/ws.js";

class MockWebSocket {
  static instances: MockWebSocket[] = [];

  public onopen: null | (() => void) = null;
  public onmessage: null | ((event: { data?: unknown }) => void) = null;
  public onclose: null | ((event: { code?: number; reason?: string }) => void) = null;
  public onerror: null | ((event: unknown) => void) = null;
  public closed = false;
  public readonly url: string;

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

  emitClose(code?: number, reason?: string): void {
    this.onclose?.({ code, reason });
  }

  emitError(err: unknown): void {
    this.onerror?.(err);
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

test("open callback fires", () => {
  let opened = false;
  connectWebSocket("ws://localhost:3000/ws", {
    onOpen: () => {
      opened = true;
    },
  });

  const socket = MockWebSocket.instances[0];
  socket.emitOpen();

  assert.equal(opened, true);
});

test("message parsed correctly", () => {
  let received: unknown = null;
  connectWebSocket("ws://localhost:3000/ws", {
    onMessage: (data) => {
      received = data;
    },
  });

  const socket = MockWebSocket.instances[0];
  socket.emitMessage('{"type":"SCAN","value":"ABC"}');

  assert.deepEqual(received, { type: "SCAN", value: "ABC" });
});

test("invalid JSON is ignored", () => {
  let callCount = 0;
  connectWebSocket("ws://localhost:3000/ws", {
    onMessage: () => {
      callCount += 1;
    },
  });

  const socket = MockWebSocket.instances[0];
  socket.emitMessage("{not-json");

  assert.equal(callCount, 0);
});

test("close() shuts connection", () => {
  const connection = connectWebSocket("ws://localhost:3000/ws", {});
  const socket = MockWebSocket.instances[0];

  assert.equal(socket.closed, false);
  connection.close();
  assert.equal(socket.closed, true);
});
