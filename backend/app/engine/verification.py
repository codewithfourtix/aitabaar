"""Stage 2 — Verification: cross-check extracted fields, flag inconsistencies
BEFORE scoring (e.g. CNIC name vs bank statement name, address mismatches,
statement gaps). Flags land in Document.verification_flags and
ScoreResult.inconsistency_flags.

Owner: Anas / Obaid.
"""

from app.models.schemas import Application


def verify(application: Application) -> list[str]:
    raise NotImplementedError("Implement cross-document consistency checks")
