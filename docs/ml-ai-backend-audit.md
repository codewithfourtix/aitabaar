# Aitabaar AI/ML Backend Audit

**Scope:** read-only audit — no files modified, nothing executed, nothing trained.
**Date:** 2026-07-18.
**Branch audited:** `anas/backend-engine` (the branch actually checked out in the working
directory at audit time — `git branch -a` confirms `* anas/backend-engine`). This branch
is up to date with `origin/anas/backend-engine` (tip `275ef75`), which is also the tip of
`origin/stage`. It has **not** been merged into `main`; `main`/`origin/main` still contain
only the original scaffold (verified via `git show main:...`, see §0).

> **Note on a prior draft of this file:** an earlier version of this report (present as an
> untracked file before this audit ran) claimed the *local checkout* was on `main` and
> contained nothing but `NotImplementedError` stubs, with all real work living only on a
> remote branch. That was wrong about the local checkout specifically — the working
> directory is on `anas/backend-engine`, and every file below was read directly from disk,
> not fetched from a remote ref. The substance of that draft's technical findings about the
> engine/model on `origin/stage` turned out to be accurate and is corroborated independently
> below; only its claim about what's physically checked out locally has been corrected.

---

## 0. Branch situation (verify before trusting anything else)

```
main (origin/main)                    anas/backend-engine (checked out locally, = origin/stage tip)
────────────────────                  ──────────────────────────────────────────────────────────────
179e15f  scaffold only:                179e15f
  engine/*.py = 1-line                 └─ ... (WhatsApp bot, docs)
  raise NotImplementedError            └─ cd2a874  Add synthetic SME dataset generator
  mock_data.py = static dict           └─ 8cccd28  Train the repayment-probability model
  requirements.txt: xgboost/           └─ b5da7c4  Wire real extraction, verification, rationale
  shap/pandas commented OUT            └─ 67bdd28  Document the real engine, /demo/reset
                                        └─ 275ef75  Add PDF support to extraction  ← HEAD, audited below
```

Confirmed by direct commands, not inference:
- `git branch -a` → `* anas/backend-engine` is the current branch.
- `git show main:backend/app/engine/scoring.py` → 10 lines, body is
  `raise NotImplementedError("Train/load XGBoost model + SHAP explainer")`.
- `git show main:backend/requirements.txt` → `xgboost`, `shap`, `scikit-learn`, `pandas` are
  commented out.
- `git diff --stat main..HEAD -- backend` → 18 files changed, +2242/−92, including
  `backend/models/aitbaar_xgb.json` (new), `backend/data/synthetic_sme.csv` (new, 1001
  lines), `backend/models/train.py` (new, 115 lines).

**Practical implication:** if anyone runs `git checkout main` or deploys off `main`, they get
the stub version with no model, no extraction, no verification, and a hardcoded mock score.
Everything described from here on is what exists on the currently-checked-out branch.

---

## A. Repo map

```
backend/
  app/
    engine/
      extraction.py     Stage 1 — Gemini vision via OpenRouter, PDF→image via pymupdf
      llm_client.py      shared OpenRouter httpx client (vision + text), no provider SDK
      verification.py    Stage 2 — deterministic rapidfuzz + regex rules, NO LLM
      scoring.py          Stage 3 — loads trained XGBoost + SHAP TreeExplainer, real inference
      rationale.py         Stage 4 — template brief + optional LLM prose layered on top
      __init__.py         empty
    models/schemas.py     Pydantic contract shared by backend, bot, dashboard, portal
    routers/applications.py   real pipeline orchestration (run_full_pipeline)
    storage.py             local filesystem doc storage (backend/data/uploads/, gitignored)
    mock_data.py            in-memory app store; 3 demo applicants (clean/borderline/fraud)
    main.py                  FastAPI app, /health, /demo/reset, runs pipeline at startup
  data/
    generate.py           synthetic SME dataset generator (numpy, seed 42)
    synthetic_sme.csv     1,000 rows + `repaid` label (1001 lines incl. header, 110,790 bytes)
    DATA_CARD.md            explicit "entirely synthetic" disclosure
  models/
    train.py               XGBoost training script (80/20 stratified split, early stopping)
    aitbaar_xgb.json       TRAINED MODEL ARTIFACT (109,697 bytes) — verified below
    features.json           training column order (21 features) + per-feature medians
    METRICS.md               AUC 0.778, KS 0.489, confusion matrix on 200-row test set
  requirements.txt        xgboost, shap, scikit-learn, pandas, numpy, rapidfuzz, pymupdf — all active
docs/                     architecture.md, api.md, data-model.md, decisions.md, dashboard-spec.md,
                          whatsapp-bot-flow.md, git-workflow.md, DATA_CARD-adjacent notes
whatsapp-bot/             Node.js (whatsapp-web.js) — separate service, calls backend only via REST
dashboard/, portal/       README placeholders only, no code in this checkout
```

No Jupyter notebooks anywhere in the repo. No `.onnx` artifacts. One model artifact, one
dataset, one training script.

**Model artifact verification** (read directly, not assumed from the filename):
`backend/models/aitbaar_xgb.json` header starts
`{"learner":{"attributes":{"best_iteration":"39","best_score":"0.7778017473843167",...},
"feature_names":["business_type_retail_wholesale",...,"turnover_to_loan_ratio"],...}` — this
is a genuine serialized XGBoost booster (native XGBoost JSON schema), and `best_score`
matches `METRICS.md`'s reported AUC (0.778) exactly, and `feature_names` matches
`features.json`'s 21-column list exactly. File is 109,697 bytes — not a placeholder/empty
file.

---

## B. Model inventory

**One model.** `backend/models/aitbaar_xgb.json`, loaded and invoked from
`backend/app/engine/scoring.py`.

| Aspect | Finding | Evidence |
|---|---|---|
| Algorithm / library | Real gradient-boosted trees: `xgb.XGBClassifier(objective="binary:logistic", max_depth=4, n_estimators=200, learning_rate=0.05, subsample=0.8, colsample_bytree=0.8, early_stopping_rounds=20)` | `backend/models/train.py:65-75` |
| Real ML or rules dressed up? | Genuine trained classifier. Loaded once at import time (`MODEL = xgb.XGBClassifier(); MODEL.load_model(...)`, `EXPLAINER = shap.TreeExplainer(MODEL)`) and called via `MODEL.predict_proba(X)[0, 1]` | `scoring.py:35-37` (load), `scoring.py:142` (call) |
| Input features (21) | 5 one-hot `business_type_*` + `years_in_business`, `registered`, `monthly_revenue_pkr`, `employees`, `premises_owned`, `years_at_premises`, `avg_monthly_inflow_pkr`, `avg_monthly_outflow_pkr`, `net_cashflow_pkr`, `bounced_cheques`, `account_age_months`, `has_existing_loan`, `existing_installment_pkr`, `requested_amount_pkr`, `debt_burden_ratio`, `turnover_to_loan_ratio` | `models/train.py:20-40` (`FEATURE_COLUMNS`), mirrored in `models/features.json:2-24` |
| Where features are computed at inference | `scoring.py:86-117` (`_build_input_row`): pulls real values from `Document.extracted_fields` on the bank-statement and business-questionnaire docs where present. **6 of 21 raw fields are never collected by the current intake flow and are always defaulted to the training-set median**: `registered`, `premises_owned`, `years_at_premises`, `account_age_months`, `has_existing_loan`, `existing_installment_pkr` (and `existing_installment_pkr` also drives `debt_burden_ratio`, so that derived feature is constant too) | `scoring.py:94-116`; confirmed against `docs/data-model.md`'s extraction-target list (CNIC/bank/utility/questionnaire fields don't include those 6); also confirmed in `DATA_CARD.md`'s "Fields the real intake flow doesn't collect (yet)" section |
| Training data — real or synthetic? | **100% synthetic, explicitly disclosed.** `data/generate.py` builds 1,000 rows from independent distributions (lognormal revenue, gamma years-in-business, etc.), `numpy.random.default_rng(42)`. `DATA_CARD.md:3` states: *"This dataset is entirely synthetic. It does not represent real UBL customers, real applicants, or any real financial records."* No real bank/CNIC/credit-bureau data anywhere in the repo. | `backend/data/generate.py:16-90`; `backend/data/DATA_CARD.md:1-7` |
| Labels — do repayment/default labels exist? | Yes — a `repaid` column, but **generated, not observed**. Drawn from a hand-authored latent logit over `debt_burden_ratio`, `bounced_cheques`, `net_cashflow_pkr`, `years_in_business`, `turnover_to_loan_ratio`, `account_age_months`, plus injected Gaussian noise (`RNG.normal(0, 1.05, size=N)`), then Bernoulli-sampled (`RNG.random(N) < p_repay`). The generator's own comment states the noise is added deliberately to avoid a "suspicious ~0.99" AUC. | `backend/data/generate.py:92-113` |
| Output | `repayment_probability`: float in [0,1] from `predict_proba(...)[0,1]` → mapped to 4-tier band via fixed thresholds (A ≥0.80, B ≥0.65, C ≥0.50, D below) → dashboard is documented to show `round(p×100)` as a "credit score 0-100" | `scoring.py:120-127` (`_tier_for`); `docs/data-model.md:74` |
| Saved artifacts | `aitbaar_xgb.json` (booster) + `features.json` (column order + medians) — both loaded by fixed path at import time, never re-derived at request time, so train/serve skew is structurally limited to the 6 always-median fields | `scoring.py:28-37` |
| Evaluation / metrics present | Yes — `METRICS.md`: AUC 0.778, KS 0.489, confusion matrix (TN=30, FP=43, FN=17, TP=110) on a 200-row held-out stratified split, seed 42. **This is the only evaluation.** No cross-validation, no probability calibration check, no fairness/subgroup breakdown, no back-test against any real outcome (none exists to test against). | `backend/models/METRICS.md`; regenerated deterministically by `models/train.py:78-108` |

**Recommended-amount logic is separate from the model** — a documented post-hoc rule
(`_TIER_MULTIPLIER` × monthly revenue, capped at the requested amount), not ML output.

```python
# scoring.py:68,130-135
_TIER_MULTIPLIER = {"A": 3.0, "B": 2.0, "C": 1.0, "D": 0.5}

def _recommended_amount(monthly_revenue_pkr, risk_tier, requested_amount_pkr):
    ceiling = monthly_revenue_pkr * _TIER_MULTIPLIER[risk_tier]
    return int(min(requested_amount_pkr, ceiling))
```

---

## C. Stage-by-stage status

| Stage | Status | File : line | Evidence |
|---|---|---|---|
| 1. Extraction | **IMPLEMENTED** (real vision LLM call, graceful degradation) | `backend/app/engine/extraction.py:104-132` | Calls `llm_client.vision_json(prompt, images)` against `google/gemini-2.5-flash-lite` via OpenRouter (`llm_client.py:39`); PDFs rendered to images via pymupdf (`extraction.py:78-91`); one retry on failure, then `document.status = "failed"` + a flag, pipeline continues (`extraction.py:118-132`) |
| 2. Verification | **IMPLEMENTED** (deterministic rules, no LLM, exactly as spec'd) | `backend/app/engine/verification.py:36-90` | CNIC regex format check (`_CNIC_PATTERN`), rapidfuzz name-match CNIC↔bank account title (threshold 80, `fuzz.token_set_ratio`), income-ratio inconsistency (>3×), bounced-cheque threshold (≥3) — all real logic |
| 3. Scoring | **IMPLEMENTED** (real trained XGBoost + real per-request SHAP) | `backend/app/engine/scoring.py:138-167` | Model + `shap.TreeExplainer` built once at import; `score()` builds the feature row, calls `predict_proba`, computes real SHAP values via `EXPLAINER.shap_values(X)`, sorts by `abs(impact)`, returns top 5 as `ShapFactor`s |
| 4. Rationale | **IMPLEMENTED** (template-first, LLM-enhanced, with fallback) | `backend/app/engine/rationale.py:36-82` | `_template_brief()` is deterministic and always computed first; the LLM call sits on top with `_safe_context()` restricting it to score/tier/factors/flags only (never raw applicant data); any LLM exception falls back to the template (`rationale.py:74-82`) |

All four stages are wired end-to-end via `run_full_pipeline()` in
`backend/app/routers/applications.py:117-171`, one `AuditEvent` per stage, wrapped in a single
try/except so a failing stage lands the application in `status=failed` with the reason
recorded rather than hanging (`applications.py:165-168`).

**No dead code, no TODO/FIXME markers, and no `NotImplementedError` were found anywhere
inside `backend/` on this branch** (grepped for `TODO|FIXME|XXX|NotImplementedError`; the
only hit was an unrelated CNIC format string in a prompt).

---

## D. End-to-end trace (real, non-seeded application)

1. **Create** — `POST /applications` → `create_application()` builds an `Application`,
   `status=draft`. No model involved (`applications.py:55-71`).
2. **Upload docs** — `POST /applications/{id}/documents` → 403 if `consent_given` is false
   (`applications.py:81-82`); file saved to local disk via `storage.save()`
   (`storage.py:17-23`); `business_questionnaire` is parsed as plain JSON immediately, no
   vision call needed (`applications.py:91-97`); other doc types stay `status="pending"`
   until `/score`.
3. **Submit** — `POST /applications/{id}/submit` → `status=submitted`.
4. **Score** — `POST /applications/{id}/score` → `run_full_pipeline()`
   (`applications.py:117-171`):
   - **Extraction (real):** for each pending doc, loads bytes from disk, calls
     `extraction.extract()` → real Gemini vision call → `extracted_fields` populated, or
     `status=failed` + flag after 2 failed attempts.
   - **Verification (real):** `verification.verify()` runs the 4 deterministic checks;
     returns a flag list.
   - **Scoring (real):** `scoring.score()` builds the 21-feature row (mix of real extracted
     values + median fallbacks for 6 uncollected fields), runs the real XGBoost model +
     SHAP.
   - **Rationale (real, LLM-enhanced):** `rationale.build_brief()` turns score+factors into
     officer-facing prose, template-first with LLM enhancement.
   - **Verification's flags are attached to the result *after* scoring**
     (`applications.py:150`, `result.inconsistency_flags = flags`) — verification does
     **not** feed into the model's feature vector or gate the tier/probability. A flagged
     inconsistency (e.g. the CNIC/bank-statement name-mismatch fraud case) is surfaced to the
     officer as text only; it cannot change `repayment_probability` or `risk_tier`. Confirmed
     directly by reading `scoring.score()`, which has no parameter or code path that reads
     verification output at all.
5. **API response** — full `Application` returned, `score` populated, `audit_trail` has one
   entry per stage (`extracted`, `verified`, `scored`, `explained`).
6. **Decision** — `POST /applications/{id}/decision` → only a human officer can move status
   to `approved`/`rejected`/`needs_docs` (`applications.py:181-198`); no code path lets the
   engine itself set these statuses.

**Where the chain breaks if actually run today:** `llm_client._api_key()` raises
`RuntimeError("OPENROUTER_API_KEY not set")` if that env var is absent
(`llm_client.py:17-21`) — every extraction and rationale-LLM call would then fail.
Extraction degrades gracefully per-document (`status="failed"`, pipeline continues with
median-filled features for that document type); rationale degrades to the template brief.
**Scoring has no external dependency** — the model file is checked into the repo — and will
not break even with no API key or network access.

`GET /demo/reset` (`main.py:50-59`) bypasses steps 1–3: it seeds 3 hand-authored applicants
with `extracted_fields` already filled in (`mock_data.py`, e.g. `_clean_approve()`,
`_borderline()`, `_fraud_flag()`), as if extraction already ran, then runs each through the
real verify → score → rationale chain. This is a documented demo shortcut — the
scoring/verification/rationale outputs for these 3 are genuinely computed at request time,
only the extraction/vision step is skipped by construction.

---

## E. Contract check (`backend/app/models/schemas.py`)

Core objects: `Application` (root), `Applicant`, `Document`, `ScoreResult`, `ShapFactor`,
`AuditEvent`, plus request bodies `ApplicationCreate`, `DecisionRequest`. `ApplicationStatus`
includes a `failed` value (line 32) specifically for pipeline errors; `Document.status`
(line 47) tracks per-document extraction state; `Application.pending_doc_requests`
(line 97) tracks officer-requested re-uploads.

Endpoints (`backend/app/routers/applications.py` + `main.py`):

| Method | Path | Calls the real model? |
|---|---|---|
| GET | `/applications`, `/applications/{id}` | No — reads in-memory store |
| POST | `/applications` | No — creates draft |
| POST | `/applications/{id}/documents` | Partially — saves file; questionnaire JSON parsed inline; image/PDF extraction deferred to `/score` |
| POST | `/applications/{id}/submit` | No |
| **POST** | **`/applications/{id}/score`** | **Yes — full real pipeline** (`run_full_pipeline`) |
| POST | `/applications/{id}/decision` | No — pure officer state transition, no engine call |
| GET | `/demo/reset` | **Yes** — reseeds 3 demo apps and runs the real pipeline on each |

On `main` (not this branch), every one of these routes exists too, but `/score` returns a
static, hardcoded `ScoreResult` copied from the seeded mock data — no model call, no
extraction, no verification at all.

---

## F. The hard questions, answered directly

- **Genuine ML or disguised if/else rules?** Genuine. `aitbaar_xgb.json` is a real serialized
  XGBoost booster — verified by reading its own header (`best_iteration`, `best_score`
  matching `METRICS.md`'s reported numbers exactly, `feature_names` matching
  `features.json`). The tier/amount logic *around* the model (probability thresholds at
  0.80/0.65/0.50, tier-multiplier for recommended amount) is openly rule-based and clearly
  separated in the code (`_tier_for`, `_recommended_amount`) — the two are not conflated.
- **Real training data or fabricated?** Fabricated by design, disclosed in the first sentence
  of `DATA_CARD.md`. There is no real repayment/default outcome data anywhere in this
  project — the `repaid` label is a synthetic latent-logit construction, not observed
  history. **This is the single most important caveat: AUC 0.778 measures how well XGBoost
  recovered a formula the developer wrote (`generate.py:102-113`), not how well it predicts
  real Pakistani SME default.** The formula's driver weights (debt burden > bounced cheques >
  cashflow > years in business > turnover-to-loan > account age) are the developer's assumed
  ranking, not derived from any published default-rate study — `docs/decisions.md`'s open
  questions section explicitly flags "Synthetic data generator: exact feature distributions
  and default-rate assumptions (anchored to SBP NFIS 2024-28 / SMEDA / PBA figures...)" as
  still unresolved.
- **Real vision call or stub JSON?** Real call: OpenRouter → `google/gemini-2.5-flash-lite`,
  with real PDF-to-image rendering (pymupdf) for multi-page bank statements. Not a stub, not
  fixture JSON, on this branch. (On `main`, extraction is 100% a `NotImplementedError` stub.)
- **Is explainability actually wired?** Yes — real per-request SHAP
  (`shap.TreeExplainer(MODEL)`, computed per application, not a static/precomputed
  explanation), top-5 factors by absolute contribution, human-readable labels via a
  maintained `_FACTOR_LABELS` lookup table.
- **Confidence handling / human-in-the-loop?** Partial. No explicit prediction-confidence or
  calibration score is surfaced anywhere (no probability interval, no "low confidence" flag
  when many input fields are median-defaulted). There **is** a real human-in-the-loop gate:
  only an officer can move status to `approved`/`rejected`/`needs_docs` — enforced
  structurally in code (`applications.py:181-198`), not just documented policy. But
  verification flags (including the HIGH-severity fraud-name-mismatch case) are surfaced as
  text only and do not suppress or downgrade the score, as detailed in §D — a flagged
  application can still show a high repayment probability and tier A/B, relying entirely on
  the officer noticing and weighing the flag text.

---

## G. Gaps, prioritized

1. **This branch is unmerged to `main`.** The entire real pipeline (model, extraction,
   verification, wiring) lives on `anas/backend-engine`/`origin/stage` only. Anyone deploying
   off `main`, or auditing only `main`, gets the fully-stubbed version with a hardcoded mock
   score and no model at all.
2. **Verification flags don't gate scoring.** A HIGH-severity flag (e.g. CNIC/bank-statement
   name mismatch — the fraud demo case, `mock_data.py:_fraud_flag()`) is computed but never
   fed into the feature vector or used to cap the tier/probability; it only appears as text
   in the brief (`applications.py:150`). An officer skimming the tier/probability number
   could miss it. This is the highest-leverage code fix available (small, localized, directly
   addresses a named fraud scenario in the product's own demo narrative).
3. **Synthetic-label ceiling.** The model's ceiling is the quality of a hand-written logit
   formula, not real outcomes. Disclosed, but means the AUC/KS numbers say nothing about
   real-world discrimination, and the driver-weight assumptions are not anchored to any
   published Pakistani SME default-rate source yet (open question in `docs/decisions.md`).
4. **6 of 21 model features are never actually collected**
   (`registered`, `premises_owned`, `years_at_premises`, `account_age_months`,
   `has_existing_loan`, `existing_installment_pkr`, plus the derived `debt_burden_ratio`
   which depends on `existing_installment_pkr`) — always median-filled at inference. This is
   documented but effectively reduces the model to ~14-15 features that vary per real
   application today.
5. **No confidence/calibration signal.** `predict_proba` output is treated as a clean
   probability and banded directly; no calibration curve check, no flag distinguishing a
   fully-extracted application from one running mostly on median defaults.
6. **No persistence.** Everything is in-memory (`mock_data.APPLICATIONS` dict, cleared on
   process restart) — an explicit hackathon-deadline decision (`docs/decisions.md` #18,
   supersedes an earlier Supabase plan, #14), worth flagging as a gap beyond the hackathon
   submission.
7. **Frontend/backend branch split.** `docs/architecture.md` and `docs/decisions.md` describe
   a React dashboard (owned by Ali Ateeb) that is not present in this checkout — only
   `dashboard/README.md` exists here. If that work lives on a separate branch, it currently
   can't be run together with the real engine from one checkout.
8. **Two open items in `docs/decisions.md`** worth resolving before citing model numbers or
   demoing at scale: bot session-state persistence (in-memory vs. Redis), and whether the
   synthetic generator's assumptions will ever be anchored to SBP/SMEDA/PBA published
   figures.
9. **Minor / cosmetic:** `docs/architecture.md:35` still says *"Until the engine is real,
   POST /applications/{id}/score returns a mock score"* — stale relative to this branch
   (`docs/api.md`'s endpoint table, updated more recently, correctly says "real engine").
   Not a code gap, just a doc that lags the branch it describes.

No dead code or stub markers were found inside the four engine-stage files themselves — the
engine code is clean; the gaps above are about data provenance, a missing verification→score
feedback loop, and branch/merge state, not incomplete implementation.
