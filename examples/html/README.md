# EasyQR Vanilla HTML Starter

This example demonstrates using `@easyqr/sdk` in pure browser JavaScript with no framework.

## Run

1. Build SDK first:

```bash
cd sdk
npm install
npm run build
```

2. Serve repository root with any static server (example):

```bash
cd ..
python3 -m http.server 8080
```

3. Open:

`http://localhost:8080/examples/html/`

## Expected Flow

1. Click `Create Session`.
2. Session ID and Mobile URL appear.
3. Open Mobile URL on phone/second browser.
4. Connect and scan barcode/QR.
5. Live scan values appear in list.
6. Click `Disconnect` to close connection.

## Notes

- All communication is via SDK APIs/events.
- No direct `fetch` or `WebSocket` calls are used in this example.
