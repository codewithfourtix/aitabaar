# Aitbaar WhatsApp Bot

Owner: **Ali Zulfiqar** · Node.js · Urdu/English applicant channel.
Conversation spec: [`../docs/whatsapp-bot-flow.md`](../docs/whatsapp-bot-flow.md)

## Two channels, one state machine

`CHANNEL` picks how messages get in and out. Everything below the channel —
the conversation flow, the Urdu/English strings, document upload, the decision
poller — is identical either way.

| `CHANNEL` | Transport | Trade-off |
|---|---|---|
| `twilio` (recommended) | Twilio Business API webhook | No Chromium, no QR, no session to lose, no ban risk. Every tester must send the sandbox join code once. |
| `wwebjs` (fallback) | whatsapp-web.js + Chromium | Any number, no opt-in step. Needs ~1GB RAM, a QR scan, a session volume, and it is an unofficial client. |

## Files

- `src/index.js` — entrypoint; picks the channel (whatsapp-web.js is required lazily, so `twilio` mode never loads Chromium).
- `src/twilio.js` — **Twilio channel**: webhook, signature validation, media fetch, outbound REST.
- `src/wa.js` — **whatsapp-web.js channel**: `LocalAuth` persists the session at `SESSION_DIR`.
- `src/server.js` — `/qr` (scan to link) + `/health`, used by the `wwebjs` channel only.
- `src/flow.js` — conversation state machine + decision poller (pushes approve/reject/needs-docs to the applicant).
- `src/api.js` — backend REST client (`BACKEND_API_URL`).
- `src/strings.js` — every user-facing message, en/ur.
- `src/websim.js` — browser-based demo of the same flow, no WhatsApp at all (`npm run sim`).

## Run locally — Twilio channel

```bash
cd whatsapp-bot
npm install
cp .env.example .env        # fill in the TWILIO_* values
npm start
```

Twilio has to reach your machine, so expose it:

```bash
ngrok http 8001
```

Then in the Twilio console → **Messaging → Try it out → Send a WhatsApp message
→ Sandbox settings**, set **When a message comes in** to
`https://<your-ngrok-host>/webhook/twilio`, method **POST**, and save.

Each tester sends `join <code>` to the sandbox number once, then says `hi`.
Open `http://localhost:8001/` for the join instructions and a one-tap `wa.me` link.

### Signature validation

Inbound requests are verified against `X-Twilio-Signature` (HMAC-SHA1 over the
public URL plus the sorted POST params). If valid requests get rejected, the log
prints the URL it reconstructed — usually it disagrees with what the sandbox is
configured to call. Pin it with `TWILIO_WEBHOOK_URL`, or set
`TWILIO_VALIDATE_SIGNATURE=false` to skip the check.

## Run locally — whatsapp-web.js channel

```bash
CHANNEL=wwebjs npm start
```

Open http://localhost:8001/qr → scan with the phone that owns the bot number
(WhatsApp → Linked devices → Link a device). The session lands in `.wwebjs_auth/`
(gitignored) — you only scan once. Then message the linked number: send `loan`.

## Docker

```bash
# Twilio channel — slim, no Chromium
docker build -f Dockerfile.twilio -t aitbaar-bot-twilio ./whatsapp-bot
docker run -p 8001:8001 --env-file whatsapp-bot/.env aitbaar-bot-twilio

# whatsapp-web.js channel — needs the session volume
docker build -t aitbaar-bot ./whatsapp-bot
docker run -p 8001:8001 -v aitbaar_session:/data -e BACKEND_API_URL=http://host.docker.internal:8000 aitbaar-bot
```

## Deploy on Railway

### Twilio channel

1. New service from this repo, **root directory = `whatsapp-bot`**, Dockerfile path **`Dockerfile.twilio`**.
2. Variables: `CHANNEL=twilio`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM`, `TWILIO_SANDBOX_JOIN_CODE`, `BACKEND_API_URL`.
3. Generate a public domain.
4. Point the sandbox webhook at `https://<bot>.up.railway.app/webhook/twilio` (POST).
5. `/health` shows `{channel: "twilio", status: "ready"}`.

No volume needed. No QR. Redeploys are stateless.

### whatsapp-web.js channel

1. Same, but Dockerfile path **`Dockerfile`**.
2. **Add a volume**, mount path **`/data`** — `SESSION_DIR=/data/wwebjs_auth` is set in the Dockerfile, so redeploys do not disconnect the number.
3. Open `https://<bot>.up.railway.app/qr` and scan **once** with the bot phone.

Scan the QR only once per volume. If you hit a `disconnected` loop, wipe the
volume contents, redeploy, scan again.

## Known limits (also stated in the deliverables)

- The Twilio **sandbox** is a shared number with a join-code opt-in. A real
  branded WhatsApp number needs Meta Business verification — days of review,
  out of scope for the hackathon.
- Meta's **24-hour window**: free-form messages only go out within 24h of the
  applicant's last message. The decision poller in `flow.js` pushes outcomes
  minutes later in a demo, so it is fine there; in production a delayed officer
  decision needs an approved message template.
- The `wwebjs` channel drives real WhatsApp Web — fine for a demo; production
  rides the bank's official WhatsApp Business API.

## Env vars

| Var | Default | Notes |
|---|---|---|
| `CHANNEL` | `wwebjs` | `twilio` or `wwebjs` |
| `PORT` | `8001` | HTTP server |
| `BACKEND_API_URL` | `http://localhost:8000` | Aitbaar backend |
| `TWILIO_ACCOUNT_SID` | — | required when `CHANNEL=twilio` |
| `TWILIO_AUTH_TOKEN` | — | required when `CHANNEL=twilio` |
| `TWILIO_WHATSAPP_FROM` | `whatsapp:+14155238886` | sandbox number |
| `TWILIO_SANDBOX_JOIN_CODE` | — | shown on `/`, used for the `wa.me` link |
| `TWILIO_WEBHOOK_URL` | (reconstructed) | pin the URL used for signature checks |
| `TWILIO_VALIDATE_SIGNATURE` | `true` | set `false` only to debug rejections |
| `SESSION_DIR` | `./.wwebjs_auth` (Docker: `/data/wwebjs_auth`) | `wwebjs` only — mount a volume here |
| `PUPPETEER_EXECUTABLE_PATH` | (Docker: `/usr/bin/chromium`) | `wwebjs` only |
