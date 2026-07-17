# Aitabaar (اعتبار) — Trust

AI-assisted SME loan origination platform. Built for the **UBL National Innovation Hackathon 2026**.

Small businesses in Pakistan struggle to access formal credit: thin credit files, paper-heavy processes, repeat branch visits. Aitabaar lets an SME owner apply from home — via a web portal or a WhatsApp chatbot (English/Urdu) — and gives the loan officer an explainable AI credit brief instead of a pile of documents.

## How it works

```
Applicant (Web Portal / WhatsApp Bot)
        │  CNIC, bank statements, utility bills, business questionnaire
        ▼
AI Engine — 4 stages: Extraction → Verification → Scoring → Rationale
        │  vision LLM doc parsing · XGBoost repayment probability · SHAP explainability
        ▼
Loan Officer Dashboard — application queue, AI credit brief, audit trail, request docs
```

## Repo structure

| Folder | What | Owner |
|---|---|---|
| `backend/` | FastAPI — API + AI engine (extraction, verification, scoring, rationale) | Anas, Obaid |
| `whatsapp-bot/` | WhatsApp applicant channel (webhook service, English/Urdu) | Ali Zulfiqar |
| `dashboard/` | React loan officer dashboard | Ali Ateeb |
| `portal/` | Applicant web portal | TBD |
| `docs/` | Architecture, API contract, canvases, pitch material | abay + all |

## Branch workflow

- **`stage`** — integration branch. All feature branches merge here; everything is tested on `stage`.
- **`main`** — stable. Only updated by merging `stage` when things are verified working.

```
your-name/feature  ──merge──►  stage  ──(when stable)──►  main
```

Branch naming: `<name>/<feature>`, e.g. `ali/whatsapp-flow`, `anas/scoring-engine`.

## Running locally

Each service has its own README. Quick start:

```bash
# Backend API (mock endpoints work out of the box)
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# WhatsApp bot
cd whatsapp-bot
pip install -r requirements.txt
uvicorn main:app --reload --port 8001
```

Copy `.env.example` to `.env` in each service folder and fill in keys (never commit `.env`).

## API contract

The dashboard and bot build against the REST API defined in [`docs/api.md`](docs/api.md) and `backend/app/models/schemas.py`. **Change the contract there first, then tell the team.** Mock data is served by the backend so frontend work never blocks on the AI engine.

## Deployment

Railway — one service per folder (set the service root directory to `backend/`, `whatsapp-bot/`, etc.).
