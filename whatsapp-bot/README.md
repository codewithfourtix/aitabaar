# Aitbaar WhatsApp Bot

Owner: **Ali Zulfiqar** · Node.js + whatsapp-web.js · Urdu/English applicant channel.
Conversation spec: [`../docs/whatsapp-bot-flow.md`](../docs/whatsapp-bot-flow.md)

## How it works

- `src/index.js` — entrypoint: starts the WhatsApp client + web server.
- `src/wa.js` — whatsapp-web.js client. `LocalAuth` persists the session at `SESSION_DIR`.
- `src/server.js` — web pages: **`/qr`** (scan to link the number, auto-refreshes), `/health`.
- `src/flow.js` — conversation state machine + decision poller (pushes approve/reject/needs-docs outcomes to the applicant).
- `src/api.js` — backend REST client (`BACKEND_API_URL`).
- `src/strings.js` — every user-facing message, en/ur.

## Run locally

```bash
cd whatsapp-bot
npm install
cp .env.example .env        # defaults are fine if backend runs on :8000
npm start
```

Open http://localhost:8001/qr → scan with the phone that owns the bot number (WhatsApp → Linked devices → Link a device). The session lands in `.wwebjs_auth/` (gitignored) — you only scan once.

Then message the linked number from another phone: send `loan`.

## Docker

```bash
docker build -t aitbaar-bot ./whatsapp-bot
docker run -p 8001:8001 -v aitbaar_session:/data -e BACKEND_API_URL=http://host.docker.internal:8000 aitbaar-bot
```

The named volume `aitbaar_session` holds the WhatsApp session — recreating the container does not log the number out.

## Deploy on Railway (session survives redeploys)

1. New Railway service from this repo, **root directory = `whatsapp-bot`** (it detects the Dockerfile).
2. **Add a volume** to the service, mount path **`/data`**. This is the critical step — `SESSION_DIR=/data/wwebjs_auth` is set in the Dockerfile, so the WhatsApp session lives on the volume and **redeploys/restarts do NOT disconnect the number**.
3. Variables: `BACKEND_API_URL=https://<backend-service>.up.railway.app`.
4. Generate a public domain for the service → open `https://<bot>.up.railway.app/qr` → scan **once** with the bot phone.
5. `/health` shows `{status: "ready", me: "<number>"}` when live.

Notes:
- Scan the QR only once per volume. If you must relink (e.g. `disconnected` loop), wipe the volume contents and redeploy, then scan again.
- The container restarts itself on WhatsApp disconnect; LocalAuth restores from the volume.
- whatsapp-web.js drives real WhatsApp Web — fine for the hackathon demo; production rides the bank's official WhatsApp Business API instead (stated in the deliverables).

## Env vars

| Var | Default | Notes |
|---|---|---|
| `PORT` | `8001` | web server (QR + health) |
| `SESSION_DIR` | `./.wwebjs_auth` (Docker: `/data/wwebjs_auth`) | session storage — mount a volume here in prod |
| `BACKEND_API_URL` | `http://localhost:8000` | Aitbaar backend |
| `PUPPETEER_EXECUTABLE_PATH` | (Docker: `/usr/bin/chromium`) | leave empty locally |
