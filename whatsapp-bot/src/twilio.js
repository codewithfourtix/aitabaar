// Twilio WhatsApp adapter — drives the SAME conversation state machine
// (src/flow.js) as the whatsapp-web.js channel, over Twilio's Business API.
//
// Why this exists: no Chromium (the 512MB OOM problem disappears), no QR or
// session volume to lose mid-demo, no unofficial-client ban risk. The cost is
// the sandbox opt-in — every tester sends the join code to the sandbox number
// once before the bot can talk to them.
//
// flow.js / strings.js / api.js are untouched: this file just translates
// Twilio's webhook payload into the message shape flow.js already expects.
//
// Run:  CHANNEL=twilio npm start
// Then point the sandbox webhook at  https://<public-host>/webhook/twilio (POST)

const crypto = require('crypto');
const express = require('express');
const axios = require('axios');
const { handleMessage, startPoller } = require('./flow');

const API_ROOT = 'https://api.twilio.com/2010-04-01';

const ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const FROM = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886';
const JOIN_CODE = process.env.TWILIO_SANDBOX_JOIN_CODE || '';

// Signature checking is on by default. Turn it off only if a proxy rewrites the
// URL in a way we can't reconstruct — a rejection is logged loudly either way,
// so a silent "bot never replies" is not a failure mode here.
const VALIDATE = (process.env.TWILIO_VALIDATE_SIGNATURE || 'true') !== 'false';

// Twilio hard-caps a WhatsApp body at 1600 chars; the consent checklist is long.
const MAX_LEN = 1500;

const channelState = {
  status: 'starting', // starting | ready | misconfigured
  from: FROM,
  joinCode: JOIN_CODE,
  lastInbound: null,
  lastError: null,
};

// --- address translation -------------------------------------------------
// flow.js speaks whatsapp-web.js ids ("923001234567@c.us"); Twilio speaks
// "whatsapp:+923001234567". Keep the conversion in one place.

function waIdFromTwilio(from) {
  return `${String(from).replace(/^whatsapp:/, '').replace(/^\+/, '')}@c.us`;
}

function twilioAddrFromWaId(chatId) {
  return `whatsapp:+${String(chatId).split('@')[0]}`;
}

// --- outbound ------------------------------------------------------------

function splitLong(text) {
  if (text.length <= MAX_LEN) return [text];
  const parts = [];
  let rest = text;
  while (rest.length > MAX_LEN) {
    // Prefer a line break so numbered checklists don't get sliced mid-item
    let cut = rest.lastIndexOf('\n', MAX_LEN);
    if (cut < MAX_LEN * 0.5) cut = MAX_LEN;
    parts.push(rest.slice(0, cut).trimEnd());
    rest = rest.slice(cut).trimStart();
  }
  if (rest) parts.push(rest);
  return parts;
}

async function sendRaw(to, body) {
  const form = new URLSearchParams({ From: FROM, To: to, Body: body });
  await axios.post(`${API_ROOT}/Accounts/${ACCOUNT_SID}/Messages.json`, form.toString(), {
    auth: { username: ACCOUNT_SID, password: AUTH_TOKEN },
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    timeout: 20000,
  });
}

// The object handed to startPoller(), mirroring the one method it uses.
const client = {
  async sendMessage(chatId, text) {
    const to = chatId.startsWith('whatsapp:') ? chatId : twilioAddrFromWaId(chatId);
    for (const part of splitLong(String(text))) {
      await sendRaw(to, part);
    }
  },
};

// --- inbound media -------------------------------------------------------

async function fetchMedia(url) {
  // A Twilio media URL redirects to a pre-signed S3 link. Send basic auth to
  // Twilio but NOT to S3, which rejects an unexpected Authorization header.
  let res = await axios.get(url, {
    auth: { username: ACCOUNT_SID, password: AUTH_TOKEN },
    responseType: 'arraybuffer',
    maxRedirects: 0,
    timeout: 30000,
    validateStatus: (s) => (s >= 200 && s < 300) || (s >= 300 && s < 400),
  });
  if (res.status >= 300) {
    const location = res.headers.location;
    if (!location) throw new Error(`media redirect with no location (${res.status})`);
    res = await axios.get(location, { responseType: 'arraybuffer', timeout: 30000 });
  }
  return Buffer.from(res.data);
}

// Build the message object flow.js expects (same contract as websim.js).
function makeMsg(body, fields) {
  const count = parseInt(fields.NumMedia || '0', 10) || 0;
  const mediaUrl = count > 0 ? fields.MediaUrl0 : null;
  const mimetype = count > 0 ? fields.MediaContentType0 || 'image/jpeg' : null;

  return {
    from: waIdFromTwilio(fields.From),
    body: body || '',
    hasMedia: count > 0,
    reply: async () => {}, // replies go out over REST, not as a webhook response
    // flow.js derives the filename from the doc type when we omit it
    downloadMedia: mediaUrl
      ? async () => ({ data: (await fetchMedia(mediaUrl)).toString('base64'), mimetype })
      : undefined,
  };
}

// --- signature validation ------------------------------------------------
// https://www.twilio.com/docs/usage/security#validating-requests
// HMAC-SHA1 over (full URL + each POST param name and value, sorted by name).

function expectedSignature(url, params) {
  const data = Object.keys(params)
    .sort()
    .reduce((acc, key) => acc + key + params[key], url);
  return crypto.createHmac('sha1', AUTH_TOKEN).update(Buffer.from(data, 'utf-8')).digest('base64');
}

function publicUrl(req) {
  // Railway/Caddy terminate TLS, so req.protocol alone reports http.
  const proto = req.get('x-forwarded-proto') || req.protocol;
  const host = req.get('x-forwarded-host') || req.get('host');
  return `${proto}://${host}${req.originalUrl}`;
}

function signatureOk(req) {
  const signature = req.get('x-twilio-signature');
  if (!signature) return false;
  const url = process.env.TWILIO_WEBHOOK_URL || publicUrl(req);
  const expected = expectedSignature(url, req.body || {});
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// --- server --------------------------------------------------------------

const INFO_PAGE = () => `<!doctype html>
<html><head><meta charset="utf-8"><title>Aitbaar Bot — Twilio</title>
<style>body{font-family:system-ui,sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:90vh;background:#0b1220;color:#e8edf7;text-align:center}code{background:#1b2740;padding:2px 8px;border-radius:6px}a{color:#60a5fa}</style>
</head><body>
<h1>Aitbaar applicant bot — Twilio channel</h1>
<p>Send <code>join ${JOIN_CODE || '&lt;your-code&gt;'}</code> to <code>${FROM.replace('whatsapp:', '')}</code> once, then say <code>hi</code>.</p>
${JOIN_CODE ? `<p><a href="https://wa.me/${FROM.replace(/\D/g, '')}?text=join%20${encodeURIComponent(JOIN_CODE)}">Tap to join on WhatsApp</a></p>` : ''}
<p style="opacity:.5">status: ${channelState.status}${channelState.lastInbound ? ` · last message ${channelState.lastInbound}` : ''}</p>
</body></html>`;

function startTwilioBot() {
  if (!ACCOUNT_SID || !AUTH_TOKEN) {
    console.error('TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN are required for CHANNEL=twilio');
    process.exit(1);
  }

  const app = express();
  const port = process.env.PORT || 8001;
  app.set('trust proxy', true);
  app.use(express.urlencoded({ extended: false }));

  app.get('/health', (_req, res) => {
    res.json({
      service: 'aitbaar-whatsapp-bot',
      channel: 'twilio',
      status: channelState.status,
      from: channelState.from,
      lastInbound: channelState.lastInbound,
      lastError: channelState.lastError,
    });
  });

  app.post('/webhook/twilio', async (req, res) => {
    if (VALIDATE && !signatureOk(req)) {
      // Loud on purpose: the usual cause is the sandbox webhook URL not matching
      // the public URL we see. Set TWILIO_WEBHOOK_URL to pin it, or set
      // TWILIO_VALIDATE_SIGNATURE=false to skip the check.
      console.error('REJECTED webhook: bad X-Twilio-Signature. Saw URL', publicUrl(req));
      channelState.lastError = 'signature rejected';
      return res.status(403).send('invalid signature');
    }

    // Ack immediately — Twilio times the webhook out at 15s, and document
    // download + upload can outrun that. The reply goes out over REST below.
    res.type('text/xml').send('<Response></Response>');

    const from = req.body.From;
    if (!from) return;
    channelState.lastInbound = new Date().toISOString();
    channelState.status = 'ready';

    try {
      const reply = await handleMessage(makeMsg(req.body.Body, req.body));
      if (reply) await client.sendMessage(waIdFromTwilio(from), reply);
    } catch (err) {
      console.error('handler error:', err.message);
      channelState.lastError = err.message;
      try {
        await client.sendMessage(
          waIdFromTwilio(from),
          '⚠️ Technical issue — please try again in a few minutes.'
        );
      } catch (_) { /* ignore */ }
    }
  });

  app.get('/', (_req, res) => res.send(INFO_PAGE()));

  app.listen(port, () => {
    channelState.status = 'ready';
    console.log(`Twilio WhatsApp channel on :${port}`);
    console.log(`  sandbox number : ${FROM.replace('whatsapp:', '')}`);
    console.log(`  join code      : ${JOIN_CODE ? `join ${JOIN_CODE}` : '(set TWILIO_SANDBOX_JOIN_CODE)'}`);
    console.log(`  webhook path   : POST /webhook/twilio`);
    console.log(`  signature check: ${VALIDATE ? 'on' : 'OFF'}`);
  });

  startPoller(client);
}

module.exports = { startTwilioBot, client, waIdFromTwilio, twilioAddrFromWaId, splitLong };
