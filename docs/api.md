# API Contract

Base URL (dev): `http://localhost:8000` · Interactive docs: `/docs` (Swagger, auto-generated)
Shapes source: `backend/app/models/schemas.py` — **this file and that file must always match** (see [docs/README.md](README.md) for the change process).

All bodies are JSON unless noted. All timestamps are UTC ISO-8601. Amounts are integer PKR.

## Endpoint index

| # | Method | Path | Used by | Status |
|---|---|---|---|---|
| 1 | GET | `/health` | everyone | ✅ live (mock) |
| 2 | GET | `/applications` | dashboard | ✅ live (mock) |
| 3 | GET | `/applications/{id}` | dashboard, bot | ✅ live (mock) |
| 4 | POST | `/applications` | bot, portal | ✅ live (mock) |
| 5 | POST | `/applications/{id}/documents` | bot, portal | ✅ live (mock — stores metadata only) |
| 6 | POST | `/applications/{id}/submit` | bot, portal | ✅ live (mock) |
| 7 | POST | `/applications/{id}/score` | dashboard (demo trigger) | ✅ live (returns MOCK score) |
| 8 | POST | `/applications/{id}/decision` | dashboard | ✅ live (mock) |

"Live (mock)" = endpoint works, backed by in-memory store seeded with `APP-001` (scored) and `APP-002` (submitted). Engine team swaps internals without changing shapes.

---

## 1. `GET /health`

→ `200` `{"status": "ok", "service": "aitabaar-backend"}`

## 2. `GET /applications`

Dashboard queue. Query params (all optional):

| Param | Type | Meaning |
|---|---|---|
| `status` | `ApplicationStatus` | filter by status |
| `phone` | string | exact match on applicant phone, E.164 (bot uses this to find "my application") |

→ `200` — array of full `Application` objects (see [data-model.md](data-model.md)), newest first.

## 3. `GET /applications/{id}`

→ `200` full `Application` · `404` `{"detail": "Application APP-999 not found"}`

Bot polls this (or uses `?phone=`) for the applicant's status tracker.

## 4. `POST /applications`

Create a draft. Body (`ApplicationCreate`):

```json
{
  "channel": "whatsapp",
  "applicant": {
    "name": "Muhammad Imran",
    "cnic_number": null,
    "phone": "+923001234567",
    "business_name": "Imran General Store",
    "business_type": "Retail / Kiryana",
    "city": "Karachi",
    "language": "ur",
    "consent_given": true
  },
  "requested_amount_pkr": 500000
}
```

→ `201` full `Application` with server-assigned `id` (`APP-XXX`), `status: "draft"`.
`channel` ∈ `whatsapp | portal`. `language` ∈ `en | ur`. `consent_given` **must be true** — the bot/portal collects consent before creating.

## 5. `POST /applications/{id}/documents`

`multipart/form-data`: field `type` ∈ `cnic | bank_statement | utility_bill | business_questionnaire`, field `file` = the upload (jpg/png/pdf).

→ `201` the created `Document`:

```json
{
  "id": "DOC-004",
  "type": "cnic",
  "filename": "cnic_front.jpg",
  "uploaded_at": "2026-07-17T18:00:00Z",
  "extracted_fields": {},
  "verification_flags": []
}
```

Mock mode stores metadata only (file bytes discarded). Real mode: triggers extraction, fills `extracted_fields`. Same shape either way.

## 6. `POST /applications/{id}/submit`

No body. Applicant says "done uploading". → `200` `Application` with `status: "submitted"`, audit event appended.

## 7. `POST /applications/{id}/score`

No body. Triggers the engine. → `200` `Application` with `status: "scored"` and `score` filled:

```json
{
  "score": {
    "repayment_probability": 0.81,
    "risk_tier": "B",
    "recommended_amount_pkr": 400000,
    "factors": [
      {"feature": "avg_monthly_inflow", "label": "Average monthly deposits (PKR 410k)", "impact": 0.14, "direction": "positive"},
      {"feature": "inflow_volatility", "label": "Seasonal dip in deposits (Ramzan months)", "impact": -0.06, "direction": "negative"}
    ],
    "rationale": "Stable retail business with consistent deposits...",
    "inconsistency_flags": []
  }
}
```

Currently returns a MOCK score (copy of APP-001's). Real engine keeps this exact shape. `risk_tier` ∈ `A | B | C | D`.

## 8. `POST /applications/{id}/decision`

Officer action. Body (`DecisionRequest`):

```json
{
  "officer": "Sana Khan",
  "action": "request_docs",
  "note": "Bank statement only covers 3 months, need 6.",
  "requested_doc_types": ["bank_statement"]
}
```

`action` ∈ `approve | reject | request_docs`. → `200` `Application` with status `approved | rejected | needs_docs`, audit event appended. → `422` on unknown action.

On `request_docs`, `requested_doc_types` is stored on the application as `pending_doc_requests` (cleared when the applicant resubmits). The bot reads `pending_doc_requests[0]` to ask for exactly one item.

---

## Errors

FastAPI defaults: `404` `{"detail": "..."}` · `422` validation errors `{"detail": [{loc, msg, type}, ...]}`. No auth in hackathon scope ([decisions.md](decisions.md) #8).

## PLANNED (do not build against until moved to ✅ and implemented)

| Method | Path | What | Needed by |
|---|---|---|---|
| GET | `/applications/{id}/documents/{doc_id}/file` | serve the stored file to the dashboard doc viewer | dashboard |
| POST | `/notify` (on bot, not backend) | backend→bot push on status change (until then: bot polls) | bot |
| POST | `/core-banking/disburse` | **mock Temenos stub** — marks exactly where UBL loan origination connects; logs and returns a fake booking ref | demo/pitch |
