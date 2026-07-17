# API Contract

Source of truth for shapes: `backend/app/models/schemas.py`. Interactive docs: run the backend and open http://localhost:8000/docs

## Endpoints

| Method | Path | What |
|---|---|---|
| GET | `/health` | liveness |
| GET | `/applications?status=` | queue for the dashboard |
| GET | `/applications/{id}` | full application: docs, score, audit trail |
| POST | `/applications` | create draft (bot/portal) — body: `ApplicationCreate` |
| POST | `/applications/{id}/submit` | applicant finished uploading |
| POST | `/applications/{id}/score` | trigger AI engine (mock for now) |
| POST | `/applications/{id}/decision` | officer action — body: `DecisionRequest` (approve / reject / request_docs) |

TODO (engine team): `POST /applications/{id}/documents` file upload → extraction.

## Statuses

`draft → submitted → processing → scored → approved | rejected`, plus `needs_docs` loop back to applicant.

## Rule

**Change `schemas.py` first, then update this file, then tell the group.** Frontends build against mock data, never block on the engine.
