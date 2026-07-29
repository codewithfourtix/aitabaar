# Decision Log

Why things are the way they are. Add a row when a real decision is made (group chat or call), newest on top.

| # | Date | Decision | Why | Owner |
|---|---|---|---|---|
| 18 | 2026-07-18 | Backend engine build stays on the **in-memory store** (no Supabase) for the hackathon submission — supersedes #14 for the demo timeline; `GET /demo/reset` re-seeds + re-scores the 3 demo applicants on demand | same-day deadline (submission 2026-07-19 9PM PKT); in-memory is enough for a live demo process and adding Supabase wiring risked the remaining hours better spent on the actual pipeline (extraction/verification/scoring/brief) | Anas |
| 17 | 2026-07-18 | Bot ships as a Docker container on Railway with a **volume at `/data`** for the WhatsApp session; linking via a web **`/qr`** page | session survives redeploys (scan once); no terminal access needed on Railway | Ali Z |
| 16 | 2026-07-18 | Official spelling **"Aitbaar" (اعتبار)** in all user-facing text and deliverables (repo name stays `aitabaar`) | matches submitted Team Information sheet | team |
| 15 | 2026-07-18 | WhatsApp channel = **whatsapp-web.js on Node.js**, not Meta Cloud API | zero per-message cost for prototype; production rides UBL's existing WhatsApp Business number anyway | team (deliverables sheet) |
| 14 | 2026-07-18 | DB/storage = **Supabase** (Postgres + Storage); dashboard deploys on **Vercel**; backend stays FastAPI on Railway | per submitted Prototype Blueprint | team |
| 13 | 2026-07-18 | Extraction LLM = **Gemini vision** | per submitted blueprint; team familiarity | Anas |
| 12 | 2026-07-18 | Demo = 3 pre-loaded synthetic files (clean approve / borderline / name-mismatch fraud flag) + one fresh file processed live <60s; ~1,000 synthetic SME records from a documented Python generator | blueprint demo journey; synthetic-only data stated openly | team |
| 11 | 2026-07-18 | Bot sends the **complete document checklist up front in one message**; officer re-requests exactly **one** item | killing the "discovered checklist" loop IS the product; deliverables promise it explicitly | team |
| 10 | 2026-07-17 | Docs in `docs/` are the source of truth; code follows docs | prevent integration conflicts with 4 parallel builders | Ali Z |
| 9 | 2026-07-17 | `main` = default + stable, `stage` = integration branch, features → stage → main | test together before promoting; simple enough for 72h | Ali Z |
| 8 | 2026-07-17 | No auth/login anywhere in hackathon scope | zero demo value, real cost; officer name is a text field | team |
| 7 | 2026-07-17 | Bot polls for status updates; backend→bot push (`/notify`) only if time allows | polling is 10 lines and demo-sufficient | Ali Z |
| 6 | 2026-07-17 | Backend serves seeded mock data + mock score from day 1 | dashboard/bot never block on the AI engine | — |
| 5 | 2026-07-16 | WhatsApp bot = separate service (`whatsapp-bot/`), not a backend router | independent deploy/restart, clear ownership, proves the API | — |
| 4 | 2026-07-16 | Monorepo (this repo) over multiple repos | one API contract, one clone, folder ownership, Railway supports per-folder services | Ali Z |
| 3 | 2026-07-16 | Deploy on Railway; DB = Railway Postgres when needed (in-memory until then) | whiteboard decision; free tier fits demo | Anas |
| 2 | 2026-07-16 | Task split: Anas+Obaid engine · Ali Ateeb dashboard · Ali Z WhatsApp bot · abay research+slides | per WhatsApp group discussion | Anas |
| 1 | 2026-07-14 | Idea: **Aitabaar** — AI-assisted SME loan origination; XGBoost+SHAP scoring, vision-LLM doc extraction, officer stays in the loop | whiteboard session (see architecture-whiteboard.jpeg); fits UBL themes 1 & 5 | Anas+Obaid |

## Open questions (answer → move up as decisions)

- Bot state store: stays in-memory, or Redis if restarts bite during demo?
- Synthetic data generator: exact feature distributions and default-rate assumptions (anchored to SBP NFIS 2024-28 / SMEDA / PBA figures — abay's research feeds this).
- Who hosts the whatsapp-web.js bot process during the demo (needs a machine that stays online with the session logged in)?
