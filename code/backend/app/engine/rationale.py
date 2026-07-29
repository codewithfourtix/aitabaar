"""Stage 4 - Rationale: turn ScoreResult + SHAP factors into the credit
brief the loan officer reads (docs/dashboard-spec.md's ScoreResult.rationale
paragraph - English only, officer-facing; the bot never reveals score
details to the applicant per docs/whatsapp-bot-flow.md).

Hard rule (the point of the product): the LLM never scores, alters, or
influences the credit decision - XGBoost produces the score, SHAP produces
the reasons, app/engine/policy.py produces the recommended action, the LLM
only writes sentences. It is given ONLY the score, tier, loan range, top
factors, flags and policy recommendation via _safe_context() - never raw
applicant data - so it is structurally incapable of inventing a reason the
model/policy didn't use. The template fallback is built first and always
available; the LLM call sits on top of it, so a failed/slow call still
renders a brief.

Offline mode: build_brief() skips the live LLM call entirely (no network,
no timeout) whenever `offline=True` is passed in, or the AITABAAR_OFFLINE
env var is truthy. GET /demo/reset always passes offline=True (see
routers/applications.py, main.py) so it never depends on a live LLM call or
API key, independent of how the server was started.
"""

import logging
import os

from app.engine import llm_client
from app.models.schemas import Application, ScoreResult

logger = logging.getLogger("aitabaar.rationale")


def _env_offline() -> bool:
    return os.getenv("AITABAAR_OFFLINE", "").strip().lower() in ("1", "true", "yes", "on")


def _safe_context(score: ScoreResult) -> dict:
    return {
        "risk_tier": score.risk_tier,
        "repayment_probability": score.repayment_probability,
        "recommended_amount_pkr": score.recommended_amount_pkr,
        "factors": [
            {"label": f.label, "direction": f.direction, "impact": f.impact} for f in score.factors
        ],
        "flags": list(score.inconsistency_flags),
        "recommended_action": score.recommended_action.value,
        "policy_overridden": score.policy_overridden,
        "override_reason": score.override_reason,
        "decision_reasons": list(score.decision_reasons),
        "data_completeness": score.data_completeness,
        "completeness_band": score.completeness_band,
    }


def _completeness_downgrade_note(context: dict) -> str | None:
    return next((r for r in context["decision_reasons"] if r.startswith("Low data completeness")), None)


def _template_brief(context: dict, requested_amount_pkr: int) -> str:
    positives = [f["label"] for f in context["factors"] if f["direction"] == "positive"]
    negatives = [f["label"] for f in context["factors"] if f["direction"] == "negative"]
    completeness_note = _completeness_downgrade_note(context)

    sentences = [f"Recommended action: {context['recommended_action']}."]
    if context["policy_overridden"] and context["override_reason"]:
        sentences.append(f"Held for review — {context['override_reason']}.")
    elif completeness_note:
        sentences.append(completeness_note)
    sentences.append(
        f"Data completeness: {context['data_completeness']:.0%} ({context['completeness_band']})."
    )
    sentences.append(
        f"This application scores risk tier {context['risk_tier']} with an estimated "
        f"{context['repayment_probability']:.0%} repayment probability."
    )
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
    override_line = (
        f"Policy override: HELD FOR REVIEW — {context['override_reason']}\n"
        if context["policy_overridden"] and context["override_reason"]
        else ""
    )
    completeness_note = _completeness_downgrade_note(context)
    completeness_line = f"Note: {completeness_note}\n" if completeness_note else ""
    return (
        "You are writing a one-page credit brief for a bank loan officer reviewing an SME "
        "loan application in Pakistan. Start with one short sentence stating the recommended "
        f"action ({context['recommended_action']}) — if there is a policy override or a low-"
        "data-completeness note below, that sentence must state it plainly. Then write 3-5 "
        "plain-language sentences naming the actual factors below. No hedging, no mention of "
        "being an AI, no reason beyond what is listed here.\n\n"
        f"Recommended action: {context['recommended_action']}\n"
        f"{override_line}"
        f"{completeness_line}"
        f"Data completeness: {context['data_completeness']:.0%} ({context['completeness_band']})\n"
        f"Risk tier: {context['risk_tier']}\n"
        f"Repayment probability: {context['repayment_probability']:.0%}\n"
        f"Recommended amount: PKR {context['recommended_amount_pkr']:,} "
        f"(requested: PKR {requested_amount_pkr:,})\n"
        f"Top factors: {context['factors']}\n"
        f"Verification flags: {context['flags'] or 'none'}\n"
    )


async def build_brief(application: Application, score: ScoreResult, offline: bool = False) -> str:
    context = _safe_context(score)
    fallback = _template_brief(context, application.requested_amount_pkr)
    if offline or _env_offline():
        return fallback
    try:
        brief = await llm_client.text(_llm_prompt(context, application.requested_amount_pkr), temperature=0.3)
        return brief.strip() or fallback
    except Exception as exc:  # noqa: BLE001 - a blank brief on stage is unrecoverable; a stiff sentence is not
        logger.warning("LLM brief generation failed for %s, using template: %s", application.id, exc)
        return fallback
