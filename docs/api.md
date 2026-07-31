# API Contract

Base URL (dev): `http://localhost:8000` · Interactive docs: `/docs` (Swagger, auto-generated)
Shapes source: `backend/app/models/schemas.py` — **this file and that file must always match** (see [docs/README.md](README.md) for the change process).

All bodies are JSON unless noted. All timestamps are UTC ISO-8601. Amounts are integer PKR.

## Endpoint index

| # | Method | Path | Used by | Status |
|---|---|---|---|---|
| 1 | GET | `/health` | everyone | ✅ live |
| 2 | GET | `/applications` | dashboard | ✅ live |
| 3 | GET | `/applications/{id}` | dashboard, bot | ✅ live |
| 4 | POST | `/applications` | bot, portal | ✅ live |
| 5 | POST | `/applications/{id}/documents` | bot, portal | ✅ live (real: persists file, runs real extraction during `/score`) |
| 6 | POST | `/applications/{id}/submit` | bot, portal | ✅ live |
| 7 | POST | `/applications/{id}/score` | dashboard (demo trigger) | ✅ live (real engine: extract → verify → score → decide → explain) |
| 8 | POST | `/applications/{id}/decision` | dashboard | ✅ live |
| 9 | GET | `/demo/reset` | judging/demo | ✅ live |

Backed by an in-memory store (no DB for the hackathon demo — [decisions.md](decisions.md)), seeded with 3 demo applicants (clean approve / borderline / name-mismatch fraud flag) and re-seedable via `GET /demo/reset`. Uploaded files persist to local disk (`backend/data/uploads/`, gitignored) — not durable across redeploys, fine for a single demo run.

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

`multipart/form-data`: field `type` ∈ `cnic | bank_statement | utility_bill | business_questionnaire | business_registration | property_document`, field `file` = the upload (jpg/png/pdf).

Document tiers, as the applicant flow collects them (`docs/whatsapp-bot-flow.md`):

| `type` | Tier | When |
|---|---|---|
| `cnic` | required | always |
| `bank_statement` | required | always — accepts a **bank statement or a JazzCash/Easypaisa statement**; both are proof of cash flow, so they share one type |
| `utility_bill` | required | always |
| `business_questionnaire` | required | JSON, uploaded once the 10 questions are answered |
| `business_registration` | optional | offered after the 3 required docs; applicant may reply `SKIP` |
| `property_document` | conditional | only requested when `requested_amount_pkr >= 5000000` (SBP R-8 clean-facility limit) |

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

→ `403` `{"detail": "Consent not given for this application"}` if `applicant.consent_given` is false.

File persists to local disk (no Supabase for the demo). Extraction runs later during `/score`, not on upload, so this stays fast — except `business_questionnaire`, which is a JSON body (not an image) and is parsed immediately, filling `extracted_fields` right away.

## 6. `POST /applications/{id}/submit`

No body. Applicant says "done uploading". → `200` `Application` with `status: "submitted"`, audit event appended.

**The engine pipeline auto-runs as a background task after submit** — the response returns immediately, then the application moves `processing → scored` (or `failed`) on its own within ~60s. `POST /score` remains as the manual (re-)trigger for the dashboard.

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
    "inconsistency_flags": [],
    "recommended_action": "APPROVE",
    "decision_reasons": ["Risk tier B — default policy is APPROVE."],
    "policy_overridden": false,
    "override_reason": null,
    "data_completeness": 1.0,
    "defaulted_fields": [],
    "completeness_band": "HIGH"
  }
}
```

Real engine: extraction (Gemini vision via OpenRouter) → verification (deterministic + `rapidfuzz`) → scoring (XGBoost, trained on `data/synthetic_sme.csv`) → **decision policy** (`app/engine/policy.py`, deterministic, reads `risk_tier` + verification flags only) → rationale (template, LLM-enhanced). One `AuditEvent` per stage. `risk_tier` ∈ `A | B | C | D`. If any stage throws, `status` becomes `failed` and the reason lands in `audit_trail` — the app is still returned (never hangs), just without a `score`.

**Decision policy fields** (`recommended_action`, `decision_reasons`, `policy_overridden`,
`override_reason`) are a recommendation only — they never change `repayment_probability` or
`risk_tier`, and they never move `Application.status`; only `POST /applications/{id}/decision`
does that (§8). Rules: any `HIGH`-severity (or unrecognized-severity) verification flag forces
`recommended_action: "REVIEW"` with `policy_overridden: true` and `override_reason` naming the
flag(s) — this can never be `"APPROVE"`. With no `HIGH`/unrecognized flag, a tier that would
otherwise approve (A/B) is soft-downgraded to `"REVIEW"` with `policy_overridden: false` (a
nudge, not an override) if either a `MEDIUM` flag is present **or** `data_completeness` is
below 0.6 — both reasons are listed in `decision_reasons` if both apply. Otherwise: tier A/B →
`"APPROVE"`, tier C → `"REVIEW"`, tier D → `"DECLINE"`.

**Data completeness fields** (`data_completeness`, `defaulted_fields`, `completeness_band`) —
set by `app/engine/scoring.py`, read (not written) by the policy layer. `data_completeness` is
the fraction (0–1) of the model's document-sourced input fields that came from a real extracted
value rather than a training-set median fallback; `defaulted_fields` names which ones fell
back; `completeness_band` is `"HIGH"` (≥0.8), `"MEDIUM"` (≥0.6), or `"LOW"` (<0.6). Fields
sourced from the applicant/application record directly (business type, requested amount) are
not counted — only fields that depend on document extraction are.

**Offline/deterministic mode:** setting env var `AITABAAR_OFFLINE=1` on the backend makes the
rationale stage always use the template brief and skip the live LLM call (no network, no API
key needed) for the normal upload/score flow. `GET /demo/reset` (§9) always behaves this way
regardless of that env var, so a judging run never depends on a live LLM call.

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

## 9. `GET /demo/reset`

No params. Clears the store and re-seeds the 3 demo applicants, running each through the real pipeline (not canned data) so the queue shows genuinely computed scores. Rationale always uses the template brief here (no live LLM call), so results are identical every run and need no network or API key. → `200` array of the 3 scored `Application`s. Plain GET so it's one click before a judging run.

---

## Errors

FastAPI defaults: `404` `{"detail": "..."}` · `422` validation errors `{"detail": [{loc, msg, type}, ...]}` · `403` on document upload without consent. No auth in hackathon scope ([decisions.md](decisions.md) #8).

## PLANNED (do not build against until moved to ✅ and implemented)

| Method | Path | What | Needed by |
|---|---|---|---|
| GET | `/applications/{id}/documents/{doc_id}/file` | serve the stored file to the dashboard doc viewer | dashboard |
| POST | `/notify` (on bot, not backend) | backend→bot push on status change (until then: bot polls) | bot |
| POST | `/core-banking/disburse` | **mock Temenos stub** — marks exactly where UBL loan origination connects; logs and returns a fake booking ref | demo/pitch |
