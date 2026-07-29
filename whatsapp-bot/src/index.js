require('dotenv').config();

// Two applicant channels, same conversation state machine (src/flow.js):
//   CHANNEL=twilio  -> Twilio Business API webhook (no Chromium, no QR)
//   CHANNEL=wwebjs  -> whatsapp-web.js + Chromium, linked by QR (default)
// whatsapp-web.js is required lazily so twilio mode never loads Chromium.
const CHANNEL = (process.env.CHANNEL || 'wwebjs').toLowerCase();

if (CHANNEL === 'twilio') {
  require('./twilio').startTwilioBot();
} else {
  const { createClient } = require('./wa');
  const { startServer } = require('./server');

  const client = createClient();
  startServer();
  client.initialize().catch((err) => {
    console.error('failed to initialize WhatsApp client:', err);
    process.exit(1);
  });
}
