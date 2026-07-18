// whatsapp-web.js client. Session persists via LocalAuth at SESSION_DIR —
// on Railway that's a mounted volume, so redeploys do NOT log the number out.

const { Client, LocalAuth } = require('whatsapp-web.js');
const { handleMessage, startPoller } = require('./flow');

const SESSION_DIR = process.env.SESSION_DIR || './.wwebjs_auth';

// Shared with the web server for the /qr page
const botState = {
  status: 'starting', // starting | qr | authenticated | ready | disconnected
  qr: null,           // latest QR string while status === 'qr'
  me: null,           // linked number once ready
  lastEvent: null,
};

function createClient() {
  const client = new Client({
    authStrategy: new LocalAuth({ dataPath: SESSION_DIR }),
    puppeteer: {
      headless: true,
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-first-run',
      ],
    },
  });

  client.on('qr', (qr) => {
    botState.status = 'qr';
    botState.qr = qr;
    botState.lastEvent = new Date().toISOString();
    console.log('QR ready — open /qr in the browser to link the number');
  });

  client.on('authenticated', () => {
    botState.status = 'authenticated';
    botState.qr = null;
    console.log('Authenticated, session saved to', SESSION_DIR);
  });

  client.on('ready', () => {
    botState.status = 'ready';
    botState.qr = null;
    botState.me = client.info && client.info.wid ? client.info.wid.user : null;
    console.log('WhatsApp ready as', botState.me);
    startPoller(client);
  });

  client.on('disconnected', (reason) => {
    botState.status = 'disconnected';
    botState.lastEvent = new Date().toISOString();
    console.error('WhatsApp disconnected:', reason);
    // Railway restarts the process; LocalAuth restores the session from the volume.
    process.exit(1);
  });

  client.on('message', async (msg) => {
    if (msg.from.endsWith('@g.us')) return; // ignore groups
    try {
      const reply = await handleMessage(msg);
      if (reply) await msg.reply(reply);
    } catch (err) {
      console.error('handler error:', err.message);
      try {
        await msg.reply('⚠️ Technical issue — please try again in a few minutes.');
      } catch (_) { /* ignore */ }
    }
  });

  return client;
}

module.exports = { createClient, botState };
