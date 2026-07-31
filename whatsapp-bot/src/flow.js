// Conversation state machine — one session per phone number.
// Spec: docs/whatsapp-bot-flow.md. In-memory by design (demo scope, decisions.md #7).

const api = require('./api');
const { t, docLabel, summaryLabel } = require('./strings');

const sessions = new Map(); // phone -> { state, lang, appId, data, pendingDoc }

const YES_WORDS = ['yes', 'haan', 'han', 'ہاں', 'جی', 'ji', 'y', '1', 'ok', 'submit'];
const NO_WORDS = ['no', 'nahi', 'نہیں', 'n', '2', 'cancel'];
const SKIP_WORDS = ['skip', 'no', 'nahi', 'نہیں', 'chhoro', 'chhorein', 'آگے'];

// SBP Regulation R-8 puts the clean-facility ceiling here: above this a
// facility needs to be secured, so we ask for premises proof (spec §5).
const PROPERTY_DOC_THRESHOLD_PKR = 5000000;

function getSession(phone) {
  if (!sessions.has(phone)) {
    sessions.set(phone, { state: 'START', lang: 'en', appId: null, data: {}, pendingDoc: null });
  }
  return sessions.get(phone);
}

function phoneFromMsg(msg) {
  return '+' + msg.from.split('@')[0];
}

function fmtPkr(n) {
  return Number(n).toLocaleString('en-PK');
}

function parseNumber(text) {
  const digits = (text || '').replace(/[^0-9]/g, '');
  return digits ? parseInt(digits, 10) : null;
}

function summaryText(s) {
  const d = s.data;
  const lang = s.lang;
  const L = (k) => summaryLabel(k, lang);
  const pkr = (n) => `${L('pkr')} ${fmtPkr(n)}`;

  const docs = [L('docCnic'), L('docStatement'), L('docUtility')];
  if (d.hasRegistrationDoc) docs.push(L('docRegistration'));
  if (d.hasPropertyDoc) docs.push(L('docPremises'));

  return [
    `*${L('name')}:* ${d.name} — ${d.businessName}`,
    `*${L('business')}:* ${d.businessType}, ${d.years} ${L('years')}`,
    `*${L('monthlySales')}:* ${pkr(d.monthlySales)}`,
    `*${L('requested')}:* ${pkr(d.amount)}`,
    `*${L('purpose')}:* ${d.purpose}`,
    `*${L('documents')}:* ${docs.join(', ')}`,
  ].join('\n');
}

// The questionnaire travels to the backend as a JSON document. Key names are
// NOT free-form: scoring.py's _FIELD_SOURCES reads specific keys off this
// document, and any it cannot find falls back to a dataset median and drags
// down data_completeness (an honest, documented degradation — see
// backend/data/DATA_CARD.md's "Fields the real intake flow doesn't collect
// (yet)"). Only 5 questions are asked (demo-length constraint), so employees,
// has_existing_loan, legal_structure, monthly_expenses_pkr and tenor_months
// are deliberately NOT collected here and fall back to medians.
function questionnairePayload(d) {
  return {
    // consumed by scoring.py
    years_in_business: d.years,
    monthly_revenue_pkr: d.monthlySales,
    // officer-facing / verification context
    business_type: d.businessType,
    loan_purpose: d.purpose,
    consent_at: d.consentAt,
  };
}

async function uploadIncomingMedia(msg, s, docType) {
  const media = await msg.downloadMedia();
  const buffer = Buffer.from(media.data, 'base64');
  const ext = (media.mimetype || '').includes('pdf') ? 'pdf' : 'jpg';
  const filename = media.filename || `${docType}.${ext}`;
  await api.uploadDocument(s.appId, docType, buffer, filename, media.mimetype || 'image/jpeg');
}

// After the 3 required documents (and the optional/conditional tier), decide
// where to go next. Kept in one place so DOC_UTILITY, DOC_OPTIONAL and
// DOC_PROPERTY cannot drift apart.
function afterOptionalDocs(s) {
  if (s.data.amount >= PROPERTY_DOC_THRESHOLD_PKR && !s.data.hasPropertyDoc) {
    s.state = 'DOC_PROPERTY';
    return t('askPropertyDoc', s.lang);
  }
  s.state = 'CONFIRM';
  return t('confirm', s.lang, { summary: summaryText(s) });
}

async function statusReply(s, phone) {
  let app;
  try {
    app = s.appId ? await api.getApplication(s.appId) : await api.findByPhone(phone);
  } catch (err) {
    // Application gone (e.g. /demo/reset wiped the store) — recover cleanly
    if (err.response && err.response.status === 404) {
      sessions.delete(phone);
      return t('noApplication', s.lang);
    }
    throw err;
  }
  if (!app) return t('noApplication', s.lang);
  const vars = { ref: app.id };
  switch (app.status) {
    case 'draft':
      return t('statusDraft', s.lang);
    case 'submitted':
    case 'processing':
      return t('statusInReview', s.lang, vars);
    case 'scored':
    case 'failed': // internal failure is officer-side info; applicant just sees "in review"
      return t('statusScored', s.lang, vars); // NEVER reveal score/tier/factors
    case 'needs_docs': {
      const docType = (app.pending_doc_requests && app.pending_doc_requests[0]) || 'bank_statement';
      const lastReq = [...app.audit_trail].reverse().find((e) => e.action === 'request_docs');
      s.state = 'NEEDS_DOCS';
      s.appId = app.id;
      s.pendingDoc = docType;
      return t('needsDocs', s.lang, {
        ref: app.id,
        doc: docLabel(docType, s.lang),
        note: lastReq && lastReq.detail ? `"${lastReq.detail}"` : '',
      });
    }
    case 'approved':
      return t('approved', s.lang, { ref: app.id, amount: fmtPkr(app.requested_amount_pkr) });
    case 'rejected':
      return t('rejected', s.lang, vars);
    default:
      return t('statusInReview', s.lang, vars);
  }
}

// Returns the reply text for an incoming message (or null for no reply).
async function handleMessage(msg) {
  const phone = phoneFromMsg(msg);
  const s = getSession(phone);
  const text = (msg.body || '').trim();
  const lower = text.toLowerCase();

  // Global commands work in any state
  if (['status', 'اسٹیٹس'].includes(lower)) return statusReply(s, phone);
  if (['help', 'madad', 'مدد'].includes(lower)) return t('help', s.lang, { step: s.state });
  if (lower === 'restart') {
    s.state = 'RESTART_CONFIRM';
    return t('restartConfirm', s.lang);
  }

  switch (s.state) {
    case 'RESTART_CONFIRM':
      if (YES_WORDS.includes(lower)) {
        sessions.set(phone, { state: 'LANGUAGE', lang: s.lang, appId: null, data: {}, pendingDoc: null });
        return t('greeting', 'en');
      }
      s.state = 'START';
      return t('greeting', 'en');

    case 'START':
      s.state = 'LANGUAGE';
      return t('greeting', 'en');

    case 'LANGUAGE':
      if (['2', 'اردو', 'urdu', 'ur'].includes(lower)) s.lang = 'ur';
      else if (['1', 'english', 'en'].includes(lower)) s.lang = 'en';
      else return t('fallback', s.lang, { reprompt: t('greeting', 'en') });
      s.state = 'CONSENT';
      return t('consent', s.lang); // full checklist up front — the product promise

    case 'CONSENT':
      if (YES_WORDS.includes(lower)) {
        s.state = 'Q_NAME';
        s.data.consentAt = new Date().toISOString();
        return t('qName', s.lang);
      }
      if (NO_WORDS.includes(lower)) {
        sessions.delete(phone);
        return t('consentDeclined', s.lang);
      }
      return t('fallback', s.lang, { reprompt: t('consent', s.lang) });

    case 'Q_NAME':
      if (!text) return t('qName', s.lang);
      s.data.name = text;
      s.state = 'Q_BUSINESS_NAME';
      return t('qBusinessName', s.lang);

    case 'Q_BUSINESS_NAME':
      if (!text) return t('qBusinessName', s.lang);
      s.data.businessName = text;
      s.state = 'Q_BUSINESS_TYPE';
      return t('qBusinessType', s.lang);

    // ── The 5 business questions (spec §4, trimmed from 10 for demo
    // pace) — each of these 5 is either a direct scoring.py model input
    // (years, monthly sales) or load-bearing for the loan itself (amount,
    // purpose); legal structure, employees, expenses, existing loans and
    // tenor were the ones cut, and fall back to dataset medians. ────────

    case 'Q_BUSINESS_TYPE': // 1/5
      if (!text) return t('qBusinessType', s.lang);
      s.data.businessType = text;
      s.state = 'Q_YEARS';
      return t('qYears', s.lang);

    case 'Q_YEARS': { // 2/5
      const years = parseNumber(text);
      if (years === null) return t('invalidNumber', s.lang);
      s.data.years = years;
      s.state = 'Q_MONTHLY_SALES';
      return t('qMonthlySales', s.lang);
    }

    case 'Q_MONTHLY_SALES': { // 3/5
      const sales = parseNumber(text);
      if (sales === null) return t('invalidNumber', s.lang);
      s.data.monthlySales = sales;
      s.state = 'Q_AMOUNT';
      return t('qAmount', s.lang);
    }

    case 'Q_AMOUNT': { // 4/5
      const amount = parseNumber(text);
      if (amount === null) return t('invalidNumber', s.lang);
      s.data.amount = amount;
      s.state = 'Q_PURPOSE';
      return t('qPurpose', s.lang);
    }

    case 'Q_PURPOSE': { // 5/5 — application is created once all answers are in
      if (!text) return t('qPurpose', s.lang);
      s.data.purpose = text;
      const app = await api.createApplication({
        phone,
        name: s.data.name,
        businessName: s.data.businessName,
        businessType: s.data.businessType,
        language: s.lang,
        amountPkr: s.data.amount,
      });
      s.appId = app.id;
      // Questionnaire answers travel as a document, per contract
      await api.uploadDocument(
        s.appId,
        'business_questionnaire',
        Buffer.from(JSON.stringify(questionnairePayload(s.data), null, 2)),
        'questionnaire.json',
        'application/json'
      );
      s.state = 'DOC_CNIC';
      return t('askCnic', s.lang);
    }

    // ── Documents: 3 required, then optional, then conditional ──

    case 'DOC_CNIC':
      if (!msg.hasMedia) return t('expectedDocument', s.lang);
      await uploadIncomingMedia(msg, s, 'cnic');
      s.state = 'DOC_BANK';
      return t('askBank', s.lang);

    case 'DOC_BANK':
      if (!msg.hasMedia) return t('expectedDocument', s.lang);
      await uploadIncomingMedia(msg, s, 'bank_statement');
      s.state = 'DOC_UTILITY';
      return t('askUtility', s.lang);

    case 'DOC_UTILITY':
      if (!msg.hasMedia) return t('expectedDocument', s.lang);
      await uploadIncomingMedia(msg, s, 'utility_bill');
      s.state = 'DOC_OPTIONAL';
      return t('askOptionalDocs', s.lang);

    case 'DOC_OPTIONAL':
      if (msg.hasMedia) {
        await uploadIncomingMedia(msg, s, 'business_registration');
        s.data.hasRegistrationDoc = true;
        return afterOptionalDocs(s);
      }
      if (SKIP_WORDS.includes(lower)) return afterOptionalDocs(s);
      return t('fallback', s.lang, { reprompt: t('askOptionalDocs', s.lang) });

    case 'DOC_PROPERTY':
      if (!msg.hasMedia) return t('expectedDocument', s.lang);
      await uploadIncomingMedia(msg, s, 'property_document');
      s.data.hasPropertyDoc = true;
      s.state = 'CONFIRM';
      return t('confirm', s.lang, { summary: summaryText(s) });

    case 'CONFIRM':
      if (YES_WORDS.includes(lower)) {
        const app = await api.submitApplication(s.appId);
        s.state = 'SUBMITTED';
        return t('submitted', s.lang, { ref: app.id });
      }
      return t('confirm', s.lang, { summary: summaryText(s) });

    case 'NEEDS_DOCS': {
      if (!msg.hasMedia) return t('expectedDocument', s.lang);
      await uploadIncomingMedia(msg, s, s.pendingDoc || 'bank_statement');
      await api.submitApplication(s.appId);
      s.state = 'SUBMITTED';
      s.pendingDoc = null;
      return t('redocReceived', s.lang);
    }

    case 'SUBMITTED':
      return statusReply(s, phone);

    default:
      s.state = 'START';
      return t('greeting', 'en');
  }
}

// Poll the backend for decisions on submitted applications and push the
// outcome to the applicant. (Backend->bot push is PLANNED in api.md.)
// Short interval is deliberate: a live demo where the officer approves/
// rejects/requests-docs on the dashboard needs the applicant's chat to
// visibly update within a few seconds, not up to 30.
const POLL_MS = 5000;
const notified = new Set(); // `${appId}:${status}` already messaged

function startPoller(client) {
  setInterval(async () => {
    for (const [phone, s] of sessions) {
      // Watch SUBMITTED (waiting on the officer) and NEEDS_DOCS (waiting on
      // the applicant, but the officer can still approve/reject before that
      // re-upload happens — e.g. changes their mind after requesting a
      // document). Stopping at NEEDS_DOCS would silently drop that
      // notification; only NEEDS_DOCS's own re-submission moves state on.
      if (!s.appId || (s.state !== 'SUBMITTED' && s.state !== 'NEEDS_DOCS')) continue;
      try {
        const app = await api.getApplication(s.appId);
        const key = `${app.id}:${app.status}`;
        if (!['approved', 'rejected', 'needs_docs'].includes(app.status) || notified.has(key)) continue;
        notified.add(key);
        const chatId = phone.replace('+', '') + '@c.us';
        const reply = await statusReply(s, phone);
        await client.sendMessage(chatId, reply);
      } catch (err) {
        if (err.response && err.response.status === 404) {
          sessions.delete(phone); // app wiped by /demo/reset — stop polling it
        } else {
          console.error('poller error for', phone, err.message);
        }
      }
    }
  }, POLL_MS);
}

module.exports = {
  handleMessage,
  startPoller,
  sessions,
  PROPERTY_DOC_THRESHOLD_PKR,
  questionnairePayload,
};
