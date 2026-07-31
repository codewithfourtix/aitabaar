"""Stage 3 - Scoring: XGBoost repayment probability + SHAP factor
contributions.

Model, feature order, and the SHAP explainer are loaded/built ONCE at
import time and reused across requests - shap.TreeExplainer is not cheap to
construct. Feature order and one-hot logic are imported from
models/train.py so there is exactly one place that can drift between
training and inference (models/features.json holds the training column
order + per-feature medians, loaded here, never re-declared).
"""

import json
import sys
from pathlib import Path

import pandas as pd
import shap
import xgboost as xgb

from app.models.schemas import Application, DocumentType, ScoreResult, ShapFactor

_BACKEND_ROOT = Path(__file__).resolve().parent.parent.parent
if str(_BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(_BACKEND_ROOT))

from models.train import BUSINESS_TYPES, FEATURE_COLUMNS, build_features, tier_for  # noqa: E402

_MODEL_PATH = _BACKEND_ROOT / "models" / "aitbaar_xgb.json"
_FEATURES_PATH = _BACKEND_ROOT / "models" / "features.json"

with open(_FEATURES_PATH, encoding="utf-8") as f:
    _FEATURES_META = json.load(f)
MEDIANS: dict = _FEATURES_META["medians"]
# Single source of truth is models/features.json (written by
# models/train.py's validate_tier_cutoffs()) — never re-declared here, same
# rule as FEATURE_COLUMNS/MEDIANS above.
TIER_CUTOFFS: dict = _FEATURES_META["tier_cutoffs"]

# SBP Prudential Regulations for SME Financing (updated 16 Jul 2026),
# Part-I: enterprise size bands by annual sales turnover.
_SEGMENT_BANDS = [
    ("micro", 30_000_000),
    ("small", 400_000_000),
    ("medium", 2_000_000_000),
]
# R-9: clean (unsecured, cash-flow-based) facility cap, any segment.
CLEAN_FACILITY_CAP_PKR = 50_000_000
# R-5: per-party exposure limit — Micro/Small vs. Medium.
_PER_PARTY_CAP_PKR = {"micro": 100_000_000, "small": 100_000_000, "medium": 500_000_000}
# Part-I: a Micro/Small/Medium enterprise <=5 years old is a "Start-up".
_STARTUP_MAX_YEARS = 5

MODEL = xgb.XGBClassifier()
MODEL.load_model(str(_MODEL_PATH))
EXPLAINER = shap.TreeExplainer(MODEL)

_BUSINESS_TYPE_KEYWORDS = {
    "retail_wholesale": ["retail", "wholesale", "kiryana", "store", "shop", "general"],
    "food": ["food", "restaurant", "bakery", "catering", "stall"],
    "textiles": ["textile", "tailor", "fashion", "boutique", "garment", "cloth"],
    "services": ["service", "salon", "repair", "consult"],
    "light_manufacturing": ["manufactur", "factory", "workshop", "fabrication"],
}

_FACTOR_LABELS = {
    "debt_burden_ratio": "Existing loan repayments vs. bank inflow",
    "bounced_cheques": "Bounced/returned cheques on the statement",
    "net_cashflow_pkr": "Net monthly cash flow (inflow minus outflow)",
    "years_in_business": "Years the business has been trading",
    "turnover_to_loan_ratio": "Bank inflow relative to the requested amount",
    "account_age_months": "Age of the bank account",
    "monthly_revenue_pkr": "Declared monthly revenue",
    "avg_monthly_inflow_pkr": "Average monthly bank deposits",
    "avg_monthly_outflow_pkr": "Average monthly bank withdrawals",
    "employees": "Number of employees",
    "requested_amount_pkr": "Amount requested",
    "registered": "Business registration status",
    "premises_owned": "Business premises ownership",
    "years_at_premises": "Years at current business premises",
    "has_existing_loan": "Existing loan status",
    "existing_installment_pkr": "Existing loan instalment",
}
for _bt in BUSINESS_TYPES:
    _FACTOR_LABELS[f"business_type_{_bt}"] = f"Business type: {_bt.replace('_', ' ')}"

_TIER_MULTIPLIER = {"A": 3.0, "B": 2.0, "C": 1.0, "D": 0.5}

# Every non-derived, document-sourced feature and where it's read from.
# Drives BOTH _build_input_row's real-vs-median fallback AND data
# completeness — dynamically, not a hardcoded "6 missing fields" list, so a
# field that starts resolving (intake collects it) auto-improves
# completeness with no code change here. business_type and
# requested_amount_pkr are deliberately excluded: they come from the
# Applicant/Application objects directly, not document extraction, so they
# are structurally always present rather than an extraction outcome.
_FIELD_SOURCES: dict[str, tuple[DocumentType, str]] = {
    "years_in_business": (DocumentType.business_questionnaire, "years_in_business"),
    "monthly_revenue_pkr": (DocumentType.business_questionnaire, "monthly_revenue_pkr"),
    "employees": (DocumentType.business_questionnaire, "employees"),
    "registered": (DocumentType.business_questionnaire, "registered"),
    "premises_owned": (DocumentType.business_questionnaire, "premises_owned"),
    "years_at_premises": (DocumentType.business_questionnaire, "years_at_premises"),
    "has_existing_loan": (DocumentType.business_questionnaire, "has_existing_loan"),
    "existing_installment_pkr": (DocumentType.business_questionnaire, "existing_installment_pkr"),
    "avg_monthly_inflow_pkr": (DocumentType.bank_statement, "avg_monthly_inflow_pkr"),
    "avg_monthly_outflow_pkr": (DocumentType.bank_statement, "avg_monthly_outflow_pkr"),
    "bounced_cheques": (DocumentType.bank_statement, "bounced_cheques"),
    "account_age_months": (DocumentType.bank_statement, "account_age_months"),
}


def _doc_fields(application: Application, doc_type: DocumentType) -> dict:
    doc = next((d for d in application.documents if d.type == doc_type), None)
    return doc.extracted_fields if doc else {}


def _field_value(application: Application, field_name: str) -> tuple[float, bool]:
    """(value, is_real) for one _FIELD_SOURCES entry. A field extracted as
    null counts as NOT real - extraction prompts explicitly return null for
    anything not read confidently (extraction.py), so a present-but-null key
    is exactly as unreliable as an absent one."""
    doc_type, key = _FIELD_SOURCES[field_name]
    value = _doc_fields(application, doc_type).get(key)
    if value is not None:
        return value, True
    return MEDIANS[field_name], False


def _completeness_band(data_completeness: float) -> str:
    if data_completeness >= 0.8:
        return "HIGH"
    if data_completeness >= 0.6:
        return "MEDIUM"
    return "LOW"


def _match_business_type(business_type_text: str | None) -> str | None:
    if not business_type_text:
        return None
    lowered = business_type_text.lower()
    for category, keywords in _BUSINESS_TYPE_KEYWORDS.items():
        if any(keyword in lowered for keyword in keywords):
            return category
    return None


def _build_input_row(application: Application) -> tuple[dict, float, list[str]]:
    """Real data where we have it; median fallback where we don't, tracked
    dynamically via _FIELD_SOURCES (see data/DATA_CARD.md for why several
    fields are still median-only in practice today). Returns
    (feature row, data_completeness 0-1, defaulted field names)."""
    values: dict[str, float] = {}
    defaulted: list[str] = []
    for field_name in _FIELD_SOURCES:
        value, is_real = _field_value(application, field_name)
        values[field_name] = value
        if not is_real:
            defaulted.append(field_name)

    inflow = values["avg_monthly_inflow_pkr"]
    outflow = values["avg_monthly_outflow_pkr"]
    existing_installment = values["existing_installment_pkr"]

    row = {
        "business_type": _match_business_type(application.applicant.business_type) or "__unknown__",
        **values,
        "net_cashflow_pkr": inflow - outflow,
        "requested_amount_pkr": application.requested_amount_pkr,
    }
    row["debt_burden_ratio"] = existing_installment / max(inflow, 1)
    row["turnover_to_loan_ratio"] = inflow / max(application.requested_amount_pkr / 12, 1)

    data_completeness = 1 - (len(defaulted) / len(_FIELD_SOURCES))
    return row, data_completeness, defaulted


def _segment_for(annual_turnover_pkr: float) -> str:
    """SBP Prudential Regulations for SME Financing (16 Jul 2026), Part-I:
    enterprise size band by annual sales turnover. monthly_revenue_pkr is
    the closest proxy the intake flow has to annual turnover, so it's
    annualized (x12) here rather than collecting a separate figure."""
    for segment, ceiling in _SEGMENT_BANDS:
        if annual_turnover_pkr <= ceiling:
            return segment
    return "medium"


def _is_startup(years_in_business: float) -> bool:
    """Part-I: a Micro/Small/Medium enterprise <=5 years old is a Start-up."""
    return years_in_business <= _STARTUP_MAX_YEARS


def _recommended_amount(
    monthly_revenue_pkr: float, risk_tier: str, requested_amount_pkr: int, segment: str
) -> tuple[int, dict[str, int], str]:
    """Four-gate cascade, tightest wins — MIN() of affordability, the
    R-9 clean-facility cap, the R-5 per-party exposure limit (by segment),
    and what the applicant actually asked for. The first three gates are
    regulatory ceilings that can never be breached regardless of tier;
    only the affordability gate reflects the model's own risk view.
    Returns (amount, trace of every gate's value, name of the binding gate)
    so the officer dashboard can show exactly why this number, not a black
    box — see docs/compliance-sbp.md."""
    trace = {
        "affordability": int(monthly_revenue_pkr * _TIER_MULTIPLIER[risk_tier]),
        "clean_facility_cap_r9": CLEAN_FACILITY_CAP_PKR,
        "per_party_cap_r5": _PER_PARTY_CAP_PKR[segment],
        "requested": requested_amount_pkr,
    }
    binding_gate = min(trace, key=lambda gate: trace[gate])
    return trace[binding_gate], trace, binding_gate


def score(application: Application) -> ScoreResult:
    row, data_completeness, defaulted_fields = _build_input_row(application)
    X = build_features(pd.DataFrame([row]))

    p_repay = float(MODEL.predict_proba(X)[0, 1])

    shap_values = EXPLAINER.shap_values(X)
    row_shap = shap_values[0]
    contributions = sorted(zip(FEATURE_COLUMNS, row_shap), key=lambda item: abs(item[1]), reverse=True)
    factors = [
        ShapFactor(
            feature=name,
            label=_FACTOR_LABELS.get(name, name.replace("_", " ")),
            impact=float(value),
            direction="positive" if value > 0 else "negative",
        )
        for name, value in contributions[:5]
    ]

    risk_tier = tier_for(p_repay, TIER_CUTOFFS)
    segment = _segment_for(row["monthly_revenue_pkr"] * 12)
    is_startup = _is_startup(row["years_in_business"])
    recommended_amount_pkr, amount_cap_trace, binding_gate = _recommended_amount(
        row["monthly_revenue_pkr"], risk_tier, application.requested_amount_pkr, segment
    )

    return ScoreResult(
        repayment_probability=p_repay,
        risk_tier=risk_tier,
        recommended_amount_pkr=recommended_amount_pkr,
        factors=factors,
        rationale="",  # filled in by rationale.build_brief
        inconsistency_flags=[],
        data_completeness=round(data_completeness, 3),
        defaulted_fields=defaulted_fields,
        completeness_band=_completeness_band(data_completeness),
        segment=segment,
        is_startup=is_startup,
        amount_cap_trace=amount_cap_trace,
        binding_amount_gate=binding_gate,
    )
