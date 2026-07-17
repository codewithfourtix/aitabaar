# Loan Officer Dashboard

Owner: **Ali Ateeb**

React app. Scaffold with: `npm create vite@latest . -- --template react`

Talks to the backend API (`VITE_API_URL`, default `http://localhost:8000`).
Contract: `../docs/api.md` + `../backend/app/models/schemas.py`.
Mock data is already served — `GET /applications` returns two seeded SME applications, one fully scored with SHAP factors.

Screens: application queue → application detail (AI credit brief, SHAP factors, source docs, audit trail) → decision (approve / reject / request docs).
