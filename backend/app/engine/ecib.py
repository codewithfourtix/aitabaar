"""Stage: mandatory e-CIB / bureau credit-information check (Regulation
R-7) — run once per submission, between verification and scoring, so a
materially overdue bureau record can force REVIEW with a documented
reason before the model ever produces a score.

MOCK — e-CIB (State Bank's Electronic Credit Information Bureau) is
bank-facing; a real pull requires the partner bank's access, which only
exists once a bank partnership is in place (Model A, see
docs/compliance-sbp.md). This module stands in with a deterministic,
seeded-by-CNIC result so demo runs stay reproducible and offline — it is
never presented as a real bureau record, and the note on every result says
so via the "unavailable"/mock framing in ECIBCheck.
"""

import hashlib
from datetime import datetime, timezone

from app.models.schemas import Application, ECIBCheck, ECIBStatus

# The curated demo personas (app/mock_data.py) are whitelisted to "clear"
# so the existing demo narrative (clean approve / borderline / fraud flag /
# thin file) is undisturbed by adding this stage. Any other CNIC gets a
# small, deterministic (hash-based, not random) chance of "overdue" so the
# R-7 gate is visibly exercisable on a fresh, live application.
_DEMO_CLEAR_CNICS = {
    "42101-1234567-1",
    "35202-7654321-2",
    "33100-9988776-5",
    "42201-3344556-7",
}

_OVERDUE_BUCKET_PCT = 15  # ~15% of the CNIC hash space maps to "overdue"


def check(application: Application) -> ECIBCheck:
    cnic = application.applicant.cnic_number
    now = datetime.now(timezone.utc)

    if not cnic:
        return ECIBCheck(
            status=ECIBStatus.unavailable,
            note="No verified CNIC on file yet — e-CIB check requires one (mock).",
            checked_at=now,
        )

    if cnic not in _DEMO_CLEAR_CNICS:
        digest = hashlib.sha256(cnic.encode("utf-8")).hexdigest()
        bucket = int(digest[:8], 16) % 100
        if bucket < _OVERDUE_BUCKET_PCT:
            return ECIBCheck(
                status=ECIBStatus.overdue,
                note="Mock e-CIB record shows a materially overdue facility at another institution.",
                checked_at=now,
            )

    return ECIBCheck(status=ECIBStatus.clear, note="No overdue exposure on file (mock).", checked_at=now)
