"""Stage 4 — Rationale: turn ScoreResult + SHAP factors into the one-page
plain-language credit brief the loan officer reads.

Owner: Anas / Obaid.
"""

from app.models.schemas import Application, ScoreResult


def build_brief(application: Application, score: ScoreResult) -> str:
    raise NotImplementedError("LLM prompt over score + factors -> credit brief text")
