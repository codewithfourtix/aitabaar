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

from models.train import BUSINESS_TYPES, FEATURE_COLUMNS, build_features  # noqa: E402

_MODEL_PATH = _BACKEND_ROOT / "models" / "aitbaar_xgb.json"
_FEATURES_PATH = _BACKEND_ROOT / "models" / "features.json"

with open(_FEATURES_PATH, encoding="utf-8") as f:
    _FEATURES_META = json.load(f)
MEDIANS: dict = _FEATURES_META["medians"]

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


def _doc_fields(application: Application, doc_type: DocumentType) -> dict:
    doc = next((d for d in application.documents if d.type == doc_type), None)
    return doc.extracted_fields if doc else {}


def _match_business_type(business_type_text: str | None) -> str | None:
    if not business_type_text:
        return None
    lowered = business_type_text.lower()
    for category, keywords in _BUSINESS_TYPE_KEYWORDS.items():
        if any(keyword in lowered for keyword in keywords):
            return category
    return None


def _build_input_row(application: Application) -> dict:
    """Real data where we have it; documented median fallback where we
    don't (registered, premises_owned, years_at_premises, account_age_months,
    has_existing_loan, existing_installment_pkr aren't collected by the
    current intake flow - see data/DATA_CARD.md)."""
    bank = _doc_fields(application, DocumentType.bank_statement)
    questionnaire = _doc_fields(application, DocumentType.business_questionnaire)

    inflow = bank.get("avg_monthly_inflow_pkr", MEDIANS["avg_monthly_inflow_pkr"])
    outflow = bank.get("avg_monthly_outflow_pkr", MEDIANS["avg_monthly_outflow_pkr"])
    existing_installment = MEDIANS["existing_installment_pkr"]

    row = {
        "business_type": _match_business_type(application.applicant.business_type) or "__unknown__",
        "years_in_business": questionnaire.get("years_in_business", MEDIANS["years_in_business"]),
        "registered": MEDIANS["registered"],
        "monthly_revenue_pkr": questionnaire.get("monthly_revenue_pkr", MEDIANS["monthly_revenue_pkr"]),
        "employees": questionnaire.get("employees", MEDIANS["employees"]),
        "premises_owned": MEDIANS["premises_owned"],
        "years_at_premises": MEDIANS["years_at_premises"],
        "avg_monthly_inflow_pkr": inflow,
        "avg_monthly_outflow_pkr": outflow,
        "net_cashflow_pkr": inflow - outflow,
        "bounced_cheques": bank.get("bounced_cheques", MEDIANS["bounced_cheques"]),
        "account_age_months": MEDIANS["account_age_months"],
        "has_existing_loan": MEDIANS["has_existing_loan"],
        "existing_installment_pkr": existing_installment,
        "requested_amount_pkr": application.requested_amount_pkr,
    }
    row["debt_burden_ratio"] = existing_installment / max(inflow, 1)
    row["turnover_to_loan_ratio"] = inflow / max(application.requested_amount_pkr / 12, 1)
    return row


def _tier_for(p_repay: float) -> str:
    if p_repay >= 0.80:
        return "A"
    if p_repay >= 0.65:
        return "B"
    if p_repay >= 0.50:
        return "C"
    return "D"


def _recommended_amount(monthly_revenue_pkr: float, risk_tier: str, requested_amount_pkr: int) -> int:
    """Documented rule: cap at a tier-scaled multiple of monthly revenue,
    never above what was actually requested. When a banker asks where the
    number comes from, this function is the answer."""
    ceiling = monthly_revenue_pkr * _TIER_MULTIPLIER[risk_tier]
    return int(min(requested_amount_pkr, ceiling))


def score(application: Application) -> ScoreResult:
    row = _build_input_row(application)
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

    risk_tier = _tier_for(p_repay)
    recommended_amount_pkr = _recommended_amount(row["monthly_revenue_pkr"], risk_tier, application.requested_amount_pkr)

    return ScoreResult(
        repayment_probability=p_repay,
        risk_tier=risk_tier,
        recommended_amount_pkr=recommended_amount_pkr,
        factors=factors,
        rationale="",  # filled in by rationale.build_brief
        inconsistency_flags=[],
    )
