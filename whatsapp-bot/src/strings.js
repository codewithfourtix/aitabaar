// All user-facing bot text lives here — no hardcoded strings in handlers.
// Rule from docs/whatsapp-bot-flow.md: the COMPLETE document checklist is
// declared up front (in CONSENT), and the applicant NEVER sees score/tier.

const STRINGS = {
  greeting: {
    en: 'Assalam o Alaikum! 👋 This is *Aitbaar* (اعتبار) — apply for a UBL SME business loan right here on WhatsApp. No branch visits, no surprises.\n\nReply *1* for English\nجواب دیں *2* اردو کے لیے',
    ur: '', // greeting is bilingual by design
  },
  consent: {
    en:
      'Great! Here is *everything* you will need — the full list, up front:\n\n' +
      '📋 *Documents (photos are fine):*\n1. CNIC (front)\n2. Bank statement — last 6 months (PDF or photos)\n3. A recent electricity/gas bill\n\n' +
      '❓ Plus 5 short questions about your business.\n\n' +
      '🔒 *Consent:* Your documents will be processed by AI to assess your loan application. A UBL loan officer — a human — makes the final decision. Your data is used only for this application.\n\n' +
      'Reply *YES* to agree and begin, or *NO* to stop.',
    ur:
      'زبردست! یہ رہی *مکمل فہرست* — پہلے ہی سب کچھ، کوئی چکر نہیں:\n\n' +
      '📋 *دستاویزات (تصویریں کافی ہیں):*\n۱۔ شناختی کارڈ (سامنے کا رخ)\n۲۔ بینک اسٹیٹمنٹ — آخری ۶ ماہ (PDF یا تصویریں)\n۳۔ حالیہ بجلی یا گیس کا بل\n\n' +
      '❓ اور کاروبار کے بارے میں ۵ مختصر سوالات۔\n\n' +
      '🔒 *رضامندی:* آپ کی دستاویزات AI کے ذریعے قرض کی جانچ کے لیے استعمال ہوں گی۔ حتمی فیصلہ UBL کا لون آفیسر — ایک انسان — کرے گا۔ آپ کا ڈیٹا صرف اسی درخواست کے لیے استعمال ہوگا۔\n\n' +
      'شروع کرنے کے لیے *HAAN* لکھیں، رکنے کے لیے *NO*۔',
  },
  consentDeclined: {
    en: 'No problem. Nothing has been saved. Message us any time — we are here. 🙏',
    ur: 'کوئی بات نہیں۔ کچھ محفوظ نہیں کیا گیا۔ جب چاہیں پیغام بھیجیں۔ 🙏',
  },
  qName: { en: 'First, your full name (as on CNIC)?', ur: 'سب سے پہلے، آپ کا پورا نام (شناختی کارڈ کے مطابق)؟' },
  qBusinessName: { en: 'Your business name?', ur: 'آپ کے کاروبار کا نام؟' },
  qBusinessType: { en: '*Question 1/5:* What type of business? (e.g. general store, wholesale, food, textile)', ur: '*سوال ۱/۵:* کاروبار کی قسم؟ (مثلاً جنرل اسٹور، ہول سیل، کھانا، کپڑا)' },
  qYears: { en: '*Question 2/5:* How many years have you been trading?', ur: '*سوال ۲/۵:* کاروبار کو کتنے سال ہو گئے؟' },
  qMonthlySales: { en: '*Question 3/5:* Average monthly sales, in PKR? (e.g. 400000)', ur: '*سوال ۳/۵:* ماہانہ اوسط فروخت، روپوں میں؟ (مثلاً 400000)' },
  qAmount: { en: '*Question 4/5:* How much loan do you need, in PKR? (e.g. 1500000)', ur: '*سوال ۴/۵:* آپ کو کتنا قرض چاہیے، روپوں میں؟ (مثلاً 1500000)' },
  qPurpose: { en: '*Question 5/5:* What is the loan for? (e.g. stock for Ramzan, new machine)', ur: '*سوال ۵/۵:* قرض کس مقصد کے لیے؟ (مثلاً رمضان کا اسٹاک، نئی مشین)' },
  askCnic: { en: 'Now the documents — 1 of 3.\n📷 Send a photo of your *CNIC (front)*.', ur: 'اب دستاویزات — ۱/۳۔\n📷 اپنے *شناختی کارڈ (سامنے کا رخ)* کی تصویر بھیجیں۔' },
  askBank: { en: '✅ CNIC received.\n2 of 3: send your *bank statement, last 6 months* (PDF or photos).', ur: '✅ شناختی کارڈ مل گیا۔\n۲/۳: *آخری ۶ ماہ کی بینک اسٹیٹمنٹ* بھیجیں (PDF یا تصویریں)۔' },
  askUtility: { en: '✅ Bank statement received.\n3 of 3: send a recent *electricity or gas bill*.', ur: '✅ بینک اسٹیٹمنٹ مل گئی۔\n۳/۳: حالیہ *بجلی یا گیس کا بل* بھیجیں۔' },
  expectedDocument: { en: 'Please send a photo or PDF for this step. Type *help* if you are stuck.', ur: 'براہ کرم اس مرحلے کے لیے تصویر یا PDF بھیجیں۔ مدد کے لیے *madad* لکھیں۔' },
  confirm: {
    en: '✅ All documents received!\n\n*Summary:*\n{summary}\n\nReply *SUBMIT* to send your application to UBL.',
    ur: '✅ تمام دستاویزات مل گئیں!\n\n*خلاصہ:*\n{summary}\n\nدرخواست UBL کو بھیجنے کے لیے *SUBMIT* لکھیں۔',
  },
  submitted: {
    en: '🎉 Done! Your application is submitted.\n\n*Reference: {ref}*\n\nYou do NOT need to visit any branch to apply. We will update you right here. Type *status* any time.',
    ur: '🎉 ہو گیا! آپ کی درخواست جمع ہو گئی۔\n\n*ریفرنس نمبر: {ref}*\n\nدرخواست کے لیے آپ کو کسی برانچ جانے کی ضرورت *نہیں*۔ ہر اپڈیٹ یہیں ملے گی۔ کسی بھی وقت *status* لکھیں۔',
  },
  statusDraft: { en: 'Your application is incomplete — continue where you left off by replying here.', ur: 'آپ کی درخواست ادھوری ہے — یہیں جواب دے کر جاری رکھیں۔' },
  statusInReview: { en: '⏳ Reference {ref}: under review. We will message you here as soon as there is news.', ur: '⏳ ریفرنس {ref}: زیرِ جائزہ ہے۔ کوئی بھی خبر ملتے ہی ہم یہیں پیغام بھیجیں گے۔' },
  statusScored: { en: '⏳ Reference {ref}: with our loan officer for review.', ur: '⏳ ریفرنس {ref}: لون آفیسر کے پاس جائزے کے لیے ہے۔' },
  needsDocs: {
    en: '📄 Reference {ref}: the loan officer needs *one* more item:\n\n*{doc}*\n{note}\n\nJust send it here as a photo or PDF.',
    ur: '📄 ریفرنس {ref}: لون آفیسر کو صرف *ایک* چیز درکار ہے:\n\n*{doc}*\n{note}\n\nبس یہیں تصویر یا PDF بھیج دیں۔',
  },
  redocReceived: { en: '✅ Received — sending it to the officer now.', ur: '✅ مل گیا — ابھی آفیسر کو بھیج رہے ہیں۔' },
  approved: {
    en: '🎊 *Mubarak ho!* Reference {ref}: your loan of *PKR {amount}* has been APPROVED. The branch will contact you for signing. Apna karobar, apna aitbaar. 💪',
    ur: '🎊 *مبارک ہو!* ریفرنس {ref}: آپ کا *{amount} روپے* کا قرض منظور ہو گیا ہے۔ دستخط کے لیے برانچ آپ سے رابطہ کرے گی۔ اپنا کاروبار، اپنا اعتبار۔ 💪',
  },
  rejected: {
    en: 'Reference {ref}: we are sorry — we cannot offer a loan at this time. You can apply again after 3 months, and your record here stays with you. Thank you for trusting Aitbaar.',
    ur: 'ریفرنس {ref}: معذرت — اس وقت قرض ممکن نہیں۔ آپ ۳ ماہ بعد دوبارہ درخواست دے سکتے ہیں، اور آپ کا ریکارڈ محفوظ رہے گا۔ اعتبار پر بھروسے کا شکریہ۔',
  },
  help: { en: 'ℹ️ Current step: {step}\nCommands: *status* (check application) · *restart* (start over)', ur: 'ℹ️ موجودہ مرحلہ: {step}\nکمانڈز: *status* (درخواست دیکھیں) · *restart* (دوبارہ شروع کریں)' },
  restartConfirm: { en: 'Start over? Your current progress will be lost. Reply *YES* to restart.', ur: 'دوبارہ شروع کریں؟ موجودہ پیشرفت ختم ہو جائے گی۔ *HAAN* لکھیں۔' },
  invalidNumber: { en: 'Please reply with a number, e.g. 400000.', ur: 'براہ کرم صرف نمبر لکھیں، مثلاً 400000۔' },
  noApplication: { en: 'No application found for this number yet. Reply *loan* to start one!', ur: 'اس نمبر سے ابھی کوئی درخواست نہیں ملی۔ شروع کرنے کے لیے *loan* لکھیں!' },
  fallback: { en: 'Sorry, I did not understand that. {reprompt}', ur: 'معذرت، سمجھ نہیں آیا۔ {reprompt}' },
  backendDown: { en: '⚠️ We are having a technical issue. Please try again in a few minutes.', ur: '⚠️ تکنیکی مسئلہ درپیش ہے۔ چند منٹ بعد دوبارہ کوشش کریں۔' },
};

const DOC_LABELS = {
  cnic: { en: 'CNIC (front)', ur: 'شناختی کارڈ (سامنے کا رخ)' },
  bank_statement: { en: 'Bank statement (last 6 months)', ur: 'بینک اسٹیٹمنٹ (آخری ۶ ماہ)' },
  utility_bill: { en: 'Electricity/gas bill', ur: 'بجلی یا گیس کا بل' },
  business_questionnaire: { en: 'Business questionnaire', ur: 'کاروباری سوالنامہ' },
};

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

module.exports = { t, docLabel, STRINGS, DOC_LABELS };
