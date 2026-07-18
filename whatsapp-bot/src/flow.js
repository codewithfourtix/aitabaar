// Conversation state machine — one session per phone number.
// Spec: docs/whatsapp-bot-flow.md. In-memory by design (demo scope, decisions.md #7).

const api = require('./api');
const { t, docLabel } = require('./strings');

const sessions = new Map(); // phone -> { state, lang, appId, data, pendingDoc }

const YES_WORDS = ['yes', 'haan', 'han', 'ہاں', 'جی', 'ji', 'y', '1', 'ok', 'submit'];
const NO_WORDS = ['no', 'nahi', 'نہیں', 'n', '2', 'cancel'];

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
  return [
    `• ${d.name} — ${d.businessName}`,
    `• ${d.businessType}, ${d.years} years`,
    `• Monthly sales: PKR ${fmtPkr(d.monthlySales)}`,
    `• Requested: PKR ${fmtPkr(d.amount)}`,
    `• Purpose: ${d.purpose}`,
    `• Documents: CNIC ✅  Bank statement ✅  Utility bill ✅`,
  ].join('\n');
}

async function uploadIncomingMedia(msg, s, docType) {
  const media = await msg.downloadMedia();
  const buffer = Buffer.from(media.data, 'base64');
  const ext = (media.mimetype || '').includes('pdf') ? 'pdf' : 'jpg';
  const filename = media.filename || `${docType}.${ext}`;
  await api.uploadDocument(s.appId, docType, buffer, filename, media.mimetype || 'image/jpeg');
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

    case 'Q_BUSINESS_TYPE':
      if (!text) return t('qBusinessType', s.lang);
      s.data.businessType = text;
      s.state = 'Q_YEARS';
      return t('qYears', s.lang);

    case 'Q_YEARS': {
      const years = parseNumber(text);
      if (years === null) return t('invalidNumber', s.lang);
      s.data.years = years;
      s.state = 'Q_MONTHLY_SALES';
      return t('qMonthlySales', s.lang);
    }

    case 'Q_MONTHLY_SALES': {
      const sales = parseNumber(text);
      if (sales === null) return t('invalidNumber', s.lang);
      s.data.monthlySales = sales;
      s.state = 'Q_AMOUNT';
      return t('qAmount', s.lang);
    }

    case 'Q_AMOUNT': {
      const amount = parseNumber(text);
      if (amount === null) return t('invalidNumber', s.lang);
      s.data.amount = amount;
      s.state = 'Q_PURPOSE';
      return t('qPurpose', s.lang);
    }

    case 'Q_PURPOSE': {
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
      const answers = {
        business_type: s.data.businessType,
        years_in_business: s.data.years,
        monthly_revenue_pkr: s.data.monthlySales,
        loan_purpose: s.data.purpose,
        consent_at: s.data.consentAt,
      };
      await api.uploadDocument(
        s.appId,
        'business_questionnaire',
        Buffer.from(JSON.stringify(answers, null, 2)),
        'questionnaire.json',
        'application/json'
      );
      s.state = 'DOC_CNIC';
      return t('askCnic', s.lang);
    }

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
const POLL_MS = 30000;
const notified = new Set(); // `${appId}:${status}` already messaged

function startPoller(client) {
  setInterval(async () => {
    for (const [phone, s] of sessions) {
      if (!s.appId || s.state !== 'SUBMITTED') continue;
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

module.exports = { handleMessage, startPoller, sessions };
