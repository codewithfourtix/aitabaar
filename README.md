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
# Backend API — real engine (extraction/verification/scoring/rationale), no DB required
cd backend
python -m venv .venv && source .venv/Scripts/activate  # Windows Git Bash; use .venv/bin/activate on macOS/Linux
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# WhatsApp bot
cd whatsapp-bot
pip install -r requirements.txt
uvicorn main:app --reload --port 8001
```

Copy `.env.example` to `.env` in each service folder and fill in keys (never commit `.env`). The backend works without `OPENROUTER_API_KEY` set — extraction/brief stages fall back to templates instead of crashing — but real vision extraction needs it.

The trained model (`backend/models/aitbaar_xgb.json`, `features.json`) ships committed, so a fresh clone runs immediately. To regenerate it: `python data/generate.py && python models/train.py` (from `backend/`).

On boot the backend seeds and scores 3 demo applicants (clean approve / borderline / name-mismatch fraud flag). Hit `GET /demo/reset` any time to re-seed and re-score them — handy right before a judging run.

## API contract

The dashboard and bot build against the REST API defined in [`docs/api.md`](docs/api.md) and `backend/app/models/schemas.py`. **Change the contract there first, then tell the team.** Mock data is served by the backend so frontend work never blocks on the AI engine.

## Deployment

Railway — one service per folder (set the service root directory to `backend/`, `whatsapp-bot/`, etc.).

### Deploying the backend to Railway (step by step)

1. Go to [railway.app](https://railway.app), sign in (GitHub login is easiest), and create a project: **New Project → Deploy from GitHub repo** → pick this repo (`codewithfourtix/aitabaar`). Authorize Railway's GitHub app if prompted.
2. Railway will try to build the whole monorepo — tell it to only build the backend: open the new service → **Settings → Root Directory** → set to `backend`.
3. Same **Settings** tab → **Build**: Railway auto-detects Python from `requirements.txt`; the default build command is fine. **Deploy → Start Command**, set it to:
   `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. **Variables** tab → add every backend key from `.env.example`: `OPENROUTER_API_KEY`, `OPENROUTER_VISION_MODEL`, `OPENROUTER_TEXT_MODEL`, `DASHBOARD_ORIGIN` (set this to your deployed dashboard's Vercel URL once that exists, e.g. `https://aitabaar.vercel.app`). Leave `DATABASE_URL` empty — no DB for the demo.
5. **Settings → Networking → Generate Domain** to get a public `https://....up.railway.app` URL. This is the URL to send Ali Zulfiqar (`BACKEND_API_URL`) and Ali Ateeb (`VITE_API_URL`).
6. Push to `stage` (never `main`) — Railway redeploys automatically on every push to the branch you connected. Pick `stage` as the deploy branch in **Settings → Source**.
7. Sanity check after each deploy: `GET https://<your-url>/health` should return `{"status": "ok", ...}`, then `GET /demo/reset` to confirm the engine runs on Railway's infra (not just locally).

One thing to know: the in-memory store resets on every redeploy/restart — don't redeploy in the window right before or during a demo; use `/demo/reset` instead if you need fresh state.
