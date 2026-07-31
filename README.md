<p align="center">
  <img src="docs/assets/aitbaar-logo-full.png" alt="Aitbaar (اعتبار) — اعتبار، جو کاروبار بڑھائے" width="400">
</p>

<h1 align="center">Aitbaar | اعتبار</h1>
<p align="center"><i>Trust</i></p>

<p align="center">
  <b>Thematic Area:</b> Artificial Intelligence in Banking &nbsp;·&nbsp; UBL National Innovation Hackathon 2026
</p>

<br>

## Problem Statement

Pakistan's ~5 million SMEs produce roughly **40% of GDP**, yet only **~155,000 (~3%)** hold a formal bank loan, and SMEs receive just **6–7% of private-sector credit** — against 20–30% in comparable economies. The gap is not appetite or creditworthiness. It is process:

- **The document checklist is discovered, not declared.** A loan officer only learns what's missing after reading a file, so requests for "one more paper" arrive one at a time — **3 to 5 branch trips** per application is normal.
- **Every file is read and cross-checked by hand.** 40–60 pages per applicant, extracted and verified manually, so a decision takes **weeks**, and the officer's time — not the bank's risk appetite — is the bottleneck.
- **The cost to assess a file barely changes with its size.** Underwriting a PKR 500,000 request costs an officer nearly as many hours as a PKR 50 million one, so small SME tickets are rationed first.
- **Rejections carry no reason and no record.** The score and reasoning live in one officer's head; two officers can score the same file differently, and a declined applicant rarely reapplies.

The root cause is economic, not technological: assessing an SME file is information-poor and entirely manual, so its cost is disproportionate to the loan size. That single fact — not a lack of demand — explains why only 3% of Pakistan's SMEs hold a bank loan.

<br>

## Solution Overview

**Aitbaar is a two-sided AI credit origination layer** that removes the manual bottleneck without removing the human decision.

**The SME owner** applies entirely on WhatsApp, in Urdu, from behind the counter:
- Receives the **complete document checklist up front** — CNIC, a 6-month bank statement, a utility bill — plus five short business questions, in one message.
- Gives **explicit, timestamped consent** before anything is processed.
- **Zero branch visits** to apply; if something is missing, is told the one exact item, once.

**On the bank side**, a five-stage AI pipeline turns a raw file into a one-page decision:

1. **Extract** — a vision LLM (Gemini) reads the CNIC, bank statement, and utility bill into structured fields.
2. **Verify** — deterministic rules cross-check those fields (CNIC format, CNIC-to-bank-account name match, income consistency, bounced-cheque pattern) and raise flags **before** scoring, so an obvious mismatch never reaches the model unflagged.
3. **Score** — an XGBoost model, trained on a documented 1,000-row synthetic Pakistani SME dataset, returns a repayment probability, a risk tier (A–D), and a recommended loan range.
4. **Explain** — SHAP attributes the score to its top contributing factors.
5. **Brief** — an LLM writes a one-page rationale **strictly from the SHAP output**, never deciding the outcome itself.

**The loan officer** opens a queue of pre-scored applications and reads **one page instead of fifty** — score, risk tier, top factors, fraud flags, recommended amount — then approves, declines, or requests **exactly one** missing document. Every extraction, flag, score, and decision lands in an audit trail, so the officer's judgement stays final and every outcome stays explainable.

### Architecture

```
SME owner ──WhatsApp (Urdu)──► whatsapp-bot (Node)
                                  Twilio Business API webhook, or
                                  whatsapp-web.js + QR (fallback)
                                    │ REST
                                    ▼
                    backend (FastAPI on Railway) ── engine: extract → verify → score → explain → brief
                                    ▲ REST                    (Gemini vision · rules + rapidfuzz ·
                                    │                          XGBoost + SHAP · LLM brief)
Loan officer ──browser──► dashboard (React + Vite on Vercel)
```

| Folder | What | Runs on |
|---|---|---|
| `backend/` | FastAPI API + AI engine, trained model in `models/`, dataset + generator in `data/` | Railway (Dockerfile) |
| `whatsapp-bot/` | Applicant channel; one conversation state machine behind two transports — `CHANNEL=twilio` (recommended, no Chromium) or `CHANNEL=wwebjs` (QR-linked fallback) | Railway (Dockerfile / Dockerfile.twilio) |
| `dashboard/` | Loan officer queue + one-page credit brief + audit trail | Vercel |
| `docs/` | **Source of truth**: API contract, data model, specs, decision log, demo runbook | — |

<br>

## Technology Stack

| Layer | Technology |
|---|---|
| **Applicant channel** | Node.js, Express · Twilio WhatsApp Business API webhook (recommended) or `whatsapp-web.js` + QR (fallback) · axios, dotenv, qrcode, form-data |
| **Backend API** | Python, FastAPI, Uvicorn, Pydantic · python-multipart, httpx, python-dotenv |
| **AI / credit engine** | Gemini vision (document extraction, via OpenRouter) · XGBoost (repayment scoring) · SHAP (factor attribution) · scikit-learn, pandas, numpy · rapidfuzz (fuzzy name-matching for fraud checks) · PyMuPDF (PDF parsing) |
| **Loan officer dashboard** | React 19, Vite, React Router, lucide-react (icons) · Oxlint |
| **Data & storage** | In-memory application store + local filesystem for uploaded documents in the current prototype (Supabase Postgres + Storage is the planned production store — see `docs/decisions.md`) |
| **Hosting** | Backend + WhatsApp bot on Railway (Docker) · Dashboard on Vercel |
| **Build tooling** | Cursor / Claude Code (AI-assisted scaffolding, reviewed by the team) · Figma (dashboard wireframes) · Canva (pitch deck) |

<br>

## Team Members

Team Aitbaar (Lahore):

| Name | GitHub Username | Role |
|---|---|---|
| Muhammad Anas Tahir | [MuhammadAnasTahir](https://github.com/MuhammadAnasTahir) | Lead, AI engine |
| Muhammad Obaidullah | [thesocialobaid](https://github.com/thesocialobaid) | AI engine |
| Ali Ateeb | [Ali-Ateeb](https://github.com/Ali-Ateeb) | Dashboard |
| Ali Zulfiqar | [codewithfourtix](https://github.com/codewithfourtix) | WhatsApp bot |

### Workflow

`main` = stable · `stage` = integration (everything merges here first) · branches `name/feature`. Contract changes touch `backend/app/models/schemas.py` + `docs/api.md` in the same commit. See [`docs/git-workflow.md`](docs/git-workflow.md).

<br>

## Setup / Run Instructions

```bash
# 1. Backend (in-memory store, seeds 3 demo applicants; OPENROUTER_API_KEY optional — falls back to templates)
cd backend && pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# 2. Dashboard
cd dashboard && npm install && npm run dev        # http://localhost:5173

# 3. WhatsApp bot — whatsapp-web.js fallback (needs a phone to scan /qr once)
cd whatsapp-bot && npm install && npm start       # http://localhost:8001/qr
# or the recommended Twilio channel — see whatsapp-bot/README.md for sandbox setup
CHANNEL=twilio npm start

# End-to-end test without WhatsApp (drives the real bot state machine against the API):
cd whatsapp-bot && node test/e2e.js
```

`GET /demo/reset` re-seeds the three demo files (clean approve / borderline / name-mismatch fraud flag) through the real pipeline.

### Deploy + Demo

Follow [`docs/demo-runbook.md`](docs/demo-runbook.md) — setup is ~30 minutes on Railway + Vercel free tiers.

<br>

## Honesty Notes

*(also stated in the deliverables)*

Synthetic data only — no real customer data anywhere. Model metrics (`backend/models/METRICS.md`, AUC 0.780) prove the pipeline works end-to-end, not real-world predictive power; the remedy is a bank pilot on real files. Core banking (Temenos) integration is mocked. **The AI recommends; the officer decides.**
