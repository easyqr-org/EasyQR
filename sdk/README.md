# @easyqr/sdk

Typed browser SDK for integrating EasyQR into inventory and operations UIs.

## Installation

```bash
npm install @easyqr/sdk
```

For local workspace usage:

```bash
npm install ../sdk
```

## Quick Start

```ts
import { createEasyQRClient } from "@easyqr/sdk";

const client = createEasyQRClient({
  baseUrl: "http://localhost:3000",
  projectId: "your_project_id",
  apiKey: "your_api_key",
});

const session = await client.startHost();
console.log(session.session.sessionId, session.mobileUrl);
```

## createEasyQRClient Example

```ts
import { createEasyQRClient } from "@easyqr/sdk";

const client = createEasyQRClient({
  baseUrl: "https://easyqr.yourdomain.com",
  projectId: "inventory_prod",
  apiKey: "inventory_prod_key",
});

await client.connectHost({ sessionId: "session_123" });
```

## Event Usage Example

```ts
client.on("connection.open", (payload) => {
  console.log("connected", payload.role, payload.sessionId);
});

client.on("session.state", (payload) => {
  console.log("session state", payload.state);
});

client.on("scan.received", (payload) => {
  console.log("scan", payload.scan.value, payload.scan.format);
});

client.on("connection.error", (payload) => {
  console.error(payload.code, payload.message);
});
```

## React Usage Reference

- See `examples/react/` for hook-based integration with `useEasyQR`.
- The React starter consumes `@easyqr/sdk` exactly as a third-party package.

## HTML Usage Reference

- See `examples/html/` for framework-independent browser integration.
- The HTML starter uses SDK APIs/events only (no custom transport code).

## Troubleshooting

- `401 Unauthorized`: verify `projectId` and `apiKey`.
- `429 Rate limit`: reduce burst traffic and retry after server window.
- WebSocket does not open: verify `baseUrl` and CORS/origin configuration.
- No scan events: verify mobile session URL and camera permissions.
- Local package issues: run `npm run build` in `sdk/` before reinstalling.

## Version Policy

- Semantic Versioning (SemVer).
- `0.x` indicates evolving API while contracts stabilize.
- Breaking changes increment minor while on `0.x`.
- `1.0.0` will indicate stable client contract for long-term compatibility.

## Integration Target

This SDK is designed to support first successful integration in under 30 minutes when EasyQR server credentials are available.
