import test from "node:test";
import assert from "node:assert/strict";

import { createEasyQRClient, EasyQRError } from "../src/index.js";

const originalFetch = globalThis.fetch;

function restoreFetch(): void {
  globalThis.fetch = originalFetch;
}

test.afterEach(() => {
  restoreFetch();
});

test("createSession success returns normalized typed response", async () => {
  globalThis.fetch = async (input, init) => {
    assert.equal(String(input), "http://localhost:3000/api/sessions");
    assert.equal(init?.method, "POST");
    const headers = init?.headers as Record<string, string>;
    assert.equal(headers["x-project-id"], "demo_project");
    assert.equal(headers["x-api-key"], "demo_key");
    assert.equal(headers["content-type"], "application/json");

    const body = JSON.parse(String(init?.body));
    assert.equal(body.projectId, "demo_project");
    assert.equal(body.apiKey, "demo_key");
    assert.equal(body.context.itemId, "SKU-1");

    return {
      ok: true,
      status: 201,
      async json() {
        return {
          sessionId: "session-1",
          wsToken: "token-1",
          desktopUrl: "http://localhost:3000/session/session-1?token=token-1",
          mobileUrl: "http://localhost:3000/mobile?sessionId=session-1&token=token-1",
          expiresAt: 1700000000000,
        };
      },
    } as Response;
  };

  const client = createEasyQRClient({
    baseUrl: "http://localhost:3000",
    projectId: "demo_project",
    apiKey: "demo_key",
  });

  const result = await client.createSession({
    context: { itemId: "SKU-1" },
  });

  assert.equal(result.session.sessionId, "session-1");
  assert.equal(result.session.projectId, "demo_project");
  assert.equal(result.desktopUrl.includes("/session/session-1"), true);
  assert.equal(result.token, "token-1");
});

test("createSession maps 401 to E_HTTP_UNAUTHORIZED", async () => {
  globalThis.fetch = async () => {
    return {
      ok: false,
      status: 401,
      async json() {
        return { error: "UNAUTHORIZED" };
      },
    } as Response;
  };

  const client = createEasyQRClient({
    baseUrl: "http://localhost:3000",
    projectId: "demo_project",
    apiKey: "bad_key",
  });

  await assert.rejects(
    () => client.createSession({}),
    (error: unknown) => {
      assert.equal(error instanceof EasyQRError, true);
      assert.equal((error as EasyQRError).code, "E_HTTP_UNAUTHORIZED");
      return true;
    }
  );
});

test("createSession maps 429 to E_HTTP_RATE_LIMITED", async () => {
  globalThis.fetch = async () => {
    return {
      ok: false,
      status: 429,
      async json() {
        return { error: "RATE_LIMIT_EXCEEDED" };
      },
    } as Response;
  };

  const client = createEasyQRClient({
    baseUrl: "http://localhost:3000",
    projectId: "demo_project",
    apiKey: "demo_key",
  });

  await assert.rejects(
    () => client.createSession({}),
    (error: unknown) => {
      assert.equal(error instanceof EasyQRError, true);
      assert.equal((error as EasyQRError).code, "E_HTTP_RATE_LIMITED");
      return true;
    }
  );
});
