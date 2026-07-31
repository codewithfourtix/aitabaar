# WhatsApp Frontend — v2 Feature Request

For: whoever's picking up `whatsapp-bot/` (chat UI + conversation flow) next.
Context: we're polishing this for hackathon submission to UBL. Two things drive every change below: (1) it has to read as **professional / bank-grade**, not a fun consumer chat demo, and (2) it's a **prototype standing in for the real WhatsApp Business API** (see root `README.md`) — so it should look and feel like a real WhatsApp thread, just branded to us, not like a toy.

This supersedes the `QUESTIONS (5)` step and document list in [`whatsapp-bot-flow.md`](whatsapp-bot-flow.md) — once implemented, update that file's state table to match (owner: Ali Zulfiqar).

Where the code lives today: `whatsapp-bot/src/websim.js` (the whole chat UI is an inline HTML/CSS/JS template string — `PAGE` constant), `whatsapp-bot/src/strings.js` (all copy), `whatsapp-bot/src/flow.js` (the state machine).

---

## 1. Tone — remove every emoji, rewrite for a bank audience

No decorative emojis anywhere: `👋 📋 ❓ 🔒 🎉 🎊 💪 🙏 📷 ✅ ⏳ ⚠️ 📄`. Replace the functional ones (✅ "received", ⚠️ "error") with **bold text labels** instead of glyphs — e.g. `*Received:* CNIC` instead of `✅ CNIC received.` Keep "Assalam o Alaikum" and "Mubarak ho" — that's standard formal Pakistani banking register, not slang. What reads as unprofessional is the glyphs and exclamatory tone next to financial decisions, not the Urdu itself.

Full rewritten copy for `strings.js` (replace `STRINGS` entirely — includes the new questions from §4 and the document changes from §5):

| Key | English | Urdu |
|---|---|---|
| `greeting` | Assalam o Alaikum. This is **Aitbaar** (اعتبار) — apply for a UBL SME business loan on WhatsApp. No branch visits, no surprises.<br><br>Reply **1** for English<br>جواب دیں **2** اردو کے لیے | *(bilingual by design — same message)* |
| `consent` | Here is the complete list of what you will need:<br><br>**Documents (clear photos are acceptable):**<br>1. CNIC (front)<br>2. Bank statement, *or* JazzCash/Easypaisa statement — last 6 months<br>3. A recent electricity or gas bill<br><br>Plus 10 short questions about your business.<br><br>**Consent:** Your documents will be processed by AI to assess your loan application. A UBL loan officer — a human — makes the final decision. Your data is used only for this application.<br><br>Reply **YES** to agree and begin, or **NO** to stop. | زبردست کے بجائے: "یہ رہی *مکمل فہرست* — پہلے ہی سب کچھ:" ... اسی طرح بغیر ایموجی کے دستاویزات (شناختی کارڈ، بینک اسٹیٹمنٹ *یا* جاز کیش/ایزی پیسہ اسٹیٹمنٹ، بجلی/گیس کا بل) اور "۱۰ مختصر سوالات" اور رضامندی کا حصہ برقرار رکھیں، صرف ایموجیز ہٹا دیں۔ |
| `consentDeclined` | Understood. Nothing has been saved. You may message us again at any time. | کوئی بات نہیں۔ کچھ محفوظ نہیں کیا گیا۔ جب چاہیں دوبارہ پیغام بھیجیں۔ |
| `qName` | First, your full name (as on CNIC)? | سب سے پہلے، آپ کا پورا نام (شناختی کارڈ کے مطابق)؟ |
| `qBusinessName` | Your registered or trading business name? | آپ کے کاروبار کا (رجسٹرڈ یا مروجہ) نام؟ |
| `qLegalStructure` **(new)** | **Question 1/10:** What is your business's legal structure? (e.g. sole proprietorship, partnership, private limited company) | **سوال ۱/۱۰:** آپ کے کاروبار کی قانونی نوعیت کیا ہے؟ (مثلاً واحد ملکیت، پارٹنرشپ، پرائیویٹ لمیٹڈ کمپنی) |
| `qBusinessType` | **Question 2/10:** What type of business? (e.g. general store, wholesale, food, textile) | **سوال ۲/۱۰:** کاروبار کی قسم؟ (مثلاً جنرل اسٹور، ہول سیل، کھانا، کپڑا) |
| `qYears` | **Question 3/10:** How many years have you been trading? | **سوال ۳/۱۰:** کاروبار کو کتنے سال ہو گئے؟ |
| `qEmployees` **(new)** | **Question 4/10:** How many people work at your business, including yourself? | **سوال ۴/۱۰:** آپ کے کاروبار میں (خود سمیت) کتنے افراد کام کرتے ہیں؟ |
| `qMonthlySales` | **Question 5/10:** Average monthly sales, in PKR? (e.g. 400000) | **سوال ۵/۱۰:** ماہانہ اوسط فروخت، روپوں میں؟ (مثلاً 400000) |
| `qMonthlyExpenses` **(new)** | **Question 6/10:** Average monthly business expenses, in PKR — rent, salaries, utilities, supplies? (e.g. 250000) | **سوال ۶/۱۰:** ماہانہ اوسط کاروباری اخراجات، روپوں میں — کرایہ، تنخواہیں، بجلی، خام مال؟ (مثلاً 250000) |
| `qExistingLoans` **(new)** | **Question 7/10:** Do you currently have any outstanding loan or credit facility with any bank or lender? Reply **NO**, or **YES** followed by the amount (e.g. "YES 200000"). | **سوال ۷/۱۰:** کیا آپ پر کسی بینک یا ادارے کا کوئی قرض یا کریڈٹ سہولت واجب الادا ہے؟ **NO** لکھیں، یا **YES** کے ساتھ رقم درج کریں (مثلاً "YES 200000")۔ |
| `qAmount` | **Question 8/10:** How much loan do you need, in PKR? (e.g. 1500000) | **سوال ۸/۱۰:** آپ کو کتنا قرض درکار ہے، روپوں میں؟ (مثلاً 1500000) |
| `qTenor` **(new)** | **Question 9/10:** Over how many months would you like to repay this loan? (e.g. 12) | **سوال ۹/۱۰:** یہ قرض کتنے مہینوں میں ادا کرنا چاہیں گے؟ (مثلاً 12) |
| `qPurpose` | **Question 10/10:** What is the loan for? (e.g. stock for Ramzan, new machine) | **سوال ۱۰/۱۰:** قرض کس مقصد کے لیے درکار ہے؟ (مثلاً رمضان کا اسٹاک، نئی مشین) |
| `askCnic` | Now the documents — 1 of 3. Send a photo of your **CNIC (front)**. | اب دستاویزات — ۱/۳۔ اپنے *شناختی کارڈ (سامنے کا رخ)* کی تصویر بھیجیں۔ |
| `askBank` | **Received:** CNIC.<br>2 of 3 — send your **bank statement or JazzCash/Easypaisa statement, last 6 months** (PDF or photos). | **موصول:** شناختی کارڈ۔<br>۲/۳ — *بینک یا جاز کیش/ایزی پیسہ اسٹیٹمنٹ (آخری ۶ ماہ)* بھیجیں (PDF یا تصویریں)۔ |
| `askUtility` | **Received:** statement.<br>3 of 3 — send a recent **electricity or gas bill**. | **موصول:** اسٹیٹمنٹ۔<br>۳/۳ — حالیہ *بجلی یا گیس کا بل* بھیجیں۔ |
| `askOptionalDocs` **(new)** | These documents are optional but can strengthen your application:<br>• Business registration proof (NTN certificate, trade license, partnership deed, or trade body membership)<br><br>Reply **SKIP** to continue without it, or send it now. | یہ دستاویز اختیاری ہے مگر درخواست مضبوط بناتی ہے:<br>• کاروباری رجسٹریشن ثبوت (NTN سرٹیفکیٹ، ٹریڈ لائسنس، پارٹنرشپ ڈیڈ، یا ٹریڈ باڈی ممبرشپ)<br><br>بغیر اس کے جاری رکھنے کے لیے **SKIP** لکھیں، یا ابھی بھیج دیں۔ |
| `askPropertyDoc` **(new, only if requested amount ≥ PKR 5,000,000)** | For loan amounts of this size, please also send proof of ownership or a rent agreement for your business premises. | اس حجم کے قرض کے لیے، براہ کرم اپنے کاروباری مقام کی ملکیت کا ثبوت یا کرایہ نامہ بھی بھیجیں۔ |
| `expectedDocument` | Please send a photo or PDF for this step. Type **help** if you are stuck. | براہ کرم اس مرحلے کے لیے تصویر یا PDF بھیجیں۔ مدد کے لیے **madad** لکھیں۔ |
| `confirm` | **All documents received.**<br><br>**Summary:**<br>{summary}<br><br>Reply **SUBMIT** to send your application to UBL. | **تمام دستاویزات موصول ہو گئیں۔**<br><br>**خلاصہ:**<br>{summary}<br><br>درخواست UBL کو بھیجنے کے لیے **SUBMIT** لکھیں۔ |
| `submitted` | Your application has been submitted.<br><br>**Reference: {ref}**<br><br>No branch visit is required. We will update you here. Type **status** at any time. | آپ کی درخواست جمع کر دی گئی ہے۔<br><br>**ریفرنس نمبر: {ref}**<br><br>کسی برانچ جانے کی ضرورت نہیں۔ ہر اپڈیٹ یہیں ملے گی۔ کسی بھی وقت **status** لکھیں۔ |
| `statusDraft` | Your application is incomplete — continue where you left off by replying here. | آپ کی درخواست ادھوری ہے — یہیں جواب دے کر جاری رکھیں۔ |
| `statusInReview` | Reference {ref}: under review. We will message you as soon as there is an update. | ریفرنس {ref}: زیرِ جائزہ ہے۔ اپڈیٹ ملتے ہی پیغام بھیجا جائے گا۔ |
| `statusScored` | Reference {ref}: with our loan officer for review. | ریفرنس {ref}: لون آفیسر کے پاس جائزے کے لیے ہے۔ |
| `needsDocs` | Reference {ref}: the loan officer needs one more item:<br><br>**{doc}**<br>{note}<br><br>Please send it here as a photo or PDF. | ریفرنس {ref}: لون آفیسر کو صرف ایک چیز درکار ہے:<br><br>**{doc}**<br>{note}<br><br>براہ کرم یہیں تصویر یا PDF بھیج دیں۔ |
| `redocReceived` | Received — forwarding it to the officer now. | موصول ہو گیا — ابھی آفیسر کو بھیجا جا رہا ہے۔ |
| `approved` | **Mubarak ho.** Reference {ref}: your loan of **PKR {amount}** has been approved. The branch will contact you to complete signing. | **مبارک ہو۔** ریفرنس {ref}: آپ کا **{amount} روپے** کا قرض منظور ہو گیا ہے۔ دستخط کے لیے برانچ آپ سے رابطہ کرے گی۔ |
| `rejected` | Reference {ref}: we are unable to offer a loan at this time. You may re-apply after 3 months, and your record here is retained. Thank you for choosing Aitbaar. | ریفرنس {ref}: اس وقت قرض ممکن نہیں۔ ۳ ماہ بعد دوبارہ درخواست دے سکتے ہیں، آپ کا ریکارڈ محفوظ رہے گا۔ اعتبار کا انتخاب کرنے کا شکریہ۔ |
| `help` | Current step: {step}<br>Commands: **status** (check application) · **restart** (start over) | موجودہ مرحلہ: {step}<br>کمانڈز: **status** (درخواست دیکھیں) · **restart** (دوبارہ شروع کریں) |
| `restartConfirm` | Start over? Your current progress will be lost. Reply **YES** to restart. | دوبارہ شروع کریں؟ موجودہ پیشرفت ختم ہو جائے گی۔ **HAAN** لکھیں۔ |
| `invalidNumber` | Please reply with a number, e.g. 400000. | براہ کرم صرف نمبر لکھیں، مثلاً 400000۔ |
| `noApplication` | No application found for this number yet. Reply **loan** to start one. | اس نمبر سے ابھی کوئی درخواست نہیں ملی۔ شروع کرنے کے لیے **loan** لکھیں۔ |
| `fallback` | Sorry, that wasn't understood. {reprompt} | معذرت، سمجھ نہیں آیا۔ {reprompt} |
| `backendDown` | We are experiencing a technical issue. Please try again shortly. | تکنیکی مسئلہ درپیش ہے۔ چند منٹ بعد دوبارہ کوشش کریں۔ |

Note on the summary block (`summaryText()` in `flow.js`) — extend it to also print the new fields (legal structure, employees, expenses, existing loans, tenor), still with bold labels, no glyphs.

---

## 2. Visual redesign

**Icons — no emoji as UI chrome.** Replace every emoji used as a button/icon (📎 📷 😊 📹 📞 ⋮ ➤) with real icon components. The dashboard already uses `lucide-react` (see `dashboard/package.json`) — use the same library here for visual consistency across the two surfaces:

| Current | Replace with | Notes |
|---|---|---|
| 📎 attach | `Paperclip` (lucide) | opens the real file picker (already wired on `main`) |
| 📷 camera/specimen fallback | `Camera` (lucide) | sends the next canned specimen doc — keep the fallback behavior, just re-icon it |
| 😊 emoji picker | **remove entirely** | it's decorative, does nothing, and directly conflicts with "no emojis" — don't just re-icon it, cut it |
| 📹 video call | `Video` (lucide) | non-functional in this demo — either make it show a small "not available in this prototype" toast on click, or leave inert; don't leave it silently dead with no affordance either way |
| 📞 voice call | `Phone` (lucide) | same as above |
| ⋮ menu | `MoreVertical` (lucide) | can stay inert, it's a standard trailing affordance |
| ➤ send | `Send` (lucide) | |

Also: convert every icon from a bare `<span onclick=...>` to a real `<button>` with an `aria-label` (`aria-label="Attach a document"`, etc.) and adequate padding for a real tap target (min ~40×40px). Right now these are unlabeled spans, invisible to screen readers and to keyboard navigation.

**Branding — make it Aitbaar's, not a WhatsApp reskin.**
- `<title>` — change from `WhatsApp` to `Aitbaar`.
- Header avatar circle (currently a plain "A" initial) → use the icon mark from `docs/assets/aitbaar-logo.png` (the navy/gold arrow mark, not the full text lockup) cropped to a circle.
- Chat wallpaper — replace the default WhatsApp dot-doodle SVG background with a very subtle (~3–5% opacity) tiled watermark of the Aitbaar mark, so it reads as branded without competing with message text.
- Brand palette, sampled from the logo: deep navy (`#1B2A4A`-ish) and gold (`#C9A227`-ish). Use these for the header bar and primary actions (send button, active states) instead of WhatsApp's default green — keep enough of the WhatsApp visual grammar (bubble shapes, tick marks, layout) that it's still legible as "a WhatsApp thread," just unmistakably Aitbaar's.

**Phone bezel.** Wrap the existing `.app` chat card in a phone frame so it reads as "this is a phone screen" on a projector/laptop during judging, not "this is a webpage that looks like an app": rounded outer frame (~40px corner radius), a dark bezel border (~10–14px), a notch/pill cutout at top center, thin decorative side-button marks, and a home-indicator bar at the bottom. This is a pure CSS wrapper around the current markup — it shouldn't require touching the chat logic.

---

## 3. Interaction & robustness fixes

- **Input lock while waiting for a reply.** Right now nothing stops the user from sending a second message before the first response lands — this produces visibly out-of-order bubbles (reproduced during testing: two "me" messages appeared back-to-back before either bot reply rendered). Disable the text input, send button, and attach/camera buttons between request and response; re-enable when the reply arrives. Hook this into the existing `typing()` state.
- **Session persistence.** The demo phone number is generated fresh (`'92' + Math.random()`) on every page load, so a refresh silently restarts the entire application under a new identity. Persist the generated phone number in `localStorage` so a refresh resumes the same session instead of starting over — important since this will get refreshed by accident during judging/demoing.
- **Upload feedback.** Document extraction (real Gemini vision call) can take several seconds, especially for denser documents like bank statements. Show a specific in-progress state ("Reviewing document…") rather than the bare `•••` typing dots with no context, so it's clear something is happening and not stuck.
- **Error recovery.** Connection/backend errors currently render a dead-end message with no way to recover. Add a retry affordance that resends the last action rather than requiring the user to retype everything.

---

## 4. The 10 business questions — why each one

The old 5 questions (business type, years trading, monthly sales, amount, purpose) skipped the single most important underwriting signal a bank actually needs: whether the applicant already has other debt. The new set maps to real requirements from the State Bank of Pakistan's Prudential Regulations for SME Financing (worth citing to judges — it shows this wasn't just copy-polish, it's grounded in what a bank is required to ask):

1. **Legal structure** — sole proprietor / partnership / company (SBP's own Borrower's Basic Fact Sheet leads with "Business Status")
2. Business type/sector
3. Years in operation
4. **Number of employees** — this is literally SBP's small-enterprise threshold test (≤50 employees *and* ≤PKR 150M turnover = "Small Enterprise", per Regulation SE R-1)
5. Average monthly sales
6. **Average monthly business expenses** — turns "monthly sales" from a vanity top-line number into a real net-cash-flow signal
7. **Existing loans/credit outstanding, with any bank or lender** — required per SBP Regulation SME R-2(ii) (banks must reconcile a credit-bureau/e-CIB check against the applicant's declared facilities); this is the biggest gap the old flow had
8. Requested loan amount
9. **Requested repayment period (tenor)** — every real loan application asks for this; the old flow never collected it
10. Loan purpose

Full copy for these is in the `strings.js` table in §1. Exact code path: extend the `Q_*` states in `flow.js` between `CONSENT` and `Q_PURPOSE`.

Scope note: questions 6 and 7 only become useful for the actual score once `backend/app/engine/scoring.py` consumes them as features. For this round, get them visible in the applicant flow and the officer's one-page brief (already valuable, already credible) — treat feeding them into the XGBoost feature set as a fast-follow, not something that should block this UI work.

---

## 5. Document checklist — required vs. optional

Keep the **3 required documents exactly as they are** — that's the low-friction promise of the whole product, don't touch it. Add a small optional/conditional tier on top:

| Document | Tier | Trigger | Backend work needed |
|---|---|---|---|
| CNIC (front) | **Required** | always | none — unchanged |
| Bank statement **or** JazzCash/Easypaisa statement, last 6 months | **Required** | always | none — same `DocumentType.bank_statement`, just widen the prompt/copy to accept either; a mobile wallet statement and a bank statement serve the identical purpose (proof of cash flow), so this does **not** need a new document type |
| Electricity/gas bill | **Required** | always | none — unchanged |
| Business registration proof (NTN certificate, trade license, partnership deed, or trade body membership) | **Optional** | offered after the 3 required docs, skippable | new `DocumentType` enum value + extraction prompt — **needs backend coordination** |
| Property ownership document or rent agreement (business premises) | **Conditional** | only requested if `amount ≥ PKR 5,000,000` (this lines up with SBP's clean-facility limit in Regulation R-8 — above that, a facility needs to be secured) | new `DocumentType` enum value + extraction prompt — **needs backend coordination** |
| Tax return / audited financial statement | **Deferred — not in applicant flow** | only via the officer's existing `needs_docs` request path, for large tickets | none for this round — SBP does not require audited accounts below PKR 15M exposure (Regulation SE R-3), so building this into the day-1 applicant flow would be over-collecting for the ticket sizes this prototype targets |

**Do not add a "proof of income" document.** For an SME owner that's already covered by the bank/wallet statement plus the business questions — a separate document with that label would be redundant paperwork against the product's own low-friction pitch.

Items marked "needs backend coordination" touch `backend/app/models/schemas.py` (the `DocumentType` enum) and `backend/app/engine/extraction.py` (a new prompt per type) — per the repo's own workflow rule, any change there must update `docs/api.md` in the same commit. Loop in whoever owns the backend engine before wiring the frontend prompts for these two.

---

## 6. Out of scope for this pass

- Feeding the new questions (expenses, existing loans) into the actual scoring model — fast-follow once the UI/flow ships.
- Automated extraction for tax returns/audited financials — officer-triggered only, no extraction prompt needed yet.
- Anything to do with `backend/data/uploads` git hygiene / history — being handled separately, not a frontend concern.
