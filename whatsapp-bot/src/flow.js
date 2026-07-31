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

// Q7 accepts "NO", "YES", or "YES 200000". A bare YES is taken as a declared
// facility with the amount unstated rather than re-prompting into a loop —
// the SBP-relevant signal is the yes/no itself, and the officer still sees
// that no amount was given.
function parseExistingLoan(text) {
  const lower = (text || '').trim().toLowerCase();
  if (!lower) return null;
  if (NO_WORDS.includes(lower) || lower.startsWith('no') || lower.startsWith('nahi')) {
    return { has: false, amount: null };
  }
  if (lower.startsWith('yes') || lower.startsWith('haan') || lower.startsWith('han') || lower.startsWith('ہاں')) {
    return { has: true, amount: parseNumber(lower) };
  }
  // A bare number is an unambiguous "yes, this much"
  const amount = parseNumber(lower);
  if (amount !== null) return { has: true, amount };
  return null;
}

function summaryText(s) {
  const d = s.data;
  const lang = s.lang;
  const L = (k) => summaryLabel(k, lang);
  const pkr = (n) => `${L('pkr')} ${fmtPkr(n)}`;

  const borrowing = d.hasExistingLoan
    ? d.existingLoanAmount != null
      ? `${L('yes')} — ${pkr(d.existingLoanAmount)}`
      : `${L('yes')} — ${L('amountNotStated')}`
    : L('noneDeclared');

  const docs = [L('docCnic'), L('docStatement'), L('docUtility')];
  if (d.hasRegistrationDoc) docs.push(L('docRegistration'));
  if (d.hasPropertyDoc) docs.push(L('docPremises'));

  return [
    `*${L('name')}:* ${d.name} — ${d.businessName}`,
    `*${L('legalStructure')}:* ${d.legalStructure}`,
    `*${L('business')}:* ${d.businessType}, ${d.years} ${L('years')}, ${d.employees} ${L('staff')}`,
    `*${L('monthlySales')}:* ${pkr(d.monthlySales)}`,
    `*${L('monthlyExpenses')}:* ${pkr(d.monthlyExpenses)}`,
    `*${L('existingBorrowing')}:* ${borrowing}`,
    `*${L('requested')}:* ${pkr(d.amount)} — ${L('over')} ${d.tenorMonths} ${L('months')}`,
    `*${L('purpose')}:* ${d.purpose}`,
    `*${L('documents')}:* ${docs.join(', ')}`,
  ].join('\n');
}

// The questionnaire travels to the backend as a JSON document. Key names are
// NOT free-form: scoring.py's _FIELD_SOURCES reads specific keys off this
// document, and any it cannot find falls back to a dataset median and drags
// down data_completeness. employees / has_existing_loan are real model
// features and are named to match exactly.
//
// existing_installment_pkr is deliberately NOT set: Q7 collects the
// OUTSTANDING amount, which is a different quantity from a monthly
// instalment. Writing one into the other would feed the model a wrong-scale
// number. It stays on median fallback until intake asks for the instalment.
function questionnairePayload(d) {
  const answers = {
    // consumed by scoring.py
    years_in_business: d.years,
    monthly_revenue_pkr: d.monthlySales,
    employees: d.employees,
    has_existing_loan: d.hasExistingLoan,
    // officer-facing / verification context
    business_type: d.businessType,
    legal_structure: d.legalStructure,
    monthly_expenses_pkr: d.monthlyExpenses,
    net_monthly_cash_pkr: d.monthlySales - d.monthlyExpenses,
    tenor_months: d.tenorMonths,
    loan_purpose: d.purpose,
    consent_at: d.consentAt,
  };
  if (d.existingLoanAmount != null) answers.existing_loan_amount_pkr = d.existingLoanAmount;
  return answers;
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
      s.state = 'Q_LEGAL_STRUCTURE';
      return t('qLegalStructure', s.lang);

    // ── The 10 business questions (spec §4) ──────────────────

    case 'Q_LEGAL_STRUCTURE': // 1/10
      if (!text) return t('qLegalStructure', s.lang);
      s.data.legalStructure = text;
      s.state = 'Q_BUSINESS_TYPE';
      return t('qBusinessType', s.lang);

    case 'Q_BUSINESS_TYPE': // 2/10
      if (!text) return t('qBusinessType', s.lang);
      s.data.businessType = text;
      s.state = 'Q_YEARS';
      return t('qYears', s.lang);

    case 'Q_YEARS': { // 3/10
      const years = parseNumber(text);
      if (years === null) return t('invalidNumber', s.lang);
      s.data.years = years;
      s.state = 'Q_EMPLOYEES';
      return t('qEmployees', s.lang);
    }

    case 'Q_EMPLOYEES': { // 4/10 — SBP small-enterprise threshold test
      const employees = parseNumber(text);
      if (employees === null) return t('invalidNumber', s.lang);
      s.data.employees = employees;
      s.state = 'Q_MONTHLY_SALES';
      return t('qMonthlySales', s.lang);
    }

    case 'Q_MONTHLY_SALES': { // 5/10
      const sales = parseNumber(text);
      if (sales === null) return t('invalidNumber', s.lang);
      s.data.monthlySales = sales;
      s.state = 'Q_MONTHLY_EXPENSES';
      return t('qMonthlyExpenses', s.lang);
    }

    case 'Q_MONTHLY_EXPENSES': { // 6/10 — turns sales into a net cash signal
      const expenses = parseNumber(text);
      if (expenses === null) return t('invalidNumber', s.lang);
      s.data.monthlyExpenses = expenses;
      s.state = 'Q_EXISTING_LOANS';
      return t('qExistingLoans', s.lang);
    }

    case 'Q_EXISTING_LOANS': { // 7/10 — SBP SME R-2(ii) e-CIB reconciliation
      const parsed = parseExistingLoan(text);
      if (parsed === null) return t('fallback', s.lang, { reprompt: t('qExistingLoans', s.lang) });
      s.data.hasExistingLoan = parsed.has;
      s.data.existingLoanAmount = parsed.amount;
      s.state = 'Q_AMOUNT';
      return t('qAmount', s.lang);
    }

    case 'Q_AMOUNT': { // 8/10
      const amount = parseNumber(text);
      if (amount === null) return t('invalidNumber', s.lang);
      s.data.amount = amount;
      s.state = 'Q_TENOR';
      return t('qTenor', s.lang);
    }

    case 'Q_TENOR': { // 9/10
      const tenor = parseNumber(text);
      if (tenor === null) return t('invalidNumber', s.lang);
      s.data.tenorMonths = tenor;
      s.state = 'Q_PURPOSE';
      return t('qPurpose', s.lang);
    }

    case 'Q_PURPOSE': { // 10/10 — application is created once all answers are in
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

module.exports = {
  handleMessage,
  startPoller,
  sessions,
  PROPERTY_DOC_THRESHOLD_PKR,
  questionnairePayload,
  parseExistingLoan,
};
