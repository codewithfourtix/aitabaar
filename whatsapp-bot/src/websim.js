// Web chat demo of the Aitbaar applicant flow.
//
// Runs the REAL conversation state machine (src/flow.js) against the REAL
// backend, and can send the REAL specimen documents — so with
// OPENROUTER_API_KEY set on the backend, genuine Gemini vision extraction runs
// on them. No whatsapp-web.js, no Chromium, no Meta ban risk, no memory crashes.
//
// The page is a two-panel pitch surface: an Aitbaar explainer on the left,
// and on the right a phone running a deliberately faithful reproduction of a
// WhatsApp thread — status bar, green chrome, doodle wallpaper, read receipts.
// The point is to show judges exactly what this looks like once it rides the
// real WhatsApp Business API, which we have not integrated. Aitbaar shows up
// the way a real business account would: as the contact, not as a reskin.
//
// No decorative emoji anywhere in the copy — every icon is an inline lucide
// SVG, the same set the dashboard uses via lucide-react.
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

// Full logo lockup — used on the explainer panel.
const LOGO_B64 = (() => {
  try {
    return fs.readFileSync(path.join(__dirname, '..', '..', 'docs', 'assets', 'aitbaar-logo.png')).toString('base64');
  } catch {
    return null;
  }
})();
const LOGO_URI = LOGO_B64 ? `data:image/png;base64,${LOGO_B64}` : '';

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
  smile:
    '<circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" x2="9.01" y1="9" y2="9"/><line x1="15" x2="15.01" y1="9" y2="9"/>',
  mic:
    '<path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/>',
  checkCheck: '<path d="M18 6 7 17l-5-5"/><path d="m22 10-7.5 7.5L13 16"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/>',
  lock: '<rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
};

function icon(name, size = 22) {
  return (
    `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" ` +
    `stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`
  );
}

// iOS-style status bar glyphs — filled, not stroked, so they read correctly at
// 12px. These are what sell the "this is a phone screenshot" illusion.
const STATUS_ICONS = {
  signal:
    '<svg viewBox="0 0 20 12" width="18" height="11" fill="currentColor" aria-hidden="true">' +
    '<rect x="0" y="8" width="3.2" height="4" rx="1"/><rect x="5" y="5.6" width="3.2" height="6.4" rx="1"/>' +
    '<rect x="10" y="3" width="3.2" height="9" rx="1"/><rect x="15" y="0.4" width="3.2" height="11.6" rx="1"/></svg>',
  wifi:
    '<svg viewBox="0 0 18 13" width="17" height="12" fill="currentColor" aria-hidden="true">' +
    '<path d="M9 12.2 6.35 9.3a3.9 3.9 0 0 1 5.3 0Z"/>' +
    '<path d="M9 5.05c1.83 0 3.5.68 4.78 1.8l1.42-1.55A9.05 9.05 0 0 0 9 3a9.05 9.05 0 0 0-6.2 2.3L4.22 6.85A7.06 7.06 0 0 1 9 5.05Z"/></svg>',
  battery:
    '<svg viewBox="0 0 27 13" width="25" height="12" aria-hidden="true">' +
    '<rect x="0.6" y="0.6" width="22" height="11.8" rx="3.4" fill="none" stroke="currentColor" stroke-width="1.1" opacity=".45"/>' +
    '<rect x="2.2" y="2.2" width="16.5" height="8.6" rx="2.1" fill="currentColor"/>' +
    '<path d="M24.4 4.4a2.4 2.4 0 0 1 0 4.2Z" fill="currentColor" opacity=".5"/></svg>',
};

// WhatsApp's chat wallpaper is a dense doodle tile. This is a hand-built
// stand-in at the same scale and tone — it reads as the real thing at a
// glance without shipping Meta's artwork.
const DOODLE = encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="260" height="260" viewBox="0 0 260 260">' +
    '<g fill="none" stroke="#c4baa8" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" opacity="0.30">' +
    '<path d="M18 26h26a4 4 0 0 1 4 4v14a4 4 0 0 1-4 4H28l-6 6v-6h-4a4 4 0 0 1-4-4V30a4 4 0 0 1 4-4Z"/>' +
    '<circle cx="112" cy="34" r="10"/><path d="M112 28v6l4 3"/>' +
    '<path d="M176 22l7 14 15 2-11 11 3 15-14-8-14 8 3-15-11-11 15-2Z"/>' +
    '<path d="M226 40c0-6 9-6 9 0 0 5-9 9-9 14 0-5-9-9-9-14 0-6 9-6 9 0Z"/>' +
    '<rect x="24" y="94" width="30" height="22" rx="3"/><circle cx="39" cy="105" r="6"/><path d="M32 94l3-5h8l3 5"/>' +
    '<path d="M96 108h30M96 116h20M96 100h26"/>' +
    '<circle cx="176" cy="108" r="12"/><path d="M170 108h12M176 102v12"/>' +
    '<path d="M222 96l14 8-14 8Z"/>' +
    '<path d="M20 168c8-10 22-10 30 0M26 176c5-6 13-6 18 0"/><circle cx="35" cy="184" r="2"/>' +
    '<rect x="94" y="162" width="24" height="30" rx="4"/><path d="M100 168h12M100 176h12M100 184h7"/>' +
    '<path d="M164 190l10-26 10 26M168 182h12"/>' +
    '<circle cx="228" cy="176" r="11"/><path d="M223 176l4 4 7-8"/>' +
    '<path d="M30 226h24a4 4 0 0 1 0 8H30a4 4 0 0 1 0-8Z"/>' +
    '<path d="M104 222v20M96 230h16"/>' +
    '<circle cx="176" cy="232" r="9"/><path d="M176 226v6l4 2"/>' +
    '<path d="M216 224l8 6-8 6ZM236 224v12"/>' +
    '</g></svg>'
);
const WALLPAPER = `data:image/svg+xml,${DOODLE}`;

const AVATAR = MARK_URI ? `<img src="${MARK_URI}" alt="">` : '<span>A</span>';
const BRAND_LOCKUP = LOGO_URI
  ? `<img class="lockup" src="${LOGO_URI}" alt="Aitbaar (اعتبار)">`
  : '<div class="lockup-fallback">Aitbaar (اعتبار)</div>';

const PAGE = `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Aitbaar — SME loans on WhatsApp</title>
<link rel="icon" href="${MARK_URI || 'data:,'}">
<meta name="theme-color" content="#075E54">
<style>
  :root{
    /* WhatsApp chrome — deliberately faithful, this panel is the "after
       integration" preview */
    --wa-header:#008069; --wa-teal:#075E54; --wa-green:#25D366; --wa-send:#00a884;
    --wa-paper:#efeae2; --wa-in:#ffffff; --wa-out:#d9fdd3; --wa-tick:#53bdeb;
    --wa-bar:#f0f2f5; --ink:#111b21; --muted:#667781;
    --gold:#C9A227;
  }
  *{box-sizing:border-box;margin:0;padding:0;-webkit-font-smoothing:antialiased;}
  html,body{min-height:100%;}
  body{
    font-family:"Segoe UI",-apple-system,"Helvetica Neue",Helvetica,Roboto,sans-serif;
    background:radial-gradient(1100px 700px at 12% 8%, #12866f 0%, transparent 60%),
               linear-gradient(140deg,#054a41 0%,#075E54 42%,#0a7c63 100%);
    color:#fff;display:flex;align-items:center;justify-content:center;padding:44px 32px;
  }
  .stage{width:100%;max-width:1320px;display:grid;grid-template-columns:minmax(0,1fr) auto;
    gap:70px;align-items:center;}

  /* ── left: the pitch ─────────────────────────────────── */
  .pitch{max-width:640px;}
  .lockup{height:50px;width:auto;display:block;margin-bottom:20px;
    background:#fff;border-radius:11px;padding:8px 13px;}
  .lockup-fallback{font-size:26px;font-weight:700;margin-bottom:20px;}
  .eyebrow{display:inline-flex;align-items:center;gap:9px;font-size:12px;font-weight:600;
    letter-spacing:.13em;text-transform:uppercase;color:var(--gold);margin-bottom:13px;}
  .eyebrow::before{content:"";width:26px;height:2px;background:var(--gold);border-radius:2px;}
  h1{font-size:clamp(28px,3vw,40px);line-height:1.13;font-weight:700;letter-spacing:-.02em;
    margin-bottom:16px;}
  h1 em{font-style:normal;color:#a9f0c8;}
  .lede{font-size:16px;line-height:1.6;color:rgba(255,255,255,.9);max-width:60ch;margin-bottom:24px;}
  .lede b{color:#fff;font-weight:600;}

  .steps{list-style:none;display:grid;gap:14px;margin-bottom:24px;}
  .steps li{display:grid;grid-template-columns:34px 1fr;gap:15px;align-items:start;}
  .steps .n{width:34px;height:34px;border-radius:50%;background:rgba(255,255,255,.14);
    border:1px solid rgba(255,255,255,.22);display:flex;align-items:center;justify-content:center;
    font-size:14px;font-weight:700;color:#a9f0c8;}
  .steps h3{font-size:15.5px;font-weight:650;margin-bottom:4px;}
  .steps p{font-size:14.5px;line-height:1.56;color:rgba(255,255,255,.76);}

  .stats{display:grid;grid-template-columns:repeat(4,auto);gap:28px;justify-content:start;
    padding:17px 0 18px;border-top:1px solid rgba(255,255,255,.16);
    border-bottom:1px solid rgba(255,255,255,.16);margin-bottom:20px;}
  .stats .v{font-size:24px;font-weight:700;letter-spacing:-.01em;}
  .stats .k{font-size:12px;line-height:1.4;color:rgba(255,255,255,.66);margin-top:3px;max-width:15ch;}

  .note{display:flex;gap:12px;align-items:flex-start;background:rgba(0,0,0,.2);
    border:1px solid rgba(255,255,255,.14);border-radius:12px;padding:15px 17px;}
  .note svg{flex-shrink:0;color:#a9f0c8;margin-top:1px;}
  .note p{font-size:13.5px;line-height:1.58;color:rgba(255,255,255,.84);}
  .note b{color:#fff;}

  /* ── right: the phone ────────────────────────────────── */
  .device{display:flex;flex-direction:column;align-items:center;gap:16px;}
  .phone{position:relative;padding:11px;border-radius:54px;
    background:linear-gradient(155deg,#4a4d55 0%,#1c1e23 26%,#0b0c0f 62%,#33363d 100%);
    box-shadow:0 40px 90px rgba(0,0,0,.55),0 0 0 1px rgba(255,255,255,.07),
               inset 0 0 0 1px rgba(255,255,255,.05);}
  .phone::after{ /* screen glass sheen */
    content:"";position:absolute;inset:11px;border-radius:44px;pointer-events:none;z-index:60;
    background:linear-gradient(128deg,rgba(255,255,255,.14) 0%,rgba(255,255,255,.03) 22%,
               transparent 46%);}
  .side{position:absolute;background:linear-gradient(90deg,#2c2f36,#14161a);border-radius:2px;}
  .side.vu{left:-2.5px;top:158px;width:3px;height:58px;}
  .side.vd{left:-2.5px;top:226px;width:3px;height:58px;}
  .side.pw{right:-2.5px;top:190px;width:3px;height:88px;}
  .screen{position:relative;width:384px;height:822px;max-height:calc(100vh - 150px);
    border-radius:44px;overflow:hidden;display:flex;flex-direction:column;background:var(--wa-paper);}
  .island{position:absolute;top:11px;left:50%;transform:translateX(-50%);width:112px;height:31px;
    background:#000;border-radius:17px;z-index:40;}
  .home{position:absolute;bottom:7px;left:50%;transform:translateX(-50%);width:132px;height:5px;
    border-radius:3px;background:rgba(0,0,0,.32);z-index:40;pointer-events:none;}

  /* status bar */
  .statusbar{background:var(--wa-header);color:#fff;height:52px;flex-shrink:0;
    display:flex;align-items:flex-end;justify-content:space-between;padding:0 26px 5px;
    font-size:14.5px;font-weight:650;letter-spacing:.2px;z-index:30;}
  .statusbar .right{display:flex;align-items:center;gap:5px;}

  /* header */
  .hd{background:var(--wa-header);color:#fff;display:flex;align-items:center;gap:8px;
    padding:5px 3px 9px 2px;flex-shrink:0;z-index:30;}
  .pic{width:39px;height:39px;border-radius:50%;background:#fff;display:flex;align-items:center;
    justify-content:center;font-weight:700;font-size:16px;color:var(--wa-teal);overflow:hidden;flex-shrink:0;}
  .pic img{width:100%;height:100%;object-fit:cover;}
  .who{flex:1;line-height:1.24;min-width:0;padding-left:2px;}
  .who .n{font-size:16.5px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .who .s{font-size:12.5px;color:rgba(255,255,255,.82);}
  .who .s.busy{color:#c9f5dd;}

  .ib{width:40px;height:40px;display:inline-flex;align-items:center;justify-content:center;
    background:none;border:none;color:inherit;cursor:pointer;border-radius:50%;flex-shrink:0;}
  .ib:hover{background:rgba(255,255,255,.13);}
  .ib:focus-visible{outline:2px solid #fff;outline-offset:-3px;}
  .ib:disabled{opacity:.4;cursor:not-allowed;}
  .bar .ib{color:#8696a0;}
  .bar .ib:hover{background:rgba(0,0,0,.05);}
  .bar .ib:focus-visible{outline:2px solid var(--wa-send);}

  /* chat */
  .chatwrap{flex:1;position:relative;overflow:hidden;background:var(--wa-paper);}
  .chatwrap::before{content:"";position:absolute;inset:0;
    background-image:url("${WALLPAPER}");background-repeat:repeat;background-size:172px;
    pointer-events:none;}
  .chat{position:absolute;inset:0;overflow-y:auto;padding:11px 7px 10px;z-index:1;}
  .chat::-webkit-scrollbar{width:6px;}
  .chat::-webkit-scrollbar-thumb{background:rgba(0,0,0,.16);border-radius:3px;}
  .day{display:flex;justify-content:center;margin:5px 0 10px;}
  .day span{background:#e2f2e6;color:#54656f;font-size:11.5px;font-weight:500;letter-spacing:.3px;
    padding:5px 12px;border-radius:7px;box-shadow:0 1px .5px rgba(0,0,0,.1);}
  .sys{display:flex;justify-content:center;margin:0 0 12px;}
  .sys span{display:inline-flex;align-items:center;gap:6px;background:#fdf4c6;color:#5b5540;
    font-size:11.6px;line-height:1.42;padding:7px 12px;border-radius:7px;max-width:84%;
    text-align:center;box-shadow:0 1px .5px rgba(0,0,0,.1);}
  .sys svg{flex-shrink:0;opacity:.75;}
  .row{display:flex;margin-bottom:3px;padding:0 4px;} .row.me{justify-content:flex-end;}
  .b{position:relative;max-width:82%;padding:6px 8px 8px 9px;border-radius:8px;font-size:14.3px;
    line-height:1.37;color:var(--ink);white-space:pre-wrap;word-wrap:break-word;
    box-shadow:0 1px .5px rgba(0,0,0,.13);}
  .bot .b{background:var(--wa-in);border-top-left-radius:0;}
  .me .b{background:var(--wa-out);border-top-right-radius:0;}
  .bot .b::before{content:"";position:absolute;top:0;left:-8px;width:8px;height:13px;
    background:var(--wa-in);clip-path:polygon(100% 0,0 0,100% 100%);}
  .me .b::before{content:"";position:absolute;top:0;right:-8px;width:8px;height:13px;
    background:var(--wa-out);clip-path:polygon(0 0,100% 0,0 100%);}
  .b .t{float:right;font-size:11px;color:var(--muted);margin:7px 0 -3px 10px;line-height:1;
    display:inline-flex;align-items:center;gap:3px;}
  .b .t svg{color:var(--wa-tick);}
  .b b{font-weight:600;}
  .doc{display:flex;align-items:center;gap:9px;background:rgba(0,0,0,.045);border-radius:6px;
    padding:8px 10px;margin:-2px 0;}
  .doc .ic{width:34px;height:34px;border-radius:6px;background:#5a6b73;color:#fff;
    display:flex;align-items:center;justify-content:center;flex-shrink:0;}
  .doc .nm{font-weight:600;font-size:13.5px;word-break:break-all;}
  .doc .sub{font-size:12px;color:var(--muted);}
  .pend{display:flex;align-items:center;gap:8px;color:var(--muted);font-size:13.5px;font-style:italic;}
  .dots{display:inline-flex;gap:3px;}
  .dots i{width:5px;height:5px;border-radius:50%;background:#9aa5ab;animation:bl 1.2s infinite;}
  .dots i:nth-child(2){animation-delay:.2s} .dots i:nth-child(3){animation-delay:.4s}
  @keyframes bl{0%,60%,100%{opacity:.28}30%{opacity:1}}
  .err{border-left:3px solid #b3261e;}
  .retry{margin-top:7px;display:inline-flex;align-items:center;gap:6px;background:var(--wa-send);
    color:#fff;border:none;border-radius:16px;padding:7px 13px;font-size:13px;cursor:pointer;
    font-family:inherit;}
  .retry:hover{background:#019272;}

  /* input bar */
  .bar{background:var(--wa-bar);padding:6px 7px 19px;display:flex;align-items:flex-end;gap:5px;
    flex-shrink:0;}
  .field{flex:1;background:#fff;border-radius:24px;display:flex;align-items:center;
    padding:2px 3px 2px 3px;gap:1px;min-width:0;box-shadow:0 1px .5px rgba(0,0,0,.08);}
  .field input{flex:1;border:none;outline:none;font-size:15.5px;background:transparent;
    color:var(--ink);min-width:0;padding:10px 4px;font-family:inherit;}
  .field input::placeholder{color:#8696a0;}
  .field input:disabled{color:#a8b3b8;}
  .go{width:46px;height:46px;border-radius:50%;background:var(--wa-send);color:#fff;border:none;
    cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
  .go:hover{background:#019272;} .go:disabled{opacity:.5;cursor:not-allowed;}
  .go:focus-visible{outline:2px solid #fff;outline-offset:2px;}
  .go .s-send{margin-left:-2px;}

  /* menu + toast */
  .menu{position:absolute;top:96px;right:9px;background:#fff;border-radius:6px;z-index:50;
    box-shadow:0 5px 22px rgba(0,0,0,.28);overflow:hidden;min-width:196px;display:none;}
  .menu.open{display:block;}
  .menu button{display:block;width:100%;text-align:left;background:none;border:none;
    padding:13px 17px;font-size:14.5px;color:var(--ink);cursor:pointer;font-family:inherit;}
  .menu button:hover{background:#f0f2f5;}
  .toast{position:absolute;bottom:94px;left:50%;transform:translateX(-50%) translateY(8px);
    background:rgba(17,27,33,.94);color:#fff;font-size:13px;padding:9px 15px;border-radius:18px;
    z-index:50;opacity:0;transition:opacity .18s,transform .18s;pointer-events:none;
    max-width:86%;text-align:center;line-height:1.4;}
  .toast.show{opacity:1;transform:translateX(-50%) translateY(0);}

  .caption{font-size:12.5px;color:rgba(255,255,255,.62);text-align:center;max-width:340px;
    line-height:1.5;}

  @media (max-width:1120px){
    .stage{grid-template-columns:1fr;gap:46px;justify-items:center;}
    .pitch{max-width:660px;} h1{font-size:34px;}
  }
  @media (max-width:560px){
    body{padding:0;align-items:stretch;}
    .stage{gap:0;}
    .pitch{display:none;}
    .phone{padding:0;border-radius:0;box-shadow:none;background:none;}
    .phone::after{display:none;}
    .side,.island,.home{display:none;}
    .screen{width:100vw;height:100vh;max-height:100vh;border-radius:0;}
    .statusbar{display:none;} .hd{padding-top:11px;} .menu{top:58px;}
    .bar{padding-bottom:9px;} .caption{display:none;}
  }
</style></head><body>
<div class="stage">

  <section class="pitch">
    ${BRAND_LOCKUP}
    <p class="eyebrow">UBL National Innovation Hackathon 2026</p>
    <h1>SME loans that start on WhatsApp — and finish <em>without a branch visit</em>.</h1>
    <p class="lede">
      Pakistan has around <b>5 million SMEs</b> producing <b>40% of GDP</b>, yet only about
      <b>155,000</b> hold a bank loan. The barrier is not credit risk — it is friction:
      three to five branch trips, a document checklist discovered one item at a time,
      forty to sixty pages read by hand, and weeks to a decision.
    </p>

    <ol class="steps">
      <li><span class="n">1</span>
        <div><h3>The owner applies on WhatsApp, in Urdu</h3>
        <p>The complete document checklist arrives up front in one message, with explicit
           consent captured and timestamped. No repeat trips, nothing discovered later.</p></div></li>
      <li><span class="n">2</span>
        <div><h3>The AI engine runs extract → verify → score → explain</h3>
        <p>Gemini vision extraction, deterministic cross-document fraud checks, an XGBoost
           repayment model and SHAP factor attribution — then a brief written from the
           SHAP output alone.</p></div></li>
      <li><span class="n">3</span>
        <div><h3>The officer reads one page, not fifty</h3>
        <p>Score, risk tier, contributing factors, red flags and a recommended range.
           Approve, decline, or request exactly one missing item. Every step is audited.</p></div></li>
    </ol>

    <div class="stats">
      <div><div class="v">5M</div><div class="k">SMEs in Pakistan</div></div>
      <div><div class="v">40%</div><div class="k">of national GDP</div></div>
      <div><div class="v">155k</div><div class="k">hold a bank loan</div></div>
      <div><div class="v">0</div><div class="k">branch visits to apply</div></div>
    </div>

    <div class="note">
      ${icon('shield', 19)}
      <p><b>This is a live prototype.</b> The conversation on the right runs the real bot
      state machine against the real AI engine — only the WhatsApp transport is simulated.
      It stands in for the WhatsApp Business API, which the bank provisions at integration.</p>
    </div>
  </section>

  <section class="device">
    <div class="phone">
      <span class="side vu"></span><span class="side vd"></span><span class="side pw"></span>
      <div class="screen">
        <div class="island"></div>

        <div class="statusbar">
          <span id="clock">9:41</span>
          <span class="right">
            ${STATUS_ICONS.signal}${STATUS_ICONS.wifi}${STATUS_ICONS.battery}
          </span>
        </div>

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
            <div class="sys"><span>${icon('lock', 13)} Prototype of the Aitbaar WhatsApp Business experience. Documents you send are processed by the real AI engine.</span></div>
          </div>
        </div>

        <div class="toast" id="toast" role="status"></div>

        <div class="bar">
          <div class="field">
            <button class="ib" id="emoji" aria-label="Emoji">${icon('smile', 22)}</button>
            <label for="input" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)">Message</label>
            <input id="input" placeholder="Message" autocomplete="off">
            <button class="ib" id="attach" aria-label="Attach a document from this device">${icon('paperclip', 21)}</button>
            <button class="ib" id="specimen" aria-label="Send the next specimen document">${icon('camera', 21)}</button>
            <input type="file" id="file" accept="image/*,application/pdf" style="display:none" tabindex="-1" aria-hidden="true">
          </div>
          <button class="go" id="go" aria-label="Send message">
            <span class="s-send">${icon('send', 21)}</span>
          </button>
        </div>
        <div class="home"></div>
      </div>
    </div>
    <p class="caption">Live demo — the same state machine the WhatsApp bot runs in production.</p>
  </section>

</div>
<script>
  var ICON_RETRY = '${icon('rotateCw', 15)}';
  var ICON_DOC = '${icon('fileText', 18)}';
  var ICON_TICK = '${icon('checkCheck', 15)}';
  var ICON_SEND = '${icon('send', 21)}';
  var ICON_MIC = '${icon('mic', 21)}';

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
  var clockEl = document.getElementById('clock');

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
  function tickClock() {
    var d = new Date(), h = d.getHours(), m = d.getMinutes();
    h = h % 12 || 12;
    clockEl.textContent = h + ':' + (m < 10 ? '0' : '') + m;
  }
  tickClock(); setInterval(tickClock, 20000);

  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;'); }
  function fmt(s) { return esc(s).replace(/\\*(.+?)\\*/g, '<b>$1</b>'); }

  function render(entry) {
    var row = document.createElement('div');
    row.className = 'row ' + entry.who;
    var b = document.createElement('div');
    b.className = 'b';
    var tick = entry.who === 'me' ? ICON_TICK : '';
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

  // WhatsApp swaps the mic for a send arrow the moment you type.
  function syncSendIcon() {
    goBtn.innerHTML = input.value.trim()
      ? '<span class="s-send">' + ICON_SEND + '</span>'
      : ICON_MIC;
    goBtn.setAttribute('aria-label', input.value.trim() ? 'Send message' : 'Record a voice message');
  }
  input.addEventListener('input', syncSendIcon);

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
    syncSendIcon();
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

  // Header affordances. Calls and the emoji tray are inert in a prototype,
  // but they say so rather than being silently dead.
  document.getElementById('vcall').onclick = function () { toast('Video calls are not available in this prototype.'); };
  document.getElementById('acall').onclick = function () { toast('Voice calls are not available in this prototype.'); };
  document.getElementById('back').onclick = function () { toast('This prototype opens directly on the Aitbaar thread.'); };
  document.getElementById('emoji').onclick = function () { toast('Aitbaar replies in plain text — no emoji in a credit conversation.'); };

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

  syncSendIcon();

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
