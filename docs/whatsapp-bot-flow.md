# WhatsApp Bot — Conversation Flow Spec

Owner: **Ali Zulfiqar** · Service: `whatsapp-bot/` · Stack: **Node.js + whatsapp-web.js** (per submitted blueprint — zero per-message cost, runs on the sach batao number; production would ride the bank's official WhatsApp Business line)

The bot is a state machine keyed by the applicant's phone number. It talks to the backend only via [api.md](api.md). Urdu-first, English available; all strings live in a `strings` map `{key: {en, ur}}` — no hardcoded text in handlers.

## The one rule that defines the product

**The complete document list is declared up front, in one message, before anything is collected.** The whole pitch is killing the "checklist discovered one item at a time" problem — the bot must never mirror it. Same for re-requests: the officer requests exactly **one** missing item, and the bot asks for exactly that, once.

## States

```
START → LANGUAGE → CONSENT (includes full doc checklist) → QUESTIONS (5) → DOC_CNIC → DOC_BANK → DOC_UTILITY → CONFIRM → SUBMITTED
                       ↓ (declined)                                                                                  ↑
                      END                                         NEEDS_DOCS (officer requested ONE item) ───────────┘
```

| State | Bot sends | Accepts | On success → | API call |
|---|---|---|---|---|
| START | greeting (trigger word: "loan" or anything) + what Aitbaar is | anything | LANGUAGE | — |
| LANGUAGE | "English ya اردو?" (buttons) | choice | CONSENT | — |
| CONSENT | **the complete document checklist (CNIC photo, 6-month bank statement, utility bill) + the 5 questions preview + consent text**: docs are processed by AI to assess the loan; the officer makes the final decision. Agree / Cancel | choice | QUESTIONS / END | — |
| QUESTIONS | the 5 questions, one at a time: **business type → years trading → monthly sales (PKR) → amount needed (PKR) → purpose** | text/number | DOC_CNIC | `POST /applications` after last answer (consent_given: true, timestamped consent stored) |
| DOC_CNIC | "CNIC ki photo bhejein" | image | DOC_BANK | `POST /applications/{id}/documents` `type=cnic` — confirm each file as it lands |
| DOC_BANK | "6 mahine ki bank statement — PDF ya photos" | pdf/images | DOC_UTILITY | same, `type=bank_statement` |
| DOC_UTILITY | "Bijli/gas ka bill" | image/pdf | CONFIRM | same, `type=utility_bill` |
| CONFIRM | summary + reference number + "Submit?" | choice | SUBMITTED | `POST /applications/{id}/submit` |
| SUBMITTED | "Shukriya! Aapko branch aane ki zaroorat nahi. Status yahin milega — type **status**." | — | — | — |
| NEEDS_DOCS | "Officer ne sirf yeh ek cheez mangi hai: X — <officer note>. Photo bhejein." | file | CONFIRM | `POST .../documents` then `/submit` |

## Global commands (any state)

`status` / `اسٹیٹس` → `GET /applications?phone={phone}` → status message · `help`/`madad` → current step + example · `restart` → confirm then back to LANGUAGE · unrecognized → repeat current question with an example.

## Status messages

| Backend status | Bot tells applicant |
|---|---|
| `draft` | "Application adhoori hai — X of Y steps. Continue?" |
| `submitted` / `processing` | "Zair-e-jaiza. Hum yahin update denge." |
| `scored` | "Loan officer review kar rahe hain." — **never reveal score/tier/factors** |
| `needs_docs` | the ONE requested item + officer note → NEEDS_DOCS |
| `approved` | "Mubarak ho! 🎉 PKR X approved. Branch aap se raabta karegi." |
| `rejected` | polite decline + reapply-after-3-months path. No score details. |

## Implementation notes

- **Deployment: Docker on Railway with a volume.** The container runs Chromium + whatsapp-web.js; `LocalAuth` stores the session at `SESSION_DIR=/data/wwebjs_auth` on a Railway volume, so **redeploys do not log the number out**. Linking is done in the browser: open the service's `/qr` page and scan once. Runbook: `whatsapp-bot/README.md`.
- The bot is a long-running Node process — no webhook, no tunnel, no Meta app.
- State store: in-memory `{phone: {state, lang, appId, data}}` — resets on restart, acceptable for demo (Redis only if restarts bite).
- Media: download incoming media via whatsapp-web.js, forward to backend as multipart (`POST .../documents`). Questionnaire answers upload as a JSON document (`type=business_questionnaire`).
- One-item re-request: bot reads `pending_doc_requests[0]` from the application (set by the officer's `request_docs` decision).
- Status change notification: bot polls every 30s for submitted applications and pushes approved/rejected/needs-docs outcomes; backend→bot push is PLANNED.
- Demo consent + checklist message is the judges' first screen — make the Urdu copy excellent.

## Demo path (from the submitted blueprint, ≤3 min)

1. "loan" → Urdu reply with **full checklist up front** + consent captured & timestamped.
2. 5 answers → CNIC photo, bank statement PDF, utility bill → reference number, "no branch visit needed."
3. Officer side: file moves Extracting → Verifying → Scoring → Brief ready; approves clean file; requests ONE doc on the fraud-flag file.
4. Applicant receives outcome (or the single missing item) on WhatsApp in Urdu.
