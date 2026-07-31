# Demo Runbook — one person can run the whole show

The submitted 5-step demo journey, mapped to exact operator actions. Rehearse twice, record once.

## Setup (once, before recording/judging)

| # | Action | Where | Time |
|---|---|---|---|
| 1 | Deploy backend: Railway → New Service → repo, root dir `backend/`, add env `OPENROUTER_API_KEY` | railway.app | 10 min |
| 2 | Deploy bot: Railway → New Service → repo, root dir `whatsapp-bot/`, **add Volume mounted at `/data`**, env `BACKEND_API_URL=<backend url>` | railway.app | 10 min |
| 3 | Link number: open `<bot-url>/qr`, scan with the sach batao phone (Linked devices) — once | phone + browser | 2 min |
| 4 | Deploy dashboard: Vercel → New Project → repo, root dir `dashboard/`, env `VITE_API_URL=<backend url>` | vercel.com | 5 min |
| 5 | Sanity: `<backend-url>/health`, `<bot-url>/health` (`ready`), dashboard queue loads | browser | 2 min |
| 6 | **`GET <backend-url>/demo/reset`** — re-seeds the 3 demo applicants, freshly scored | browser | 1 min |

No Railway/Vercel accounts needed beyond free tier. If Railway build fails on the bot, check the volume is mounted at `/data` and redeploy.

## The 5 demo steps (from the Prototype Blueprint)

**Cast: your phone = SME owner "behind his counter". Browser = UBL loan officer.**

1. **Apply on WhatsApp** — send `loan` to the bot number → choose اردو → the bot sends the FULL document checklist + consent in one message (⭐ say out loud: "no discovered checklist — everything up front"). Reply HAAN, answer name/business + 5 questions (⭐ years trading and monthly sales feed the scoring model directly; trimmed from an earlier 10-question version so the demo doesn't lose the room).
2. **Send documents** — photo of (mock) CNIC, bank statement, utility bill. Bot confirms each, shows summary → SUBMIT → reference number + "no branch visit needed."
3. **Switch to dashboard** — the application is already in the queue (it polls every 5s) and moves on its own: `submitted → processing → scored` (pipeline auto-runs on submit). Don't touch anything, let judges watch it move.
4. **Open the file** — one-page brief: credit score /100, risk tier, recommended limit, SHAP factor bars, rationale, amount-cap breakdown, e-CIB check. Click the Documents tab (extracted fields per doc), then Audit Trail tab (⭐ "every decision reconstructable").
5. **Decide** — Approve the clean file → phone buzzes on its own with the Urdu "Mubarak ho" message, no need to check status. Then open the pre-loaded fraud-flag file (from `/demo/reset`), point at the name-mismatch warning, click **Request Documents** → pick bank statement + note → phone buzzes asking for exactly that one item, unprompted.

Total ≤ 3 minutes once rehearsed. The applicant's phone updates itself within a few seconds of the officer's click either way (⭐ "the applicant never has to ask — it just arrives") — no need to send `status` to force a check anymore.

## Failure modes

| Symptom | Fix |
|---|---|
| Bot `/health` says `disconnected` | Railway → bot service → Restart. Session restores from the volume. Worst case: wipe volume, redeploy, rescan QR |
| Application stuck in `processing` | open the file → "Run AI Assessment" re-triggers; check backend logs for OpenRouter errors — without a key it falls back to templates, so set `OPENROUTER_API_KEY` |
| Dashboard empty / error banner | `VITE_API_URL` wrong (rebuild on Vercel after fixing env) or backend asleep — hit `/health` first |
| Queue polluted from rehearsal | `GET /demo/reset` |

## Still to add to the deliverables sheet before submission

Repo link (`https://github.com/codewithfourtix/aitabaar`) · live dashboard URL · WhatsApp demo number + QR image · demo video link.
