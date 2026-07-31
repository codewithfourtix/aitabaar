# WhatsApp Bot — Conversation Flow Spec

Owner: **Ali Zulfiqar** · Service: `whatsapp-bot/` · Stack: **Node.js + whatsapp-web.js** (per submitted blueprint — zero per-message cost, runs on the sach batao number; production would ride the bank's official WhatsApp Business line)

The bot is a state machine keyed by the applicant's phone number. It talks to the backend only via [api.md](api.md). Urdu-first, English available; all strings live in a `strings` map `{key: {en, ur}}` — no hardcoded text in handlers.

## The one rule that defines the product

**The complete document list is declared up front, in one message, before anything is collected.** The whole pitch is killing the "checklist discovered one item at a time" problem — the bot must never mirror it. Same for re-requests: the officer requests exactly **one** missing item, and the bot asks for exactly that, once.

## States

```
START → LANGUAGE → CONSENT (includes full doc checklist) → QUESTIONS (5) → DOC_CNIC → DOC_BANK → DOC_UTILITY
                       ↓ (declined)                                                                    ↓
                      END                                                                        DOC_OPTIONAL
                                                                                                       ↓
                                                              DOC_PROPERTY (only if amount ≥ PKR 5,000,000)
                                                                                                       ↓
                                       NEEDS_DOCS (officer requested ONE item) ──────────────► CONFIRM → SUBMITTED
```

| State | Bot sends | Accepts | On success → | API call |
|---|---|---|---|---|
| START | greeting (trigger word: "loan" or anything) + what Aitbaar is | anything | LANGUAGE | — |
| LANGUAGE | "English ya اردو?" | choice | CONSENT | — |
| CONSENT | **the complete document checklist (CNIC, 6-month bank *or* JazzCash/Easypaisa statement, utility bill) + the 5 questions preview + consent text**: docs are processed by AI to assess the loan; the officer makes the final decision. Agree / Cancel | choice | QUESTIONS / END | — |
| QUESTIONS | the 5 questions, one at a time (see below) | text/number | DOC_CNIC | `POST /applications` after the last answer (consent_given: true, timestamped consent stored), then the questionnaire as `type=business_questionnaire` |
| DOC_CNIC | "CNIC ki photo bhejein" | image | DOC_BANK | `POST /applications/{id}/documents` `type=cnic` — confirm each file as it lands |
| DOC_BANK | "6 mahine ki bank ya JazzCash/Easypaisa statement — PDF ya photos" | pdf/images | DOC_UTILITY | same, `type=bank_statement` |
| DOC_UTILITY | "Bijli/gas ka bill" | image/pdf | DOC_OPTIONAL | same, `type=utility_bill` |
| DOC_OPTIONAL | business registration proof — **optional**, "reply SKIP to continue" | file *or* SKIP | DOC_PROPERTY if amount ≥ 5,000,000, else CONFIRM | same, `type=business_registration` |
| DOC_PROPERTY | premises ownership proof or rent agreement — **conditional** | image/pdf | CONFIRM | same, `type=property_document` |
| CONFIRM | summary + "Submit?" | choice | SUBMITTED | `POST /applications/{id}/submit` |
| SUBMITTED | "Aapko branch aane ki zaroorat nahi. Status yahin milega — type **status**." | — | — | — |
| NEEDS_DOCS | "Officer ne sirf yeh ek cheez mangi hai: X — <officer note>. Photo bhejein." | file | CONFIRM | `POST .../documents` then `/submit` |

### The 5 questions

An earlier version of this flow asked 10 (each grounded in an SBP Prudential
Regulations intake requirement — see `docs/decisions.md`), trimmed back to 5
so a live demo doesn't lose the audience mid-questionnaire. The 5 kept are
the ones that are either a direct scoring feature or load-bearing for the
loan itself; the 5 cut (legal structure, employees, monthly expenses,
existing loans, tenor) fall back to dataset medians — an honest, documented
degradation, not a silent one (see `backend/data/DATA_CARD.md`).

| # | Question | Why kept | Questionnaire key |
|---|---|---|---|
| 1 | Business type / sector | scoring feature | `business_type` |
| 2 | Years trading | scoring feature, and one of `data/DATA_CARD.md`'s top label drivers | `years_in_business` |
| 3 | Average monthly sales (PKR) | scoring feature; also drives SBP segment classification and the affordability gate | `monthly_revenue_pkr` |
| 4 | Requested amount (PKR) | drives the amount-cap cascade and the conditional premises document at ≥5,000,000 | on the Application itself |
| 5 | Loan purpose | officer context, narrates the credit brief | `loan_purpose` |

**Key names are load-bearing.** `scoring.py`'s `_FIELD_SOURCES` reads specific keys off the questionnaire document; anything it cannot find falls back to a dataset median and lowers `data_completeness`. `employees`, `has_existing_loan`, `registered`, `premises_owned`, `years_at_premises` and `existing_installment_pkr` are all real model features not currently collected by this 5-question intake — they stay on median fallback until/unless a future pass re-adds them.

## Tone

Bank-grade register, not consumer chat. **No decorative glyphs in any string** — what would be an emoji status marker is a bold text label instead (`*Received:* CNIC`, never `✅ CNIC received`). "Assalam o Alaikum" and "Mubarak ho" stay: that is standard formal Pakistani banking register. The applicant is being told about a financial decision, so exclamatory copy reads as unserious next to it.

## Global commands (any state)

`status` / `اسٹیٹس` → `GET /applications?phone={phone}` → status message · `help`/`madad` → current step + example · `restart` → confirm then back to LANGUAGE · unrecognized → repeat current question with an example.

## Status messages

| Backend status | Bot tells applicant |
|---|---|
| `draft` | "Application adhoori hai — X of Y steps. Continue?" |
| `submitted` / `processing` | "Zair-e-jaiza. Hum yahin update denge." |
| `scored` | "Loan officer review kar rahe hain." — **never reveal score/tier/factors** |
| `needs_docs` | the ONE requested item + officer note → NEEDS_DOCS |
| `approved` | "Mubarak ho. PKR X approved. Branch aap se raabta karegi." |
| `rejected` | polite decline + reapply-after-3-months path. No score details. |

## Implementation notes

- **Deployment: Docker on Railway with a volume.** The container runs Chromium + whatsapp-web.js; `LocalAuth` stores the session at `SESSION_DIR=/data/wwebjs_auth` on a Railway volume, so **redeploys do not log the number out**. Linking is done in the browser: open the service's `/qr` page and scan once. Runbook: `whatsapp-bot/README.md`.
- The bot is a long-running Node process — no webhook, no tunnel, no Meta app.
- State store: in-memory `{phone: {state, lang, appId, data}}` — resets on restart, acceptable for demo (Redis only if restarts bite).
- Media: download incoming media via whatsapp-web.js, forward to backend as multipart (`POST .../documents`). Questionnaire answers upload as a JSON document (`type=business_questionnaire`).
- One-item re-request: bot reads `pending_doc_requests[0]` from the application (set by the officer's `request_docs` decision).
- Status change notification: bot polls every 5s for applications that are SUBMITTED **or** NEEDS_DOCS (an officer can approve/reject before a re-requested document is re-uploaded — stopping at NEEDS_DOCS would silently drop that push) and pushes approved/rejected/needs-docs outcomes; backend→bot push is still PLANNED for something better than polling. The web demo (`websim.js`) reuses this exact poller via a fake "client" that queues the message for the browser's own short-interval poll instead of sending over WhatsApp.
- Demo consent + checklist message is the judges' first screen — make the Urdu copy excellent.

## Demo path (from the submitted blueprint, ≤3 min)

1. "loan" → Urdu reply with **full checklist up front** + consent captured & timestamped.
2. 5 answers → CNIC photo, bank/wallet statement PDF, utility bill, skip the optional registration doc → reference number, "no branch visit needed."
3. Officer side: file moves Extracting → Verifying → Scoring → Brief ready; approves clean file; requests ONE doc on the fraud-flag file.
4. Applicant receives outcome (or the single missing item) on WhatsApp in Urdu.
