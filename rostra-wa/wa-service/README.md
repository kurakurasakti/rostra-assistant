# Rostra WA Service

WhatsApp gateway service using [Baileys](https://github.com/WhiskeySockets/Baileys) (unofficial WhatsApp Web API). Manages multi-session WhatsApp connections and forwards incoming messages to a Next.js backend via webhook.

## How It Works

This service is a standalone Express server that manages WhatsApp Web sessions. Each user gets an isolated session authenticated by QR code scan. Incoming messages are forwarded to the Next.js app's webhook endpoint; the Next.js app triggers send/disconnect via HTTP calls to this service.

## Endpoints

### `POST /session/:userId/connect`
Start a new WhatsApp session. If session exists and is connected, returns immediately. Otherwise creates a fresh session, clears stale auth, and waits up to 30s for QR generation or connection.

**Response (waiting scan):** `{ status: "waiting_scan", qr: "data:image/png;base64,..." }`
**Response (connected):** `{ status: "connected" }`

### `GET /session/:userId/qr`
Get current QR code for an ongoing session.

**Response:** `{ status: "waiting_scan"|"connected"|"waiting"|"not_found", qr?: "data:..." }`

### `GET /session/:userId/status`
Check session connection status.

**Response:** `{ status, connected, number }`

### `POST /session/:userId/send`
Send a WhatsApp message.

**Body:** `{ to: "628xxx", message: "Hello" }`
**Response:** `{ success: true }`

### `POST /session/:userId/disconnect`
Log out and remove a session.

**Response:** `{ success: true }`

### `GET /health`
Health check with active session list.

**Response:** `{ status: "ok", sessions: 0, active: [] }`

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3001` | Express server port |
| `NEXT_APP_URL` | `http://localhost:3000` | Next.js app base URL for webhooks & callbacks |
| `WEBHOOK_SECRET` | `""` | Secret sent as `x-webhook-secret` header to webhook |

## Startup

On boot, the service scans `./auth/` for existing session directories and attempts to resume them. The server starts listening only after all sessions are loaded.
