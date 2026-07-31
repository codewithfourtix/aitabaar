// End-to-end conversation test: drives the REAL state machine (src/flow.js)
// with fake WhatsApp messages against a RUNNING backend (BACKEND_API_URL).
// No WhatsApp session needed — this tests everything except whatsapp-web.js itself.
//
// Run: node test/e2e.js   (backend must be up: uvicorn app.main:app)

process.env.BACKEND_API_URL = process.env.BACKEND_API_URL || 'http://localhost:8000';

const axios = require('axios');
axios.defaults.headers.common.Connection = 'close'; // avoid stale keep-alive sockets (ECONNRESET)
const { handleMessage, sessions } = require('../src/flow');

const PHONE = '923330001122';
const FROM = `${PHONE}@c.us`;
const API = process.env.BACKEND_API_URL;

// 1x1 white JPEG
const TINY_JPEG_B64 =
  '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0a' +
  'HBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAA' +
  'AAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AVN//2Q==';

function textMsg(body) {
  return { from: FROM, body, hasMedia: false, reply: async () => {} };
}

function mediaMsg(filename, mimetype) {
  return {
    from: FROM,
    body: '',
    hasMedia: true,
    reply: async () => {},
    downloadMedia: async () => ({ data: TINY_JPEG_B64, mimetype, filename }),
  };
}

let failures = 0;

function check(label, cond, extra = '') {
  const mark = cond ? 'PASS' : 'FAIL';
  if (!cond) failures += 1;
  console.log(`  [${mark}] ${label}${extra ? ' — ' + extra : ''}`);
}

async function say(msg, label) {
  const reply = await handleMessage(msg);
  console.log(`\n> ${label}`);
  console.log(`< ${(reply || '(no reply)').slice(0, 120).replace(/\n/g, ' | ')}`);
  return reply || '';
}

async function main() {
  console.log(`E2E against ${API}`);
  await axios.get(`${API}/health`);

  // Full applicant journey
  let r = await say(textMsg('loan'), 'applicant: loan');
  check('greeting offers language choice', r.includes('English'));

  r = await say(textMsg('1'), 'applicant: 1 (English)');
  check('consent lists ALL docs up front', r.includes('CNIC') && r.includes('Bank statement') && r.toLowerCase().includes('bill'));
  check('consent mentions human decision', r.toLowerCase().includes('officer'));

  check('consent previews 5 questions', r.includes('5'));
  check('consent accepts wallet statement', /jazzcash|easypaisa/i.test(r));

  r = await say(textMsg('yes'), 'applicant: yes (consent)');
  r = await say(textMsg('Muhammad Imran Test'), 'name');
  r = await say(textMsg('Imran General Store'), 'business name');
  check('Q1 is business type', r.toLowerCase().includes('type of business'));
  r = await say(textMsg('General store'), 'Q1 type');
  r = await say(textMsg('5'), 'Q2 years');
  r = await say(textMsg('400000'), 'Q3 monthly sales');
  r = await say(textMsg('1500000'), 'Q4 amount');
  r = await say(textMsg('Ramzan stock'), 'Q5 purpose');
  check('asks for CNIC after 5 questions', r.includes('CNIC'));

  const s = sessions.get('+' + PHONE);
  check('application created', !!s.appId, s.appId);

  r = await say(mediaMsg('cnic.jpg', 'image/jpeg'), 'send CNIC photo');
  check('confirms CNIC, asks bank statement', r.toLowerCase().includes('bank'));
  r = await say(mediaMsg('statement.jpg', 'image/jpeg'), 'send bank statement');
  check('asks utility bill', r.toLowerCase().includes('bill'));
  r = await say(mediaMsg('bill.jpg', 'image/jpeg'), 'send utility bill');
  check('offers the optional registration doc', r.toLowerCase().includes('optional'));

  // Optional tier is skippable — 1.5M is under the 5M property-doc threshold,
  // so SKIP must land straight on the summary.
  r = await say(textMsg('skip'), 'applicant: skip optional doc');
  check('skip goes straight to summary + submit', r.toLowerCase().includes('submit'));
  check('summary shows the collected fields',
    r.includes('Business') && r.includes('Monthly sales') && r.includes('Requested'));
  check('summary carries no glyphs', !/[✅⚠\u{1F300}-\u{1FAFF}]/u.test(r));

  r = await say(textMsg('submit'), 'applicant: submit');
  check('submitted with reference', r.includes(s.appId));

  // Backend: questionnaire + 3 docs should be attached
  let { data: app } = await axios.get(`${API}/applications/${s.appId}`);
  check('4 documents on application', app.documents.length === 4, `got ${app.documents.length}`);
  check('consent recorded', app.applicant.consent_given === true);

  // The 5 collected answers must land under the exact keys scoring.py
  // reads, otherwise they silently fall back to dataset medians.
  const q = app.documents.find((d) => d.type === 'business_questionnaire');
  check('questionnaire parsed', !!q && !!q.extracted_fields, q && q.status);
  const f = (q && q.extracted_fields) || {};
  check('years_in_business feeds the model', f.years_in_business === 5);
  check('monthly_revenue_pkr feeds the model', f.monthly_revenue_pkr === 400000);
  check('employees not collected, falls back to median', f.employees === undefined);
  check('has_existing_loan not collected, falls back to median', f.has_existing_loan === undefined);

  // Pipeline auto-runs in background after submit — wait for scored/failed
  process.stdout.write('\nwaiting for background pipeline');
  for (let i = 0; i < 30; i++) {
    await new Promise((res) => setTimeout(res, 2000));
    ({ data: app } = await axios.get(`${API}/applications/${s.appId}`));
    process.stdout.write('.');
    if (['scored', 'failed'].includes(app.status)) break;
  }
  console.log(` -> ${app.status}`);
  check('pipeline auto-scored after submit', app.status === 'scored', app.status);
  if (app.score) {
    check('score has tier + factors + rationale',
      !!app.score.risk_tier && app.score.factors.length > 0 && app.score.rationale.length > 20,
      `tier ${app.score.risk_tier}, p=${app.score.repayment_probability}`);
    // With only 5 questions asked, employees/has_existing_loan (among
    // others) are expected median fallbacks now, not a bug.
    const defaulted = app.score.defaulted_fields || [];
    check('employees correctly falls back to median', defaulted.includes('employees'), defaulted.join(','));
    check('has_existing_loan correctly falls back to median', defaulted.includes('has_existing_loan'));
    console.log(`  data_completeness=${app.score.data_completeness} band=${app.score.completeness_band} defaulted=[${defaulted.join(', ')}]`);
  }

  // Status command must NOT leak the score
  r = await say(textMsg('status'), 'applicant: status (scored)');
  check('status hides score from applicant', !/\d+\s*\/\s*100|tier|probability/i.test(r));

  // Officer requests ONE document
  await axios.post(`${API}/applications/${s.appId}/decision`, {
    officer: 'E2E Officer', action: 'request_docs',
    note: 'Statement covers 3 months, need 6.', requested_doc_types: ['bank_statement'],
  });
  r = await say(textMsg('status'), 'applicant: status (needs_docs)');
  check('asks for exactly the one item', r.includes('one') || r.toLowerCase().includes('bank'), r.slice(0, 80));

  r = await say(mediaMsg('statement6m.jpg', 'image/jpeg'), 'send re-requested doc');
  check('re-doc accepted', r.length > 0);
  ({ data: app } = await axios.get(`${API}/applications/${s.appId}`));
  check('resubmitted + pending cleared', app.pending_doc_requests.length === 0);

  // Wait for re-score, then approve → applicant sees Mubarak message
  for (let i = 0; i < 30; i++) {
    await new Promise((res) => setTimeout(res, 2000));
    ({ data: app } = await axios.get(`${API}/applications/${s.appId}`));
    if (['scored', 'failed'].includes(app.status)) break;
  }
  await axios.post(`${API}/applications/${s.appId}/decision`, {
    officer: 'E2E Officer', action: 'approve', note: 'Strong file.', requested_doc_types: [],
  });
  r = await say(textMsg('status'), 'applicant: status (approved)');
  check('approval message with amount', r.includes('Mubarak'), r.slice(0, 80));
  check('approval message carries no glyphs', !/[\u{1F300}-\u{1FAFF}\u{2700}-\u{27BF}]/u.test(r));

  await conditionalPropertyDocJourney();

  console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : failures + ' CHECKS FAILED'}`);
  process.exit(failures === 0 ? 0 : 1);
}

// Second applicant, requesting above the SBP R-8 clean-facility limit, so the
// conditional premises document must be requested before the summary.
async function conditionalPropertyDocJourney() {
  console.log('\n--- conditional property document (amount >= PKR 5,000,000) ---');
  const phone2 = '923330009988';
  const from2 = `${phone2}@c.us`;
  const say2 = async (body, hasMedia, label) => {
    const msg = hasMedia
      ? { from: from2, body: '', hasMedia: true, reply: async () => {},
          downloadMedia: async () => ({ data: TINY_JPEG_B64, mimetype: 'image/jpeg', filename: 'doc.jpg' }) }
      : { from: from2, body, hasMedia: false, reply: async () => {} };
    const reply = (await handleMessage(msg)) || '';
    console.log(`\n> ${label}\n< ${reply.slice(0, 100).replace(/\n/g, ' | ')}`);
    return reply;
  };

  await say2('loan', false, 'loan');
  await say2('1', false, 'English');
  await say2('yes', false, 'consent');
  await say2('Big Traders Owner', false, 'name');
  await say2('Big Traders', false, 'business name');
  await say2('Wholesale', false, 'Q1 type');
  await say2('9', false, 'Q2 years');
  await say2('3000000', false, 'Q3 monthly sales');
  await say2('8000000', false, 'Q4 amount above threshold');
  await say2('New warehouse', false, 'Q5 purpose');
  await say2('', true, 'CNIC');
  await say2('', true, 'bank statement');
  await say2('', true, 'utility bill');
  let r = await say2('skip', false, 'skip optional registration');
  check('above 5M, premises proof is requested', /ownership|rent agreement/i.test(r), r.slice(0, 90));
  check('does not jump to submit before premises proof', !r.toLowerCase().includes('reply *submit*'));

  r = await say2('', true, 'send premises proof');
  check('after premises proof, summary is shown', r.toLowerCase().includes('submit'));
  check('summary lists premises proof', r.toLowerCase().includes('premises'));

  const s2 = sessions.get('+' + phone2);
  const { data: app2 } = await axios.get(`${API}/applications/${s2.appId}`);
  const types = app2.documents.map((d) => d.type);
  check('property_document accepted by the backend', types.includes('property_document'), types.join(','));
  check('years_in_business recorded for the second applicant too',
    app2.documents.find((d) => d.type === 'business_questionnaire').extracted_fields.years_in_business === 9);
}

main().catch((err) => {
  console.error('\nE2E crashed:', err.message);
  process.exit(1);
});
