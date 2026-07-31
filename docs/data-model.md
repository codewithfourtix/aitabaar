# Data Model

Source: `backend/app/models/schemas.py`. Everything below is what the API actually returns.

## Application (the root entity)

| Field | Type | Notes |
|---|---|---|
| `id` | string | server-assigned, `APP-XXX` |
| `channel` | enum | `whatsapp` \| `portal` |
| `status` | enum | see lifecycle below |
| `applicant` | Applicant | embedded |
| `requested_amount_pkr` | int | what the applicant asked for |
| `documents` | Document[] | uploaded docs + extraction results |
| `pending_doc_requests` | DocumentType[] | set by `request_docs` decision, cleared on resubmit; bot asks for `[0]` |
| `score` | ScoreResult \| null | null until engine runs |
| `ecib_check` | ECIBCheck \| null | null until engine runs — Regulation R-7, **mocked**, see below |
| `audit_trail` | AuditEvent[] | append-only, never edited |
| `created_at`, `updated_at` | datetime | UTC |

## Status lifecycle

```mermaid
stateDiagram-v2
    [*] --> draft: POST /applications
    draft --> submitted: /submit (all docs in)
    submitted --> processing: engine picks up
    processing --> scored: engine done
    scored --> approved: officer decision
    scored --> rejected: officer decision
    scored --> needs_docs: officer requests docs
    needs_docs --> submitted: applicant re-uploads via bot
```

`draft → submitted → processing → scored → approved | rejected`, with `needs_docs` looping back, plus **`failed`** (any pipeline stage can land here — the reason is recorded in `audit_trail`, the application is still returned rather than left hanging). `processing` is set for the duration of `/score`'s synchronous run (extract → verify → score → explain); no background task/queue for the demo.

**Who moves status:** bot/portal move `draft→submitted`; engine moves `submitted→processing→scored`; **only the officer** moves `scored→approved/rejected/needs_docs`. The AI never decides.

## Applicant

| Field | Type | Notes |
|---|---|---|
| `name` | string | required |
| `cnic_number` | string \| null | format `XXXXX-XXXXXXX-X`; may start null, filled from CNIC extraction |
| `phone` | string | E.164, e.g. `+9230012345 67` — the bot's key for lookup |
| `business_name` | string | required |
| `business_type` | string \| null | free text for now |
| `city` | string \| null | |
| `language` | enum | `en` \| `ur` — bot replies in this language |
| `consent_given` | bool | must be `true` before any processing |

## Document

| Field | Type | Notes |
|---|---|---|
| `id` | string | `DOC-XXX` |
| `type` | enum | `cnic` \| `bank_statement` \| `utility_bill` \| `business_questionnaire` |
| `filename` | string | |
| `uploaded_at` | datetime | |
| `status` | string | `pending` (awaiting extraction) \| `extracted` \| `failed` |
| `extracted_fields` | object | free-form per type — see extraction targets below |
| `verification_flags` | string[] | human-readable inconsistency notes |

**Extraction targets per doc type** (finalized by the engine team; keys are lower_snake_case):

- `cnic`: `name`, `cnic`, `dob`, `address`
- `bank_statement`: `account_title`, `avg_monthly_inflow_pkr`, `avg_monthly_outflow_pkr`, `months`, `end_balance_pkr`, `bounced_cheques` (`account_title` added — needed to cross-check against the CNIC name during verification)
- `utility_bill`: `name`, `address`, `on_time` (bool), `months_history`
- `business_questionnaire`: `years_in_business`, `employees`, `monthly_revenue_pkr`, `loan_purpose` — this one is plain JSON from the bot, not a vision extraction (parsed synchronously on upload, not during `/score`)

## ScoreResult

| Field | Type | Notes |
|---|---|---|
| `repayment_probability` | float 0–1 | XGBoost output — dashboard displays it as **credit score 0–100** = round(p × 100) |
| `risk_tier` | enum | `A` (best) \| `B` \| `C` \| `D` |
| `recommended_amount_pkr` | int | may differ from requested |
| `factors` | ShapFactor[] | top SHAP contributions, both directions |
| `rationale` | string | one-paragraph plain-language credit brief (officer-only — never sent to the applicant) |
| `inconsistency_flags` | string[] | verification-stage red flags (now includes `ECIB_OVERDUE` when the mock e-CIB check flags a materially overdue record, R-7) |
| `segment` | enum | `micro` \| `small` \| `medium` — SBP PR Part-I band, by annualized `monthly_revenue_pkr` |
| `is_startup` | bool | Part-I: a Micro/Small/Medium enterprise ≤5 years old |
| `amount_cap_trace` | object | every gate's PKR value in the `recommended_amount_pkr` cascade: `affordability`, `clean_facility_cap_r9` (PKR 50M, R-9), `per_party_cap_r5` (PKR 100M/500M by segment, R-5), `requested` |
| `binding_amount_gate` | string | which key in `amount_cap_trace` produced `recommended_amount_pkr` — the tightest gate wins |
| `disclosure` | Disclosure \| null | applicant-facing bilingual terms (R-12) — `{en, ur}`, terms only, never score/tier/factors |

**ShapFactor:** `feature` (model feature name) · `label` (human-readable, what the dashboard shows) · `impact` (signed float) · `direction` (`positive` \| `negative`).

## ECIBCheck

Regulation R-7: mandatory bureau check, run once per submission between verification and
scoring (`app/engine/ecib.py`). **Mocked** — e-CIB is bank-facing, a real pull needs the partner
bank's access (Model A, [compliance-sbp.md](compliance-sbp.md)) — never presented as a real
bureau record.

| Field | Type | Notes |
|---|---|---|
| `status` | enum | `clear` \| `overdue` \| `unavailable` (no verified CNIC yet) |
| `note` | string | human-readable, always says "(mock)" |
| `checked_at` | datetime | |

An `overdue` result appends `[HIGH] ECIB_OVERDUE: ...` to the same flag list `policy.py` already
reads — reuses the existing HIGH-flag → forced-`REVIEW` rule, satisfying R-7's "reasons for
allowing financing... shall be properly documented."

## AuditEvent

`at` (datetime) · `actor` (`system` \| `engine` \| officer name) · `action` (`created`, `submitted`, `scored`, `approve`, `reject`, `request_docs`, ...) · `detail` (free text).

Append-only. This list is the compliance/explainability story — every state change must add one.
