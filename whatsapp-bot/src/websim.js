// Web chat demo of the Aitbaar applicant flow.
//
// Runs the REAL conversation state machine (src/flow.js) against the REAL
// backend — but over a web page instead of WhatsApp. No whatsapp-web.js, no
// Chromium, no Meta ban risk, no memory crashes. Every application created
// here is a real application that appears in the live officer dashboard.
//
// Run:  node src/websim.js   (set BACKEND_API_URL to your deployed backend)
// Or:   npm run sim

require('dotenv').config();

const express = require('express');
const { handleMessage } = require('./flow');

const app = express();
app.use(express.json({ limit: '12mb' }));

const PORT = process.env.PORT || 8002;

// A tiny valid JPEG — stands in for a photographed document. The point of the
// demo is the applicant JOURNEY + a real application landing in the dashboard;
// real photo extraction is the WhatsApp/production path.
const DOC_JPEG_B64 =
  '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRof' +
  'Hh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAAB' +
  'AAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AVN//2Q==';

function makeMsg(phone, body, hasMedia) {
  return {
    from: `${phone}@c.us`,
    body: body || '',
    hasMedia: !!hasMedia,
    reply: async () => {},
    downloadMedia: hasMedia
      ? async () => ({ data: DOC_JPEG_B64, mimetype: 'image/jpeg', filename: 'document.jpg' })
      : undefined,
  };
}

app.post('/api/message', async (req, res) => {
  try {
    const { phone, text } = req.body;
    const reply = await handleMessage(makeMsg(phone, text, false));
    res.json({ reply });
  } catch (err) {
    console.error('sim message error:', err.message);
    res.status(500).json({ reply: '⚠️ Backend error — is BACKEND_API_URL reachable?' });
  }
});

app.post('/api/upload', async (req, res) => {
  try {
    const { phone } = req.body;
    const reply = await handleMessage(makeMsg(phone, '', true));
    res.json({ reply });
  } catch (err) {
    console.error('sim upload error:', err.message);
    res.status(500).json({ reply: '⚠️ Backend error — is BACKEND_API_URL reachable?' });
  }
});

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'aitbaar-websim' }));

app.get('/', (_req, res) => res.type('html').send(PAGE));

app.listen(PORT, () => {
  console.log(`Aitbaar web chat demo on :${PORT}`);
  console.log(`Backend: ${process.env.BACKEND_API_URL || 'http://localhost:8000'}`);
});

const PAGE = `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Aitbaar — Apply on WhatsApp</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, "Segoe UI", Roboto, sans-serif; }
  body { background: #0b141a; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 16px; }
  .phone { width: 100%; max-width: 420px; height: 88vh; max-height: 780px; display: flex; flex-direction: column;
           border-radius: 20px; overflow: hidden; box-shadow: 0 12px 48px rgba(0,0,0,.5); }
  .top { background: #075e54; color: #fff; padding: 14px 16px; display: flex; align-items: center; gap: 12px; }
  .avatar { width: 40px; height: 40px; border-radius: 50%; background: #25d366; display: flex; align-items: center;
            justify-content: center; font-weight: 700; font-size: 18px; }
  .top .name { font-weight: 600; font-size: 16px; } .top .sub { font-size: 12px; opacity: .8; }
  .chat { flex: 1; overflow-y: auto; padding: 16px 12px; background: #0b141a;
          background-image: radial-gradient(rgba(255,255,255,.03) 1px, transparent 0); background-size: 22px 22px; }
  .row { display: flex; margin-bottom: 8px; } .row.me { justify-content: flex-end; }
  .bubble { max-width: 78%; padding: 8px 12px; border-radius: 10px; font-size: 14.5px; line-height: 1.5;
            white-space: pre-wrap; word-wrap: break-word; color: #e9edef; }
  .bot .bubble { background: #202c33; border-top-left-radius: 2px; }
  .me .bubble { background: #005c4b; border-top-right-radius: 2px; }
  .bubble b { font-weight: 700; } .bubble .doc { display: flex; align-items: center; gap: 8px; }
  .bar { background: #202c33; padding: 10px 12px; display: flex; gap: 8px; align-items: center; }
  .bar input { flex: 1; background: #2a3942; border: none; border-radius: 20px; padding: 11px 16px;
               color: #e9edef; font-size: 15px; outline: none; }
  .bar button { background: #00a884; border: none; color: #fff; width: 44px; height: 44px; border-radius: 50%;
                font-size: 18px; cursor: pointer; flex-shrink: 0; }
  .bar .attach { background: #2a3942; font-size: 20px; }
  .hint { text-align: center; color: #667781; font-size: 12px; padding: 6px; }
  .typing { color: #8696a0; font-style: italic; font-size: 13px; padding: 4px 12px; }
</style></head><body>
<div class="phone">
  <div class="top">
    <div class="avatar">A</div>
    <div><div class="name">Aitbaar (اعتبار)</div><div class="sub">SME Loan Assistant · online</div></div>
  </div>
  <div class="chat" id="chat"></div>
  <div class="hint" id="hint">Type <b>loan</b> to start · the 📎 button sends a document</div>
  <div class="bar">
    <button class="attach" id="attach" title="Send a document">📎</button>
    <input id="input" placeholder="Type a message" autocomplete="off">
    <button id="send">➤</button>
  </div>
</div>
<script>
  const phone = '92' + Math.floor(300000000 + Math.random() * 99999999);
  const chat = document.getElementById('chat');
  const input = document.getElementById('input');

  function esc(s){ return s.replace(/&/g,'&amp;').replace(/</g,'&lt;'); }
  function fmt(s){ return esc(s).replace(/\\*(.+?)\\*/g,'<b>$1</b>'); }
  function add(text, who, isDoc){
    const row = document.createElement('div'); row.className = 'row ' + who;
    const b = document.createElement('div'); b.className = 'bubble';
    b.innerHTML = isDoc ? '<span class="doc">📄 Document sent</span>' : fmt(text);
    row.appendChild(b); chat.appendChild(row); chat.scrollTop = chat.scrollHeight;
  }
  function typing(on){
    let t = document.getElementById('t');
    if(on && !t){ t=document.createElement('div'); t.id='t'; t.className='typing'; t.textContent='Aitbaar is typing…'; chat.appendChild(t); chat.scrollTop=chat.scrollHeight; }
    if(!on && t) t.remove();
  }
  async function call(path, body){
    typing(true);
    const r = await fetch(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    const j = await r.json(); typing(false);
    if(j.reply) add(j.reply, 'bot');
  }
  async function sendText(){
    const text = input.value.trim(); if(!text) return; input.value='';
    add(text,'me'); await call('/api/message',{phone,text});
  }
  document.getElementById('send').onclick = sendText;
  input.addEventListener('keydown', e => { if(e.key==='Enter') sendText(); });
  document.getElementById('attach').onclick = async () => { add('','me',true); await call('/api/upload',{phone}); };
  // Auto-start the conversation
  call('/api/message',{phone,text:'loan'});
</script>
</body></html>`;
