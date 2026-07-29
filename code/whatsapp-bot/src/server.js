// Tiny web server: /qr renders the link QR in the browser (works on Railway —
// no terminal needed), /health for monitoring.

const express = require('express');
const QRCode = require('qrcode');
const { botState } = require('./wa');

const PAGE = (body) => `<!doctype html>
<html><head><meta charset="utf-8"><meta http-equiv="refresh" content="5">
<title>Aitbaar Bot</title>
<style>body{font-family:system-ui,sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:90vh;background:#0b1220;color:#e8edf7}img{background:#fff;padding:16px;border-radius:12px}h1{font-size:1.3rem}.ok{color:#4ade80}.warn{color:#fbbf24}</style>
</head><body>${body}<p style="opacity:.5">auto-refreshes every 5s</p></body></html>`;

function startServer() {
  const app = express();
  const port = process.env.PORT || 8001;

  app.get('/health', (_req, res) => {
    res.json({ service: 'aitbaar-whatsapp-bot', status: botState.status, me: botState.me });
  });

  app.get('/qr', async (_req, res) => {
    if (botState.status === 'ready') {
      return res.send(PAGE(`<h1 class="ok">✅ Linked as +${botState.me}</h1><p>The bot is live. This page can be closed.</p>`));
    }
    if (botState.status === 'qr' && botState.qr) {
      const dataUrl = await QRCode.toDataURL(botState.qr, { width: 320, margin: 1 });
      return res.send(PAGE(`<h1>Scan to link the Aitbaar number</h1>
        <p>WhatsApp → Settings → Linked devices → Link a device</p>
        <img src="${dataUrl}" alt="qr">`));
    }
    return res.send(PAGE(`<h1 class="warn">⏳ ${botState.status}...</h1><p>Waiting for WhatsApp client. This page refreshes itself.</p>`));
  });

  app.get('/', (_req, res) => res.redirect('/qr'));

  app.listen(port, () => console.log(`web server on :${port} — open /qr to link`));
}

module.exports = { startServer };
