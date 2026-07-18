"""Stage 4 - Rationale: turn ScoreResult + SHAP factors into the credit
brief the loan officer reads (docs/dashboard-spec.md's ScoreResult.rationale
paragraph - English only, officer-facing; the bot never reveals score
details to the applicant per docs/whatsapp-bot-flow.md).

Hard rule (the point of the product): the LLM never scores, alters, or
influences the credit decision - XGBoost produces the score, SHAP produces
the reasons, the LLM only writes sentences. It is given ONLY the score,
tier, loan range, top factors and flags via _safe_context() - never raw
applicant data - so it is structurally incapable of inventing a reason the
model didn't use. The template fallback is built first and always
available; the LLM call sits on top of it, so a failed/slow call still
renders a brief.
"""

import logging

from app.engine import llm_client
from app.models.schemas import Application, ScoreResult

logger = logging.getLogger("aitabaar.rationale")


def _safe_context(score: ScoreResult) -> dict:
    return {
        "risk_tier": score.risk_tier,
        "repayment_probability": score.repayment_probability,
        "recommended_amount_pkr": score.recommended_amount_pkr,
        "factors": [
            {"label": f.label, "direction": f.direction, "impact": f.impact} for f in score.factors
        ],
        "flags": list(score.inconsistency_flags),
    }


def _template_brief(context: dict, requested_amount_pkr: int) -> str:
    positives = [f["label"] for f in context["factors"] if f["direction"] == "positive"]
    negatives = [f["label"] for f in context["factors"] if f["direction"] == "negative"]

    sentences = [
        f"This application scores risk tier {context['risk_tier']} with an estimated "
        f"{context['repayment_probability']:.0%} repayment probability."
    ]
    if positives:
        sentences.append("Supporting factors: " + "; ".join(positives) + ".")
    if negatives:
        sentences.append("Concerns: " + "; ".join(negatives) + ".")
    if context["flags"]:
        sentences.append(
            f"Verification raised {len(context['flags'])} flag(s), including: {context['flags'][0]}."
        )
    sentences.append(
        f"Recommended loan amount: PKR {context['recommended_amount_pkr']:,} against a "
        f"request of PKR {requested_amount_pkr:,}."
    )
    return " ".join(sentences)


def _llm_prompt(context: dict, requested_amount_pkr: int) -> str:
    return (
        "You are writing a one-page credit brief for a bank loan officer reviewing an SME "
        "loan application in Pakistan. Write 3-5 plain-language sentences naming the actual "
        "factors below. No hedging, no mention of being an AI, no reason beyond what is "
        "listed here.\n\n"
        f"Risk tier: {context['risk_tier']}\n"
        f"Repayment probability: {context['repayment_probability']:.0%}\n"
        f"Recommended amount: PKR {context['recommended_amount_pkr']:,} "
        f"(requested: PKR {requested_amount_pkr:,})\n"
        f"Top factors: {context['factors']}\n"
        f"Verification flags: {context['flags'] or 'none'}\n"
    )


async def build_brief(application: Application, score: ScoreResult) -> str:
    context = _safe_context(score)
    fallback = _template_brief(context, application.requested_amount_pkr)
    try:
        brief = await llm_client.text(_llm_prompt(context, application.requested_amount_pkr), temperature=0.3)
        return brief.strip() or fallback
    except Exception as exc:  # noqa: BLE001 - a blank brief on stage is unrecoverable; a stiff sentence is not
        logger.warning("LLM brief generation failed for %s, using template: %s", application.id, exc)
        return fallback
