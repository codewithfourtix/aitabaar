"""Post-scoring decision policy: turns (risk_tier, verification flags) into
an officer-facing recommendation. Pure function — reads repayment_probability
and risk_tier via risk_tier only, never writes them; the model's output is
untouched. The officer still makes the final call through
POST /applications/{id}/decision — this only adds a recommendation.

Flags are the same "[SEVERITY] CODE: message" strings verification.py
produces. A flag with no recognized [HIGH]/[MEDIUM]/[LOW] prefix is never
silently ignored — an unparseable flag is exactly the case where staying
quiet is most dangerous, so it is treated at least as urgent as a HIGH flag
and always lands in decision_reasons.

Rules, in order:
  1. Any HIGH (or unrecognized-severity) flag -> REVIEW, policy_overridden=True,
     override_reason names the flag(s). Never APPROVE, regardless of tier.
  2. No HIGH/unrecognized flag, but the tier would otherwise APPROVE (A/B),
     and either a MEDIUM flag is present or data_completeness is below
     _LOW_COMPLETENESS_THRESHOLD -> soft-downgrade to REVIEW,
     policy_overridden=False (a nudge, not an override; both reasons are
     listed if both apply).
  3. Otherwise: tier A/B -> APPROVE, tier C -> REVIEW, tier D -> DECLINE.
"""

import re
from dataclasses import dataclass, field

from app.models.schemas import RecommendedAction

_SEVERITY_RE = re.compile(r"^\[(HIGH|MEDIUM|LOW)\]\s*")

_TIER_DEFAULT_ACTION = {
    "A": RecommendedAction.approve,
    "B": RecommendedAction.approve,
    "C": RecommendedAction.review,
    "D": RecommendedAction.decline,
}

_LOW_COMPLETENESS_THRESHOLD = 0.6


@dataclass
class PolicyDecision:
    recommended_action: RecommendedAction
    decision_reasons: list[str] = field(default_factory=list)
    policy_overridden: bool = False
    override_reason: str | None = None


def _parse_severity(flag: str) -> tuple[str, str]:
    """Returns (severity, message-without-prefix). Unrecognized/missing
    prefix -> severity "UNKNOWN", the full original string kept as the
    message so nothing is lost."""
    match = _SEVERITY_RE.match(flag)
    if match:
        return match.group(1), flag[match.end():].strip()
    return "UNKNOWN", flag.strip()


def decide(risk_tier: str, flags: list[str], data_completeness: float = 1.0) -> PolicyDecision:
    default_action = _TIER_DEFAULT_ACTION.get(risk_tier, RecommendedAction.review)
    tier_reason = f"Risk tier {risk_tier} — default policy is {default_action.value}."

    parsed = [_parse_severity(f) for f in flags]
    blocking = [msg for sev, msg in parsed if sev in ("HIGH", "UNKNOWN")]
    medium = [msg for sev, msg in parsed if sev == "MEDIUM"]

    if blocking:
        return PolicyDecision(
            recommended_action=RecommendedAction.review,
            decision_reasons=[tier_reason, *blocking, *medium],
            policy_overridden=True,
            override_reason="; ".join(blocking),
        )

    soft_downgrade_reasons = list(medium)
    if default_action == RecommendedAction.approve and data_completeness < _LOW_COMPLETENESS_THRESHOLD:
        soft_downgrade_reasons.append(
            f"Low data completeness ({data_completeness:.0%}) — decision rests heavily on defaulted values."
        )

    if soft_downgrade_reasons and default_action == RecommendedAction.approve:
        return PolicyDecision(
            recommended_action=RecommendedAction.review,
            decision_reasons=[tier_reason, *soft_downgrade_reasons],
            policy_overridden=False,
            override_reason=None,
        )

    return PolicyDecision(
        recommended_action=default_action,
        decision_reasons=[tier_reason],
        policy_overridden=False,
        override_reason=None,
    )
