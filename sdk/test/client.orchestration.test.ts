import test from "node:test";
import assert from "node:assert/strict";

import { createEasyQRClient, EasyQRError } from "../src/index.js";

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
}

const originalFetch = globalThis.fetch;
const originalWebSocket = (globalThis as { WebSocket?: unknown }).WebSocket;

test.beforeEach(() => {
  MockWebSocket.instances = [];
  (globalThis as { WebSocket?: unknown }).WebSocket = MockWebSocket;
  globalThis.fetch = async () => {
    return {
      ok: true,
      status: 201,
      async json() {
        return {
          sessionId: "session-host-1",
          wsToken: "token-1",
          desktopUrl: "http://localhost:3000/session/session-host-1?token=token-1",
          mobileUrl:
            "http://localhost:3000/mobile?sessionId=session-host-1&token=token-1",
          expiresAt: 1700000000000,
        };
      },
    } as Response;
  };
});

test.afterEach(() => {
  globalThis.fetch = originalFetch;
  (globalThis as { WebSocket?: unknown }).WebSocket = originalWebSocket;
});

test("startHost creates session and connects host", async () => {
  const client = createEasyQRClient({
    baseUrl: "http://localhost:3000",
    projectId: "demo_project",
    apiKey: "demo_key",
  });

  const session = await client.startHost({ context: { itemId: "SKU-1" } });

  assert.equal(session.session.sessionId, "session-host-1");
  assert.equal(MockWebSocket.instances.length, 1);
  const wsUrl = MockWebSocket.instances[0].url;
  assert.equal(wsUrl.includes("sessionId=session-host-1"), true);
  assert.equal(wsUrl.includes("role=HOST"), true);
});

test("startMobile connects mobile", async () => {
  const client = createEasyQRClient({
    baseUrl: "http://localhost:3000",
    projectId: "demo_project",
    apiKey: "demo_key",
  });

  await client.startMobile("session-mobile-1");

  assert.equal(MockWebSocket.instances.length, 1);
  const wsUrl = MockWebSocket.instances[0].url;
  assert.equal(wsUrl.includes("sessionId=session-mobile-1"), true);
  assert.equal(wsUrl.includes("role=MOBILE"), true);
});

test("double connect is prevented", async () => {
  const client = createEasyQRClient({
    baseUrl: "http://localhost:3000",
    projectId: "demo_project",
    apiKey: "demo_key",
  });

  await client.connectHost({ sessionId: "s1" });

  await assert.rejects(
    () => client.connectHost({ sessionId: "s1" }),
    (error: unknown) => {
      assert.equal(error instanceof EasyQRError, true);
      assert.equal((error as EasyQRError).code, "E_INTERNAL");
      return true;
    }
  );
});

test("startHost while connected is prevented", async () => {
  const client = createEasyQRClient({
    baseUrl: "http://localhost:3000",
    projectId: "demo_project",
    apiKey: "demo_key",
  });

  await client.connectHost({ sessionId: "s1" });

  await assert.rejects(
    () => client.startHost(),
    (error: unknown) => {
      assert.equal(error instanceof EasyQRError, true);
      assert.equal((error as EasyQRError).code, "E_INTERNAL");
      return true;
    }
  );
});

test("disconnect resets state and allows reconnect", async () => {
  const client = createEasyQRClient({
    baseUrl: "http://localhost:3000",
    projectId: "demo_project",
    apiKey: "demo_key",
  });

  await client.connectHost({ sessionId: "s-disconnect" });
  await client.disconnect();
  await client.connectHost({ sessionId: "s-reconnect" });

  assert.equal(MockWebSocket.instances.length, 2);
  assert.equal(MockWebSocket.instances[0].closed, true);
  assert.equal(MockWebSocket.instances[1].url.includes("sessionId=s-reconnect"), true);
});

test("destroy cleans listeners and is idempotent", async () => {
  const client = createEasyQRClient({
    baseUrl: "http://localhost:3000",
    projectId: "demo_project",
    apiKey: "demo_key",
  });

  let closeEvents = 0;
  client.on("connection.closed", () => {
    closeEvents += 1;
  });

  await client.connectHost({ sessionId: "s-destroy" });
  await client.destroy();
  assert.equal(closeEvents, 1);

  await client.destroy();
  await client.connectHost({ sessionId: "s-after-destroy" });
  await client.disconnect();

  assert.equal(closeEvents, 1);
});

test("connectMobile without session is prevented", async () => {
  const client = createEasyQRClient({
    baseUrl: "http://localhost:3000",
    projectId: "demo_project",
    apiKey: "demo_key",
  });

  await assert.rejects(
    () => client.connectMobile({ sessionId: "" }),
    (error: unknown) => {
      assert.equal(error instanceof EasyQRError, true);
      assert.equal((error as EasyQRError).code, "E_INTERNAL");
      return true;
    }
  );
});
