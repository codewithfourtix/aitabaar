// Web chat demo of the Aitbaar applicant flow.
//
// Runs the REAL conversation state machine (src/flow.js) against the REAL
// backend, and can send the REAL specimen documents — so with
// OPENROUTER_API_KEY set on the backend, genuine Gemini vision extraction runs
// on them. No whatsapp-web.js, no Chromium, no Meta ban risk, no memory crashes.
//
// The UI is a branded stand-in for the WhatsApp Business API thread (see root
// README): enough of WhatsApp's visual grammar to read as a real thread, in
// Aitbaar's colours, inside a phone frame so it reads as a phone screen on a
// projector. No decorative emoji anywhere — icons are lucide SVGs, the same
// set the dashboard uses via lucide-react.
//
// Run:  node src/websim.js   (set BACKEND_API_URL to your deployed backend)
// Or:   npm run sim

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const express = require('express');
const { handleMessage } = require('./flow');

const app = express();
app.use(express.json({ limit: '12mb' }));

const PORT = process.env.PORT || 8002;

// Real specimen documents, sent in the order the flow asks for them
// (CNIC -> bank statement -> utility bill). All name "Muhammad Imran", so
// cross-document verification passes on a clean file.
const ASSETS = path.join(__dirname, '..', 'assets');
const DOC_SEQUENCE = [
  { file: 'cnic_specimen.png', name: 'cnic.png' },
  { file: 'bank_statement_specimen.png', name: 'bank_statement.png' },
  { file: 'utility_bill_specimen.png', name: 'utility_bill.png' },
];
const DOC_B64 = DOC_SEQUENCE.map((d) => {
  try {
    return fs.readFileSync(path.join(ASSETS, d.file)).toString('base64');
  } catch {
    return null; // asset missing — fall back to a tiny image so the flow still runs
  }
});
const TINY_JPEG =
  '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRof' +
  'Hh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAAB' +
  'AAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AVN//2Q==';

// Aitbaar icon mark — header avatar and the chat watermark. Inlined as a data
// URI so the page stays a single self-contained response.
const MARK_B64 = (() => {
  try {
    return fs.readFileSync(path.join(__dirname, '..', '..', 'docs', 'assets', 'aitbaar-mark.png')).toString('base64');
  } catch {
    return null;
  }
})();
const MARK_URI = MARK_B64 ? `data:image/png;base64,${MARK_B64}` : '';

const uploadCount = new Map(); // phone -> how many docs sent so far

function makeMsg(phone, body, media) {
  return {
    from: `${phone}@c.us`,
    body: body || '',
    hasMedia: !!media,
    reply: async () => {},
    downloadMedia: media ? async () => media : undefined,
  };
}

app.post('/api/message', async (req, res) => {
  try {
    const { phone, text } = req.body;
    const reply = await handleMessage(makeMsg(phone, text, null));
    res.json({ reply });
  } catch (err) {
    console.error('sim message error:', err.message);
    res.status(500).json({ error: 'backend_unreachable' });
  }
});

app.post('/api/upload', async (req, res) => {
  try {
    const { phone, data, mimetype, filename } = req.body;
    let media;
    if (data) {
      // Real file uploaded from the browser (base64)
      media = { data, mimetype: mimetype || 'image/jpeg', filename: filename || 'document.jpg' };
    } else {
      // No file attached — fall back to the next specimen document
      const n = uploadCount.get(phone) || 0;
      const b64 = DOC_B64[n] || DOC_B64[n % DOC_B64.length] || TINY_JPEG;
      const name = (DOC_SEQUENCE[n] || DOC_SEQUENCE[0]).name;
      uploadCount.set(phone, n + 1);
      media = { data: b64 || TINY_JPEG, mimetype: 'image/png', filename: name };
    }
    const reply = await handleMessage(makeMsg(phone, '', media));
    res.json({ reply, doc: media.filename });
  } catch (err) {
    console.error('sim upload error:', err.message);
    res.status(500).json({ error: 'backend_unreachable' });
  }
});

// Clearing the browser session must also reset the specimen cursor, otherwise
// a fresh thread starts sending the bank statement where the CNIC belongs.
app.post('/api/reset', (req, res) => {
  if (req.body && req.body.phone) uploadCount.delete(req.body.phone);
  res.json({ ok: true });
});

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'aitbaar-websim' }));
app.get('/', (_req, res) => res.type('html').send(PAGE));

app.listen(PORT, () => {
  console.log(`Aitbaar web chat demo on :${PORT}`);
  console.log(`Backend: ${process.env.BACKEND_API_URL || 'http://localhost:8000'}`);
  if (!MARK_B64) console.warn('docs/assets/aitbaar-mark.png not found — header falls back to a monogram');
});

// lucide icon paths (github.com/lucide-icons/lucide, ISC) — the dashboard
// renders the same set through lucide-react; inlining the paths keeps this
// page dependency-free and offline.
const ICONS = {
  arrowLeft: '<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>',
  video: '<path d="m22 8-6 4 6 4V8Z"/><rect width="14" height="12" x="2" y="6" rx="2" ry="2"/>',
  phone:
    '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>',
  moreVertical: '<circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/>',
  paperclip:
    '<path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>',
  camera:
    '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>',
  send: '<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
  fileText:
    '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/>',
  rotateCw:
    '<path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/>',
};

function icon(name, size = 22) {
  return (
    `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" ` +
    `stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`
  );
}

const AVATAR = MARK_URI
  ? `<img src="${MARK_URI}" alt="">`
  : '<span>A</span>';

const WATERMARK = MARK_URI ? `background-image:url("${MARK_URI}");` : '';

const PAGE = `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Aitbaar</title>
<link rel="icon" href="${MARK_URI || 'data:,'}">
<meta name="theme-color" content="#1B2A4A">
<style>
  :root{
    --navy:#1B2A4A; --navy-dk:#142038; --gold:#C9A227;
    --paper:#ECE7DF; --bubble-me:#E8EDF6; --ink:#111b21; --muted:#667781;
  }
  *{box-sizing:border-box;margin:0;padding:0;-webkit-font-smoothing:antialiased;
    font-family:"Helvetica Neue",Helvetica,-apple-system,"Segoe UI",Roboto,sans-serif;}
  body{background:#0b1220;display:flex;align-items:center;justify-content:center;
    min-height:100vh;padding:24px 12px;}

  /* ── phone frame ─────────────────────────────────────── */
  .frame{position:relative;padding:13px;background:linear-gradient(160deg,#2a2d35,#0d0e12 55%);
    border-radius:46px;box-shadow:0 30px 70px rgba(0,0,0,.6),0 0 0 1px rgba(255,255,255,.06) inset;}
  .side{position:absolute;background:#23252b;border-radius:3px;}
  .side.vu{left:-3px;top:132px;width:3px;height:56px;}
  .side.vd{left:-3px;top:200px;width:3px;height:56px;}
  .side.pw{right:-3px;top:160px;width:3px;height:84px;}
  .screen{position:relative;width:400px;height:836px;max-height:calc(100vh - 96px);
    border-radius:34px;overflow:hidden;display:flex;flex-direction:column;background:var(--paper);}
  .notch{position:absolute;top:0;left:50%;transform:translateX(-50%);width:124px;height:26px;
    background:#0d0e12;border-radius:0 0 15px 15px;z-index:30;}
  .home{position:absolute;bottom:7px;left:50%;transform:translateX(-50%);width:128px;height:5px;
    border-radius:3px;background:rgba(0,0,0,.28);z-index:30;pointer-events:none;}

  /* ── header ──────────────────────────────────────────── */
  .hd{background:var(--navy);color:#fff;display:flex;align-items:center;gap:9px;
    padding:30px 4px 10px 2px;flex-shrink:0;z-index:20;}
  .pic{width:38px;height:38px;border-radius:50%;background:#fff;display:flex;align-items:center;
    justify-content:center;font-weight:700;font-size:16px;color:var(--navy);overflow:hidden;flex-shrink:0;}
  .pic img{width:100%;height:100%;object-fit:cover;}
  .who{flex:1;line-height:1.25;min-width:0;}
  .who .n{font-size:16px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .who .s{font-size:12.5px;opacity:.85;}
  .who .s.busy{color:var(--gold);opacity:1;}

  /* every icon is a real button: 40px tap target, labelled, focusable */
  .ib{width:40px;height:40px;display:inline-flex;align-items:center;justify-content:center;
    background:none;border:none;color:inherit;cursor:pointer;border-radius:50%;flex-shrink:0;}
  .ib:hover{background:rgba(255,255,255,.12);}
  .ib:focus-visible{outline:2px solid var(--gold);outline-offset:-2px;}
  .ib:disabled{opacity:.4;cursor:not-allowed;}
  .bar .ib{color:#54656f;}
  .bar .ib:hover{background:rgba(0,0,0,.06);}

  /* ── chat ────────────────────────────────────────────── */
  .chatwrap{flex:1;position:relative;overflow:hidden;background:var(--paper);}
  .chatwrap::before{content:"";position:absolute;inset:0;${WATERMARK}
    background-repeat:repeat;background-size:118px;opacity:.03;pointer-events:none;}
  .chat{position:absolute;inset:0;overflow-y:auto;padding:12px 8px 10px;z-index:1;}
  .day{display:flex;justify-content:center;margin:6px 0 12px;}
  .day span{background:rgba(255,255,255,.92);color:#54656f;font-size:11.5px;letter-spacing:.4px;
    padding:5px 12px;border-radius:8px;box-shadow:0 1px .5px rgba(0,0,0,.1);}
  .row{display:flex;margin-bottom:3px;padding:0 4px;} .row.me{justify-content:flex-end;}
  .b{position:relative;max-width:80%;padding:6px 8px 8px 9px;border-radius:8px;font-size:14.4px;
    line-height:1.36;color:var(--ink);white-space:pre-wrap;word-wrap:break-word;
    box-shadow:0 1px .5px rgba(0,0,0,.13);}
  .bot .b{background:#fff;border-top-left-radius:0;}
  .me .b{background:var(--bubble-me);border-top-right-radius:0;}
  .bot .b::before{content:"";position:absolute;top:0;left:-8px;width:8px;height:13px;background:#fff;
    clip-path:polygon(100% 0,0 0,100% 100%);}
  .me .b::before{content:"";position:absolute;top:0;right:-8px;width:8px;height:13px;
    background:var(--bubble-me);clip-path:polygon(0 0,100% 0,0 100%);}
  .b .t{float:right;font-size:11px;color:var(--muted);margin:6px 0 -2px 10px;line-height:1;}
  .b .t .tick{color:var(--navy);font-size:11px;letter-spacing:-1px;}
  .b b{font-weight:600;}
  .doc{display:flex;align-items:center;gap:9px;background:rgba(27,42,74,.06);border-radius:6px;
    padding:8px 10px;margin:-2px 0;}
  .doc .ic{width:34px;height:34px;border-radius:6px;background:var(--navy);color:#fff;
    display:flex;align-items:center;justify-content:center;flex-shrink:0;}
  .doc .nm{font-weight:600;font-size:13.5px;word-break:break-all;}
  .doc .sub{font-size:12px;color:var(--muted);}
  /* pending / error states */
  .pend{display:flex;align-items:center;gap:8px;color:var(--muted);font-size:13.5px;font-style:italic;}
  .dots{display:inline-flex;gap:3px;}
  .dots i{width:5px;height:5px;border-radius:50%;background:#9aa5ab;animation:bl 1.2s infinite;}
  .dots i:nth-child(2){animation-delay:.2s} .dots i:nth-child(3){animation-delay:.4s}
  @keyframes bl{0%,60%,100%{opacity:.28}30%{opacity:1}}
  .err{border-left:3px solid #b3261e;}
  .retry{margin-top:7px;display:inline-flex;align-items:center;gap:6px;background:var(--navy);
    color:#fff;border:none;border-radius:16px;padding:7px 13px;font-size:13px;cursor:pointer;}
  .retry:hover{background:var(--navy-dk);}

  /* ── input bar ───────────────────────────────────────── */
  .bar{background:#F4F2EE;padding:7px 6px 18px;display:flex;align-items:center;gap:4px;
    flex-shrink:0;border-top:1px solid rgba(0,0,0,.06);}
  .field{flex:1;background:#fff;border-radius:22px;display:flex;align-items:center;
    padding:2px 4px 2px 14px;gap:2px;min-width:0;}
  .field input{flex:1;border:none;outline:none;font-size:15.5px;background:transparent;
    color:var(--ink);min-width:0;padding:9px 0;}
  .field input:disabled{color:#9aa5ab;}
  .go{width:44px;height:44px;border-radius:50%;background:var(--navy);color:#fff;border:none;
    cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
  .go:hover{background:var(--navy-dk);} .go:disabled{opacity:.45;cursor:not-allowed;}
  .go:focus-visible{outline:2px solid var(--gold);outline-offset:2px;}
  .go svg{margin-left:-2px;}

  /* ── menu + toast ────────────────────────────────────── */
  .menu{position:absolute;top:62px;right:10px;background:#fff;border-radius:8px;z-index:40;
    box-shadow:0 6px 24px rgba(0,0,0,.24);overflow:hidden;min-width:184px;display:none;}
  .menu.open{display:block;}
  .menu button{display:block;width:100%;text-align:left;background:none;border:none;
    padding:13px 16px;font-size:14.5px;color:var(--ink);cursor:pointer;}
  .menu button:hover{background:#f2f2f2;}
  .toast{position:absolute;bottom:86px;left:50%;transform:translateX(-50%) translateY(8px);
    background:rgba(17,27,33,.93);color:#fff;font-size:13px;padding:9px 15px;border-radius:18px;
    z-index:40;opacity:0;transition:opacity .18s,transform .18s;pointer-events:none;
    max-width:86%;text-align:center;}
  .toast.show{opacity:1;transform:translateX(-50%) translateY(0);}

  @media (max-width:520px){
    body{padding:0;}
    .frame{padding:0;border-radius:0;box-shadow:none;background:none;}
    .screen{width:100vw;height:100vh;max-height:100vh;border-radius:0;}
    .notch,.home,.side{display:none;} .hd{padding-top:10px;}
    .bar{padding-bottom:8px;}
  }
</style></head><body>
<div class="frame">
  <span class="side vu"></span><span class="side vd"></span><span class="side pw"></span>
  <div class="screen">
    <div class="notch"></div>
    <header class="hd">
      <button class="ib" id="back" aria-label="Back">${icon('arrowLeft', 22)}</button>
      <div class="pic">${AVATAR}</div>
      <div class="who">
        <div class="n">Aitbaar (اعتبار)</div>
        <div class="s" id="pres">online</div>
      </div>
      <button class="ib" id="vcall" aria-label="Video call">${icon('video', 21)}</button>
      <button class="ib" id="acall" aria-label="Voice call">${icon('phone', 20)}</button>
      <button class="ib" id="more" aria-label="More options" aria-haspopup="true" aria-expanded="false">${icon('moreVertical', 21)}</button>
    </header>

    <div class="menu" id="menu" role="menu">
      <button id="newsession" role="menuitem">Start a new session</button>
    </div>

    <div class="chatwrap">
      <div class="chat" id="chat" role="log" aria-live="polite" aria-label="Conversation">
        <div class="day"><span>TODAY</span></div>
      </div>
    </div>

    <div class="toast" id="toast" role="status"></div>

    <div class="bar">
      <div class="field">
        <label for="input" class="sr" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)">Message</label>
        <input id="input" placeholder="Message" autocomplete="off">
        <button class="ib" id="attach" aria-label="Attach a document from this device">${icon('paperclip', 21)}</button>
        <button class="ib" id="specimen" aria-label="Send the next specimen document">${icon('camera', 21)}</button>
        <input type="file" id="file" accept="image/*,application/pdf" style="display:none" tabindex="-1" aria-hidden="true">
      </div>
      <button class="go" id="go" aria-label="Send message">${icon('send', 21)}</button>
    </div>
    <div class="home"></div>
  </div>
</div>
<script>
  var ICON_RETRY = '${icon('rotateCw', 15)}';
  var ICON_DOC = '${icon('fileText', 18)}';

  var chat = document.getElementById('chat');
  var input = document.getElementById('input');
  var pres = document.getElementById('pres');
  var goBtn = document.getElementById('go');
  var attachBtn = document.getElementById('attach');
  var specimenBtn = document.getElementById('specimen');
  var fileInput = document.getElementById('file');
  var menu = document.getElementById('menu');
  var moreBtn = document.getElementById('more');
  var toastEl = document.getElementById('toast');

  // ── session persistence (spec §3): a refresh must resume the same
  // applicant, not silently restart under a new identity.
  var PHONE_KEY = 'aitbaar.sim.phone';
  var LOG_KEY = 'aitbaar.sim.log';
  var phone = localStorage.getItem(PHONE_KEY);
  var resuming = !!phone;
  if (!phone) {
    phone = '92' + Math.floor(300000000 + Math.random() * 99999999);
    localStorage.setItem(PHONE_KEY, phone);
  }
  var log = [];
  try { log = JSON.parse(localStorage.getItem(LOG_KEY) || '[]'); } catch (e) { log = []; }
  function persist() {
    try { localStorage.setItem(LOG_KEY, JSON.stringify(log.slice(-200))); } catch (e) {}
  }

  function now() {
    var d = new Date(), h = d.getHours(), m = d.getMinutes(), ap = h >= 12 ? 'pm' : 'am';
    h = h % 12 || 12;
    return h + ':' + (m < 10 ? '0' : '') + m + ' ' + ap;
  }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;'); }
  function fmt(s) { return esc(s).replace(/\\*(.+?)\\*/g, '<b>$1</b>'); }

  function render(entry) {
    var row = document.createElement('div');
    row.className = 'row ' + entry.who;
    var b = document.createElement('div');
    b.className = 'b';
    var tick = entry.who === 'me' ? ' <span class="tick">\\u2713\\u2713</span>' : '';
    var inner = entry.doc
      ? '<div class="doc"><div class="ic">' + ICON_DOC + '</div><div><div class="nm">' +
        esc(entry.doc) + '</div><div class="sub">Document</div></div></div>'
      : fmt(entry.text);
    b.innerHTML = inner + '<span class="t">' + (entry.at || now()) + tick + '</span>';
    row.appendChild(b);
    chat.appendChild(row);
    chat.scrollTop = chat.scrollHeight;
  }
  function add(text, who, doc) {
    var entry = { text: text, who: who, doc: doc || null, at: now() };
    log.push(entry); persist(); render(entry);
  }

  // ── busy state (spec §3): nothing may be sent while a reply is in
  // flight, otherwise bubbles land out of order.
  var busy = false;
  function setBusy(on, label) {
    busy = on;
    input.disabled = on; goBtn.disabled = on; attachBtn.disabled = on; specimenBtn.disabled = on;
    pres.textContent = on ? (label || 'typing…') : 'online';
    pres.className = on ? 's busy' : 's';
    var t = document.getElementById('tp');
    if (on && !t) {
      t = document.createElement('div'); t.id = 'tp'; t.className = 'row bot';
      t.innerHTML = '<div class="b"><span class="pend">' +
        (label ? esc(label) : '') +
        '<span class="dots"><i></i><i></i><i></i></span></span></div>';
      chat.appendChild(t); chat.scrollTop = chat.scrollHeight;
    }
    if (!on && t) t.remove();
    if (!on) input.focus();
  }

  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { toastEl.classList.remove('show'); }, 2600);
  }

  // ── error recovery (spec §3): a failed call renders a retry that
  // replays the exact same request instead of making the user retype.
  function showError(message, retryFn) {
    var row = document.createElement('div');
    row.className = 'row bot';
    var b = document.createElement('div');
    b.className = 'b err';
    b.innerHTML = '<b>Connection problem.</b>\\n' + esc(message) +
      '<span class="t">' + now() + '</span>';
    var btn = document.createElement('button');
    btn.className = 'retry';
    btn.innerHTML = ICON_RETRY + ' Retry';
    btn.onclick = function () { row.remove(); retryFn(); };
    b.appendChild(document.createElement('br'));
    b.appendChild(btn);
    row.appendChild(b); chat.appendChild(row); chat.scrollTop = chat.scrollHeight;
  }

  async function call(pathname, body, label) {
    setBusy(true, label);
    try {
      var r = await fetch(pathname, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      var j = await r.json().catch(function () { return {}; });
      await new Promise(function (x) { setTimeout(x, 280); });
      setBusy(false);
      if (!r.ok || j.error) {
        showError('The bot could not reach the Aitbaar backend.', function () { call(pathname, body, label); });
        return;
      }
      if (j.reply) add(j.reply, 'bot');
    } catch (e) {
      setBusy(false);
      showError('Your browser could not reach the demo server.', function () { call(pathname, body, label); });
    }
  }

  async function sendText() {
    if (busy) return;
    var text = input.value.trim();
    if (!text) return;
    input.value = '';
    add(text, 'me');
    await call('/api/message', { phone: phone, text: text }, 'typing…');
  }

  goBtn.onclick = sendText;
  input.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !busy) sendText(); });

  var DOCS = ['CNIC (front)', 'Bank Statement 6M', 'Electricity Bill'];
  var dc = Number(localStorage.getItem('aitbaar.sim.dc') || 0);

  attachBtn.onclick = function () { if (!busy) fileInput.click(); };
  fileInput.onchange = async function () {
    var f = fileInput.files[0];
    fileInput.value = '';
    if (!f || busy) return;
    if (f.size > 20 * 1024 * 1024) { toast('That file is larger than 20 MB.'); return; }
    var b64 = await new Promise(function (res, rej) {
      var r = new FileReader();
      r.onload = function () { res(r.result.split(',')[1]); };
      r.onerror = rej; r.readAsDataURL(f);
    });
    add('', 'me', f.name);
    await call('/api/upload',
      { phone: phone, data: b64, mimetype: f.type || 'image/jpeg', filename: f.name },
      'Reviewing document…');
  };

  specimenBtn.onclick = async function () {
    if (busy) return;
    add('', 'me', DOCS[dc] || 'Document');
    dc++; localStorage.setItem('aitbaar.sim.dc', String(dc));
    await call('/api/upload', { phone: phone }, 'Reviewing document…');
  };

  // Header affordances. Calls are inert by design in a prototype, but they
  // say so rather than being silently dead.
  document.getElementById('vcall').onclick = function () { toast('Video calls are not available in this prototype.'); };
  document.getElementById('acall').onclick = function () { toast('Voice calls are not available in this prototype.'); };
  document.getElementById('back').onclick = function () { toast('This prototype opens directly on the Aitbaar thread.'); };

  moreBtn.onclick = function (e) {
    e.stopPropagation();
    var open = menu.classList.toggle('open');
    moreBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
  };
  document.addEventListener('click', function () {
    menu.classList.remove('open'); moreBtn.setAttribute('aria-expanded', 'false');
  });
  document.getElementById('newsession').onclick = async function () {
    try { await fetch('/api/reset', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: phone }) }); } catch (e) {}
    localStorage.removeItem(PHONE_KEY);
    localStorage.removeItem(LOG_KEY);
    localStorage.removeItem('aitbaar.sim.dc');
    location.reload();
  };

  // Restore the thread on refresh; only greet on a genuinely new session.
  if (resuming && log.length) {
    log.forEach(render);
    chat.scrollTop = chat.scrollHeight;
    input.focus();
  } else {
    log = []; persist();
    setTimeout(function () { call('/api/message', { phone: phone, text: 'loan' }, 'typing…'); }, 400);
  }
</script>
</body></html>`;
