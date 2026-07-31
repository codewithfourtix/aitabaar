// All user-facing bot text lives here — no hardcoded strings in handlers.
// Rules from docs/whatsapp-bot-flow.md: the COMPLETE document checklist is
// declared up front (in CONSENT), and the applicant NEVER sees score/tier.
//
// Register: bank-grade, not consumer-chat. No decorative glyphs anywhere —
// what would have been an emoji status marker ("✅ received") is a bold text
// label ("*Received:* CNIC") instead. "Assalam o Alaikum" and "Mubarak ho"
// stay: that is standard formal Pakistani banking register, not slang.

const STRINGS = {
  greeting: {
    en:
      'Assalam o Alaikum. This is *Aitbaar* (اعتبار) — apply for a UBL SME business loan on WhatsApp. ' +
      'No branch visits, no surprises.\n\nReply *1* for English\nجواب دیں *2* اردو کے لیے',
    ur: '', // greeting is bilingual by design — same message either way
  },
  consent: {
    en:
      'Here is the complete list of what you will need:\n\n' +
      '*Documents (clear photos are acceptable):*\n' +
      '1. CNIC (front)\n' +
      '2. Bank statement, *or* JazzCash/Easypaisa statement — last 6 months\n' +
      '3. A recent electricity or gas bill\n\n' +
      'Plus 5 short questions about your business.\n\n' +
      '*Consent:* Your documents will be processed by AI to assess your loan application. ' +
      'A UBL loan officer — a human — makes the final decision. Your data is used only for this application.\n\n' +
      'Reply *YES* to agree and begin, or *NO* to stop.',
    ur:
      'یہ رہی *مکمل فہرست* — پہلے ہی سب کچھ:\n\n' +
      '*دستاویزات (صاف تصویریں قابلِ قبول ہیں):*\n' +
      '۱۔ شناختی کارڈ (سامنے کا رخ)\n' +
      '۲۔ بینک اسٹیٹمنٹ، *یا* جاز کیش/ایزی پیسہ اسٹیٹمنٹ — آخری ۶ ماہ\n' +
      '۳۔ حالیہ بجلی یا گیس کا بل\n\n' +
      'اس کے علاوہ کاروبار کے بارے میں ۵ مختصر سوالات۔\n\n' +
      '*رضامندی:* آپ کی دستاویزات AI کے ذریعے قرض کی درخواست جانچنے کے لیے استعمال ہوں گی۔ ' +
      'حتمی فیصلہ UBL کا لون آفیسر — ایک انسان — کرے گا۔ آپ کا ڈیٹا صرف اسی درخواست کے لیے استعمال ہوگا۔\n\n' +
      'اتفاق اور آغاز کے لیے *HAAN* لکھیں، یا رکنے کے لیے *NO*۔',
  },
  consentDeclined: {
    en: 'Understood. Nothing has been saved. You may message us again at any time.',
    ur: 'کوئی بات نہیں۔ کچھ محفوظ نہیں کیا گیا۔ جب چاہیں دوبارہ پیغام بھیجیں۔',
  },

  qName: {
    en: 'First, your full name (as on CNIC)?',
    ur: 'سب سے پہلے، آپ کا پورا نام (شناختی کارڈ کے مطابق)؟',
  },
  qBusinessName: {
    en: 'Your registered or trading business name?',
    ur: 'آپ کے کاروبار کا (رجسٹرڈ یا مروجہ) نام؟',
  },

  // The 5 business questions (spec §4, trimmed from an earlier 10-question
  // version to keep a live demo moving — see docs/whatsapp-bot-flow.md).
  // Each of these 5 is either a direct scoring.py model input (years,
  // monthly sales) or load-bearing for the loan itself (amount, purpose).
  qBusinessType: {
    en: '*Question 1/5:* What type of business? (e.g. general store, wholesale, food, textile)',
    ur: '*سوال ۱/۵:* کاروبار کی قسم؟ (مثلاً جنرل اسٹور، ہول سیل، کھانا، کپڑا)',
  },
  qYears: {
    en: '*Question 2/5:* How many years have you been trading?',
    ur: '*سوال ۲/۵:* کاروبار کو کتنے سال ہو گئے؟',
  },
  qMonthlySales: {
    en: '*Question 3/5:* Average monthly sales, in PKR? (e.g. 400000)',
    ur: '*سوال ۳/۵:* ماہانہ اوسط فروخت، روپوں میں؟ (مثلاً 400000)',
  },
  qAmount: {
    en: '*Question 4/5:* How much loan do you need, in PKR? (e.g. 1500000)',
    ur: '*سوال ۴/۵:* آپ کو کتنا قرض درکار ہے، روپوں میں؟ (مثلاً 1500000)',
  },
  qPurpose: {
    en: '*Question 5/5:* What is the loan for? (e.g. stock for Ramzan, new machine)',
    ur: '*سوال ۵/۵:* قرض کس مقصد کے لیے درکار ہے؟ (مثلاً رمضان کا اسٹاک، نئی مشین)',
  },

  askCnic: {
    en: 'Now the documents — 1 of 3. Send a photo of your *CNIC (front)*.',
    ur: 'اب دستاویزات — ۱/۳۔ اپنے *شناختی کارڈ (سامنے کا رخ)* کی تصویر بھیجیں۔',
  },
  askBank: {
    en: '*Received:* CNIC.\n2 of 3 — send your *bank statement or JazzCash/Easypaisa statement, last 6 months* (PDF or photos).',
    ur: '*موصول:* شناختی کارڈ۔\n۲/۳ — *بینک یا جاز کیش/ایزی پیسہ اسٹیٹمنٹ (آخری ۶ ماہ)* بھیجیں (PDF یا تصویریں)۔',
  },
  askUtility: {
    en: '*Received:* statement.\n3 of 3 — send a recent *electricity or gas bill*.',
    ur: '*موصول:* اسٹیٹمنٹ۔\n۳/۳ — حالیہ *بجلی یا گیس کا بل* بھیجیں۔',
  },
  askOptionalDocs: {
    en:
      'These documents are optional but can strengthen your application:\n' +
      '• Business registration proof (NTN certificate, trade license, partnership deed, or trade body membership)\n\n' +
      'Reply *SKIP* to continue without it, or send it now.',
    ur:
      'یہ دستاویز اختیاری ہے مگر درخواست مضبوط بناتی ہے:\n' +
      '• کاروباری رجسٹریشن ثبوت (NTN سرٹیفکیٹ، ٹریڈ لائسنس، پارٹنرشپ ڈیڈ، یا ٹریڈ باڈی ممبرشپ)\n\n' +
      'بغیر اس کے جاری رکھنے کے لیے *SKIP* لکھیں، یا ابھی بھیج دیں۔',
  },
  askPropertyDoc: {
    en: 'For loan amounts of this size, please also send proof of ownership or a rent agreement for your business premises.',
    ur: 'اس حجم کے قرض کے لیے، براہ کرم اپنے کاروباری مقام کی ملکیت کا ثبوت یا کرایہ نامہ بھی بھیجیں۔',
  },
  expectedDocument: {
    en: 'Please send a photo or PDF for this step. Type *help* if you are stuck.',
    ur: 'براہ کرم اس مرحلے کے لیے تصویر یا PDF بھیجیں۔ مدد کے لیے *madad* لکھیں۔',
  },
  confirm: {
    en: '*All documents received.*\n\n*Summary:*\n{summary}\n\nReply *SUBMIT* to send your application to UBL.',
    ur: '*تمام دستاویزات موصول ہو گئیں۔*\n\n*خلاصہ:*\n{summary}\n\nدرخواست UBL کو بھیجنے کے لیے *SUBMIT* لکھیں۔',
  },
  submitted: {
    en: 'Your application has been submitted.\n\n*Reference: {ref}*\n\nNo branch visit is required. We will update you here. Type *status* at any time.',
    ur: 'آپ کی درخواست جمع کر دی گئی ہے۔\n\n*ریفرنس نمبر: {ref}*\n\nکسی برانچ جانے کی ضرورت نہیں۔ ہر اپڈیٹ یہیں ملے گی۔ کسی بھی وقت *status* لکھیں۔',
  },
  statusDraft: {
    en: 'Your application is incomplete — continue where you left off by replying here.',
    ur: 'آپ کی درخواست ادھوری ہے — یہیں جواب دے کر جاری رکھیں۔',
  },
  statusInReview: {
    en: 'Reference {ref}: under review. We will message you as soon as there is an update.',
    ur: 'ریفرنس {ref}: زیرِ جائزہ ہے۔ اپڈیٹ ملتے ہی پیغام بھیجا جائے گا۔',
  },
  statusScored: {
    en: 'Reference {ref}: with our loan officer for review.',
    ur: 'ریفرنس {ref}: لون آفیسر کے پاس جائزے کے لیے ہے۔',
  },
  needsDocs: {
    en: 'Reference {ref}: the loan officer needs one more item:\n\n*{doc}*\n{note}\n\nPlease send it here as a photo or PDF.',
    ur: 'ریفرنس {ref}: لون آفیسر کو صرف ایک چیز درکار ہے:\n\n*{doc}*\n{note}\n\nبراہ کرم یہیں تصویر یا PDF بھیج دیں۔',
  },
  redocReceived: {
    en: 'Received — forwarding it to the officer now.',
    ur: 'موصول ہو گیا — ابھی آفیسر کو بھیجا جا رہا ہے۔',
  },
  approved: {
    en: '*Mubarak ho.* Reference {ref}: your loan of *PKR {amount}* has been approved. The branch will contact you to complete signing.',
    ur: '*مبارک ہو۔* ریفرنس {ref}: آپ کا *{amount} روپے* کا قرض منظور ہو گیا ہے۔ دستخط کے لیے برانچ آپ سے رابطہ کرے گی۔',
  },
  rejected: {
    en: 'Reference {ref}: we are unable to offer a loan at this time. You may re-apply after 3 months, and your record here is retained. Thank you for choosing Aitbaar.',
    ur: 'ریفرنس {ref}: اس وقت قرض ممکن نہیں۔ ۳ ماہ بعد دوبارہ درخواست دے سکتے ہیں، آپ کا ریکارڈ محفوظ رہے گا۔ اعتبار کا انتخاب کرنے کا شکریہ۔',
  },
  help: {
    en: 'Current step: {step}\nCommands: *status* (check application) · *restart* (start over)',
    ur: 'موجودہ مرحلہ: {step}\nکمانڈز: *status* (درخواست دیکھیں) · *restart* (دوبارہ شروع کریں)',
  },
  restartConfirm: {
    en: 'Start over? Your current progress will be lost. Reply *YES* to restart.',
    ur: 'دوبارہ شروع کریں؟ موجودہ پیشرفت ختم ہو جائے گی۔ *HAAN* لکھیں۔',
  },
  invalidNumber: {
    en: 'Please reply with a number, e.g. 400000.',
    ur: 'براہ کرم صرف نمبر لکھیں، مثلاً 400000۔',
  },
  noApplication: {
    en: 'No application found for this number yet. Reply *loan* to start one.',
    ur: 'اس نمبر سے ابھی کوئی درخواست نہیں ملی۔ شروع کرنے کے لیے *loan* لکھیں۔',
  },
  fallback: {
    en: "Sorry, that wasn't understood. {reprompt}",
    ur: 'معذرت، سمجھ نہیں آیا۔ {reprompt}',
  },
  backendDown: {
    en: 'We are experiencing a technical issue. Please try again shortly.',
    ur: 'تکنیکی مسئلہ درپیش ہے۔ چند منٹ بعد دوبارہ کوشش کریں۔',
  },
};

const DOC_LABELS = {
  cnic: { en: 'CNIC (front)', ur: 'شناختی کارڈ (سامنے کا رخ)' },
  bank_statement: {
    en: 'Bank or JazzCash/Easypaisa statement (last 6 months)',
    ur: 'بینک یا جاز کیش/ایزی پیسہ اسٹیٹمنٹ (آخری ۶ ماہ)',
  },
  utility_bill: { en: 'Electricity/gas bill', ur: 'بجلی یا گیس کا بل' },
  business_questionnaire: { en: 'Business questionnaire', ur: 'کاروباری سوالنامہ' },
  business_registration: {
    en: 'Business registration proof (NTN, trade license, partnership deed, or trade body membership)',
    ur: 'کاروباری رجسٹریشن ثبوت (NTN، ٹریڈ لائسنس، پارٹنرشپ ڈیڈ، یا ٹریڈ باڈی ممبرشپ)',
  },
  property_document: {
    en: 'Business premises ownership proof or rent agreement',
    ur: 'کاروباری مقام کی ملکیت کا ثبوت یا کرایہ نامہ',
  },
  // Officer-initiated only (dashboard's Request Documents "Other" option) —
  // the actual document name lives in the officer's note, quoted right
  // below this label in the needsDocs template, not in this fixed string.
  other: {
    en: 'Additional document (see note below)',
    ur: 'اضافی دستاویز (نیچے نوٹ ملاحظہ کریں)',
  },
};

// Labels and value fragments for the CONFIRM summary block. Kept here with
// everything else user-facing: the summary is shown inside an otherwise
// fully-Urdu thread, so English labels would read as a half-finished
// translation on the judges' screen.
const SUMMARY = {
  name: { en: 'Name', ur: 'نام' },
  business: { en: 'Business', ur: 'کاروبار' },
  monthlySales: { en: 'Monthly sales', ur: 'ماہانہ فروخت' },
  requested: { en: 'Requested', ur: 'درخواست شدہ رقم' },
  purpose: { en: 'Purpose', ur: 'مقصد' },
  documents: { en: 'Documents', ur: 'دستاویزات' },
  // value fragments
  years: { en: 'years', ur: 'سال' },
  pkr: { en: 'PKR', ur: 'روپے' },
  // short document names for the summary line
  docCnic: { en: 'CNIC', ur: 'شناختی کارڈ' },
  docStatement: { en: 'statement', ur: 'اسٹیٹمنٹ' },
  docUtility: { en: 'utility bill', ur: 'بجلی/گیس بل' },
  docRegistration: { en: 'business registration', ur: 'کاروباری رجسٹریشن' },
  docPremises: { en: 'premises proof', ur: 'مقام کا ثبوت' },
};

function summaryLabel(key, lang) {
  const entry = SUMMARY[key];
  if (!entry) return key;
  return entry[lang] || entry.en;
}

function t(key, lang, vars = {}) {
  const entry = STRINGS[key];
  if (!entry) return key;
  let text = entry[lang] || entry.en;
  for (const [k, v] of Object.entries(vars)) {
    text = text.split(`{${k}}`).join(String(v));
  }
  return text;
}

function docLabel(type, lang) {
  const entry = DOC_LABELS[type];
  if (!entry) return type;
  return entry[lang] || entry.en;
}

module.exports = { t, docLabel, summaryLabel, STRINGS, DOC_LABELS, SUMMARY };
