# EasyQR React Starter

This example consumes `@easyqr/sdk` as an external package dependency.

## Prerequisites

- Node.js 18+
- EasyQR server running at `http://localhost:3000`
- A valid project/key pair (for local demo: `demo_project` / `demo_key`)

## Install

```bash
cd sdk
npm install
npm run build

cd ../examples/react
npm install
```

## Run

```bash
npm run dev
```

Open the Vite URL shown in terminal (default: `http://localhost:5173`).

## Expected Flow

1. Click `Create Session`.
2. A session is created via SDK `startHost()`.
3. Session and mobile URL appear in panel.
4. Open mobile URL on phone/browser and scan.
5. Scan values appear live in `Live Scan Values`.
6. Click `Disconnect` to close connection.
7. Reload page: old connection is cleaned by hook unmount/destroy.

## Troubleshooting

- If `Create Session` fails with unauthorized, verify `projectId` / `apiKey` in `src/App.tsx`.
- If connection stays `connecting`, verify EasyQR backend is running on port `3000`.
- If no scans appear, verify phone is using the generated mobile URL and camera permission is granted.
- If SDK import fails, run `npm run build` inside `sdk/` again, then reinstall in `examples/react`.
