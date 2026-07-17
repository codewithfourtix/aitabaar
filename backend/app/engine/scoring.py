"""Stage 3 — Scoring: XGBoost model over extracted features → probability of
repayment + risk tier + recommended amount. SHAP values explain each score.

Owner: Anas / Obaid.
"""

from app.models.schemas import Application, ScoreResult


def score(application: Application) -> ScoreResult:
    raise NotImplementedError("Train/load XGBoost model + SHAP explainer")
