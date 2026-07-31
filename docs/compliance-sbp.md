# SBP Prudential Regulations compliance map

Source regulation: State Bank of Pakistan, SME, Housing & Sustainable Finance Department,
*Prudential Regulations for Small & Medium Enterprise Financing* (updated **16 Jul 2026**) —
kept alongside this repo, not linked, since it's an internal PDF, not a public URL.

This is the engineering-grounded version of the earlier internal pitch dossier
(`aitabaar-ml-architecture-v2-compliance.pdf`) — same regulation → component idea, but every
row below points at a real file and an honest status, not a slide claim. See
[decisions.md](decisions.md) #19 for when/why this pass happened.

## Who's regulated, and how Aitbaar fits

Most of these PRs (R-1 to R-4, R-8, R-10, R-11, R-13, R-18) govern a **bank's** overall SME
finance program — strategy, committees, risk function, related-party restrictions — not a
scoring vendor. They apply to whichever bank runs Aitbaar in production, not to this repo.
The rows below cover the regulations that a credit-scoring/origination **engine** can actually
implement: R-5, R-6, R-7, R-9, R-12, R-14, R-15, R-16, R-17, R-19.

The regulations point at a fintech-partner model rather than Aitbaar lending directly: R-15
explicitly invites banks to "develop partnerships with reputed third parties, fintechs etc." for
credit scoring. In that model the **bank** carries the Prudential-Regulation obligations as
lender of record; Aitbaar's job is to build so the bank stays compliant. A direct-lending model
would instead require an NBFC lending licence from SECP — a different regulator, a much heavier
build, not what this engine is built for.

## Regulation → component map

| Reg | What it requires | Aitbaar component | Status |
|---|---|---|---|
| R-5 | Per-party exposure ≤ PKR 100M (Micro/Small) / 500M (Medium) | `app/engine/scoring.py`'s `_recommended_amount()` cascade, `per_party_cap_r5` gate | ✅ Done |
| R-6 | PBA standardized + digital application form | Digital intake exists (portal + WhatsApp bot collect the same fields as `ApplicationCreate`/`business_questionnaire`); field-by-field mapping to the actual PBA form template is unbuilt — **we don't have that form** in this repo | 🟡 Build (needs the PBA form document) |
| R-7 | Mandatory e-CIB / licensed-CIB report per proposal, overdue → documented reason | `app/engine/ecib.py` — deterministic **mock**, wired into `run_full_pipeline` between verify and score; an overdue result becomes a `[HIGH] ECIB_OVERDUE` flag through the existing `policy.py` gate | 🟡 Mocked (real feed needs the partner bank — e-CIB is bank-facing) |
| R-9 | Clean (cash-flow) exposure ≤ PKR 50M | Same cascade, `clean_facility_cap_r9` gate; `data/generate.py`'s `requested_amount_pkr` clip also re-anchored to 50M | ✅ Done |
| R-12 | Loan terms disclosed in English & Urdu | `app/engine/disclosure.py` — deterministic EN/UR templates, terms-only (never score/tier/factors), computed every pipeline run, stored on `ScoreResult.disclosure` | ✅ Done |
| R-14 | End-to-end digital onboarding; reuse data; third-party sources; e-sign | Digital pipeline exists (bot/portal → `/documents` → `/submit`); NADRA/e-CIB data reuse and e-sign are not built | 🟡 Partial |
| R-15 | Digital scoring model leveraging cash-flow/account/supply-chain/alt data | The XGBoost engine (`models/train.py`, `app/engine/scoring.py`) — cash-flow + bank-account features live; digital-supply-chain and wallet/alt-data are roadmap, not built | 🟡 Partial (core model done, 2 of 4 data categories are roadmap) |
| R-16 | ≤15 working-day TAT; automated/straight-through | Full pipeline runs in seconds (`run_full_pipeline` in `app/routers/applications.py`) | ✅ Done |
| R-17 | Classify at 90/180/365 DPD; provision accordingly | `repaid=0` in `data/synthetic_sme.csv` is defined as reaching 90+ DPD (Substandard, Annexure I) — see `data/DATA_CARD.md`'s "Target definition" section; tier cutoffs validated against holdout bad rate in `models/train.py::validate_tier_cutoffs` | ✅ Done (target definition + tier validation) |
| R-19 | CPTM tracking (unique serial, auto-ack, live status), portfolio MIS | `APP-XXX` IDs + append-only `audit_trail` (every stage, every officer action) satisfy the tracking half; `GET /applications/mis-summary` (Regulation R-19 ii) adds the portfolio-visibility half | ✅ Done |

## Honest gaps (not built, not faked)

- **R-6 PBA form mapping** — needs the actual Pakistan Banks' Association standardized form.
  Not fabricated here; the intake schema (`app/models/schemas.py`) already carries the
  substance (applicant, business, requested amount, required documents), so this is a mapping
  exercise once the form is available, not a redesign.
- **R-7 live e-CIB** — `app/engine/ecib.py` is explicitly a mock (see its module docstring).
  e-CIB access is bank-facing under R-7, so a real feed only exists once a bank partner is
  onboarded (Model A above).
- **R-15's remaining two data categories** (digital supply chain, verifiable alternate data —
  e.g. JazzCash/Easypaisa) — `data/DATA_CARD.md` already documents why scraped alt-data was
  rejected (no consent basis, no data-sharing agreement). These stay roadmap items, not
  something this pass fabricates a data source for.
- **R-14's e-sign and full third-party data reuse** — not built; the current pipeline still
  collects some data directly from the applicant that a live NADRA/e-CIB integration could
  source instead.

None of the ✅ rows above claim more than what the linked file actually does — if a row says
"Done", read the file; the behavior should match the claim, unlike the original dossier's more
optimistic framing of some of these as done before they were.
