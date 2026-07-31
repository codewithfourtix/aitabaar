"""Stage: bilingual loan-terms disclosure (Regulation R-12) — English and
Urdu, deterministic templates only (no LLM). A regulatory disclosure must
not vary between calls or invent wording, unlike the officer-only
rationale (rationale.py), which can use an LLM because it only narrates
factors that already came from the model/policy layer.

Applicant-facing and terms-only: never the score, tier, probability, or
SHAP factors the officer-only credit brief carries (see rationale.py's own
"the bot never reveals score details to the applicant" rule — this module
follows the same boundary). recommended_action is the AI's recommendation
only; every template says plainly that a bank officer makes the final
call, since POST /applications/{id}/decision is the only thing that
actually changes an application's status.
"""

from app.models.schemas import Application, Disclosure, RecommendedAction, ScoreResult

_EN = {
    RecommendedAction.approve: (
        "Application {app_id} — AI-recommended terms (subject to final review by a bank "
        "loan officer): recommended amount PKR {amount:,} against your request of "
        "PKR {requested:,}. This is not a final decision — a bank officer will confirm "
        "the approved amount and terms before any funds are disbursed."
    ),
    RecommendedAction.review: (
        "Application {app_id} is still under review by a bank loan officer. No amount "
        "has been finalized yet — we will update you here as soon as a decision is made."
    ),
    RecommendedAction.decline: (
        "Application {app_id} does not currently meet our lending criteria. A bank "
        "loan officer will review your application and may contact you for additional "
        "information."
    ),
}

_UR = {
    RecommendedAction.approve: (
        "درخواست {app_id} — AI کی تجویز کردہ شرائط (حتمی منظوری بینک کے قرض آفیسر سے مشروط ہے): "
        "تجویز کردہ رقم PKR {amount:,} بمقابلہ آپ کی درخواست کردہ رقم PKR {requested:,}۔ "
        "یہ حتمی فیصلہ نہیں ہے — رقم کی ادائیگی سے پہلے بینک آفیسر منظور شدہ رقم اور "
        "شرائط کی تصدیق کرے گا۔"
    ),
    RecommendedAction.review: (
        "درخواست {app_id} تاحال بینک کے قرض آفیسر کے زیرِ جائزہ ہے۔ ابھی تک کوئی رقم طے "
        "نہیں کی گئی — فیصلہ ہوتے ہی آپ کو یہاں مطلع کیا جائے گا۔"
    ),
    RecommendedAction.decline: (
        "درخواست {app_id} فی الحال ہمارے قرض کے معیار پر پوری نہیں اترتی۔ بینک کا قرض "
        "آفیسر آپ کی درخواست کا جائزہ لے گا اور مزید معلومات کے لیے رابطہ کر سکتا ہے۔"
    ),
}


def build(application: Application, score: ScoreResult) -> Disclosure:
    kwargs = {
        "app_id": application.id,
        "amount": score.recommended_amount_pkr,
        "requested": application.requested_amount_pkr,
    }
    return Disclosure(
        en=_EN[score.recommended_action].format(**kwargs),
        ur=_UR[score.recommended_action].format(**kwargs),
    )
