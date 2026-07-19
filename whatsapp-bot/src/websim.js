// Web chat demo of the Aitbaar applicant flow.
//
// Runs the REAL conversation state machine (src/flow.js) against the REAL
// backend, and sends the REAL specimen documents — so with OPENROUTER_API_KEY
// set on the backend, genuine Gemini vision extraction runs on them. No
// whatsapp-web.js, no Chromium, no Meta ban risk, no memory crashes.
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
    res.status(500).json({ reply: '⚠️ Backend error — is BACKEND_API_URL reachable?' });
  }
});

app.post('/api/upload', async (req, res) => {
  try {
    const { phone } = req.body;
    const n = uploadCount.get(phone) || 0;
    const b64 = DOC_B64[n] || DOC_B64[n % DOC_B64.length] || TINY_JPEG;
    const name = (DOC_SEQUENCE[n] || DOC_SEQUENCE[0]).name;
    uploadCount.set(phone, n + 1);
    const media = { data: b64 || TINY_JPEG, mimetype: 'image/png', filename: name };
    const reply = await handleMessage(makeMsg(phone, '', media));
    res.json({ reply, doc: name });
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
<title>WhatsApp</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0;-webkit-font-smoothing:antialiased;
    font-family:"Helvetica Neue",Helvetica,-apple-system,"Segoe UI",Roboto,sans-serif;}
  body{background:#111b21;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:0;}
  .app{width:100%;max-width:430px;height:100vh;max-height:920px;display:flex;flex-direction:column;position:relative;}
  /* header */
  .hd{background:#008069;color:#fff;display:flex;align-items:center;gap:10px;padding:10px 10px 10px 6px;flex-shrink:0;}
  .back{font-size:24px;line-height:1;padding:0 4px;opacity:.95;}
  .pic{width:40px;height:40px;border-radius:50%;background:#c9d6db;color:#4a6b74;display:flex;align-items:center;
       justify-content:center;font-weight:700;font-size:17px;overflow:hidden;}
  .who{flex:1;line-height:1.25;} .who .n{font-size:16.5px;font-weight:600;} .who .s{font-size:12.5px;opacity:.85;}
  .hicons{display:flex;gap:20px;font-size:19px;padding-right:8px;opacity:.95;}
  /* chat */
  .chat{flex:1;overflow-y:auto;padding:12px 8px 8px;
    background-color:#efeae2;
    background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60'%3E%3Cg fill='%23d9d0c7' fill-opacity='0.35'%3E%3Ccircle cx='10' cy='10' r='1.5'/%3E%3Ccircle cx='40' cy='25' r='1.5'/%3E%3Ccircle cx='20' cy='45' r='1.5'/%3E%3C/g%3E%3C/svg%3E");}
  .day{display:flex;justify-content:center;margin:8px 0 12px;}
  .day span{background:#ffffff;color:#54656f;font-size:12px;padding:5px 12px;border-radius:8px;box-shadow:0 1px .5px rgba(0,0,0,.1);}
  .row{display:flex;margin-bottom:3px;padding:0 4px;} .row.me{justify-content:flex-end;}
  .b{position:relative;max-width:80%;padding:6px 8px 8px 9px;border-radius:8px;font-size:14.4px;line-height:1.32;
     color:#111b21;white-space:pre-wrap;word-wrap:break-word;box-shadow:0 1px .5px rgba(0,0,0,.13);}
  .bot .b{background:#fff;border-top-left-radius:0;}
  .me .b{background:#d9fdd3;border-top-right-radius:0;}
  .bot .b::before{content:"";position:absolute;top:0;left:-8px;width:8px;height:13px;background:#fff;
     clip-path:polygon(100% 0,0 0,100% 100%);}
  .me .b::before{content:"";position:absolute;top:0;right:-8px;width:8px;height:13px;background:#d9fdd3;
     clip-path:polygon(0 0,100% 0,0 100%);}
  .b .t{float:right;font-size:11px;color:#667781;margin:6px 0 -2px 10px;line-height:1;}
  .b .t .tick{color:#53bdeb;font-size:12px;}
  .b b{font-weight:600;}
  .doc{display:flex;align-items:center;gap:8px;background:rgba(0,0,0,.04);border-radius:6px;padding:8px 10px;margin:-2px 0;}
  .doc .ic{width:34px;height:34px;border-radius:6px;background:#f0483e;color:#fff;display:flex;align-items:center;
     justify-content:center;font-size:15px;font-weight:700;}
  .typing{padding:2px 12px;color:#667781;font-size:13px;font-style:italic;}
  /* input bar */
  .bar{background:#f0f2f5;padding:7px 8px;display:flex;align-items:center;gap:7px;flex-shrink:0;}
  .bar .ic{font-size:22px;color:#54656f;padding:0 3px;}
  .bar .field{flex:1;background:#fff;border-radius:22px;display:flex;align-items:center;padding:9px 14px;gap:10px;}
  .bar input{flex:1;border:none;outline:none;font-size:15.5px;background:transparent;color:#111b21;}
  .bar .go{width:44px;height:44px;border-radius:50%;background:#00a884;color:#fff;border:none;font-size:19px;
     cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
</style></head><body>
<div class="app">
  <div class="hd">
    <div class="back">‹</div>
    <div class="pic">A</div>
    <div class="who"><div class="n">Aitbaar (اعتبار)</div><div class="s" id="pres">online</div></div>
    <div class="hicons"><span>📹</span><span>📞</span><span>⋮</span></div>
  </div>
  <div class="chat" id="chat"><div class="day"><span>TODAY</span></div></div>
  <div class="bar">
    <span class="ic">😊</span>
    <div class="field">
      <input id="input" placeholder="Message" autocomplete="off">
      <span class="ic" id="attach" title="Send a document" style="cursor:pointer">📎</span>
      <span class="ic">📷</span>
    </div>
    <button class="go" id="go">➤</button>
  </div>
</div>
<script>
  const phone = '92' + Math.floor(300000000 + Math.random()*99999999);
  const chat = document.getElementById('chat');
  const input = document.getElementById('input');
  const pres = document.getElementById('pres');
  const now = () => { const d=new Date(); let h=d.getHours(),m=d.getMinutes(); const ap=h>=12?'pm':'am';
    h=h%12||12; return h+':'+(m<10?'0':'')+m+' '+ap; };
  function esc(s){return s.replace(/&/g,'&amp;').replace(/</g,'&lt;');}
  function fmt(s){return esc(s).replace(/\\*(.+?)\\*/g,'<b>$1</b>');}
  function add(text,who,isDoc){
    const row=document.createElement('div'); row.className='row '+who;
    const b=document.createElement('div'); b.className='b';
    const tick = who==='me' ? '<span class="tick">✓✓</span>' : '';
    const inner = isDoc
      ? '<div class="doc"><div class="ic">PDF</div><div><div style="font-weight:600;font-size:13.5px">'+isDoc+'</div><div style="font-size:12px;color:#667781">Document · 1 page</div></div></div>'
      : fmt(text);
    b.innerHTML = inner + '<span class="t">'+now()+' '+tick+'</span>';
    row.appendChild(b); chat.appendChild(row); chat.scrollTop=chat.scrollHeight;
  }
  function typing(on){
    pres.textContent = on ? 'typing…' : 'online';
    let t=document.getElementById('tp');
    if(on&&!t){t=document.createElement('div');t.id='tp';t.className='row bot';
      t.innerHTML='<div class="b" style="padding:8px 12px">•••</div>';chat.appendChild(t);chat.scrollTop=chat.scrollHeight;}
    if(!on&&t)t.remove();
  }
  async function call(path,body){
    typing(true);
    try{
      const r=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
      const j=await r.json(); await new Promise(x=>setTimeout(x,350)); typing(false);
      if(j.reply) add(j.reply,'bot');
    }catch(e){ typing(false); add('⚠️ Connection error','bot'); }
  }
  async function sendText(){
    const text=input.value.trim(); if(!text)return; input.value='';
    add(text,'me'); await call('/api/message',{phone,text});
  }
  document.getElementById('go').onclick=sendText;
  input.addEventListener('keydown',e=>{if(e.key==='Enter')sendText();});
  const DOCS=['CNIC (front)','Bank Statement 6M','Electricity Bill'];
  let dc=0;
  document.getElementById('attach').onclick=async()=>{
    add('','me',DOCS[dc]||'Document'); dc++; await call('/api/upload',{phone});
  };
  setTimeout(()=>call('/api/message',{phone,text:'loan'}),400);
</script>
</body></html>`;
