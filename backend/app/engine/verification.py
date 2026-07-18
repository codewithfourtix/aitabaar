"""Stage 2 - Verification: deterministic cross-document checks, no LLM,
run BEFORE scoring so an obvious mismatch never reaches the model unflagged.

Flags are formatted strings ("[SEVERITY] CODE: message") rather than a
structured object - docs/dashboard-spec.md already renders
verification_flags/inconsistency_flags as plain text, so this avoids a
breaking contract change. A HIGH flag still lets scoring proceed; it's
surfaced at the top of the brief instead (see rationale.py).
"""

import re

from rapidfuzz import fuzz

from app.models.schemas import Application, Document, DocumentType

_TITLE_PATTERN = re.compile(r"\b(mr|mrs|ms|md|syed|s/o|d/o|w/o)\b\.?", re.IGNORECASE)
_CNIC_PATTERN = re.compile(r"^\d{5}-\d{7}-\d$")

NAME_MATCH_THRESHOLD = 80  # rapidfuzz score, 0-100
INCOME_RATIO_THRESHOLD = 3.0
BOUNCED_CHEQUES_THRESHOLD = 3


def _normalize_name(name: str) -> str:
    name = name.lower()
    name = _TITLE_PATTERN.sub("", name)
    name = re.sub(r"[.,]", "", name)
    return re.sub(r"\s+", " ", name).strip()


def _doc_by_type(application: Application, doc_type: DocumentType) -> Document | None:
    return next((d for d in application.documents if d.type == doc_type), None)


def verify(application: Application) -> list[str]:
    flags: list[str] = []
    cnic_doc = _doc_by_type(application, DocumentType.cnic)
    bank_doc = _doc_by_type(application, DocumentType.bank_statement)
    utility_doc = _doc_by_type(application, DocumentType.utility_bill)
    questionnaire_doc = _doc_by_type(application, DocumentType.business_questionnaire)

    for doc_type, doc in (
        (DocumentType.cnic, cnic_doc),
        (DocumentType.bank_statement, bank_doc),
        (DocumentType.utility_bill, utility_doc),
    ):
        if doc is None:
            flags.append(f"[HIGH] MISSING_DOCUMENT: no {doc_type.value} on file")

    if cnic_doc and cnic_doc.extracted_fields.get("cnic"):
        cnic_number = str(cnic_doc.extracted_fields["cnic"])
        if not _CNIC_PATTERN.match(cnic_number):
            msg = f"[HIGH] CNIC_FORMAT_INVALID: '{cnic_number}' is not in #####-#######-# format"
            flags.append(msg)
            cnic_doc.verification_flags.append(msg)

    if cnic_doc and bank_doc:
        cnic_name = cnic_doc.extracted_fields.get("name")
        account_title = bank_doc.extracted_fields.get("account_title")
        if cnic_name and account_title:
            similarity = fuzz.token_set_ratio(_normalize_name(cnic_name), _normalize_name(account_title))
            if similarity < NAME_MATCH_THRESHOLD:
                msg = (
                    f"[HIGH] NAME_MISMATCH: CNIC name '{cnic_name}' does not match bank "
                    f"statement account title '{account_title}' (similarity {similarity:.0f}%)"
                )
                flags.append(msg)
                cnic_doc.verification_flags.append(msg)
                bank_doc.verification_flags.append(msg)

    if questionnaire_doc and bank_doc:
        declared = questionnaire_doc.extracted_fields.get("monthly_revenue_pkr")
        inflow = bank_doc.extracted_fields.get("avg_monthly_inflow_pkr")
        if declared and inflow:
            ratio = max(declared, inflow) / max(min(declared, inflow), 1)
            if ratio > INCOME_RATIO_THRESHOLD:
                flags.append(
                    f"[MEDIUM] INCOME_INCONSISTENT: declared monthly revenue (PKR {declared:,.0f}) "
                    f"vs. bank inflow (PKR {inflow:,.0f}) differ by {ratio:.1f}x"
                )

    if bank_doc:
        bounced = bank_doc.extracted_fields.get("bounced_cheques")
        if bounced is not None and bounced >= BOUNCED_CHEQUES_THRESHOLD:
            msg = f"[MEDIUM] NEGATIVE_BALANCE_PATTERN: {bounced} bounced cheques on the statement"
            flags.append(msg)
            bank_doc.verification_flags.append(msg)

    return flags
