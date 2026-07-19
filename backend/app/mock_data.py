"""In-memory application store.

No DB for the hackathon demo (see docs/decisions.md) — this dict lives for
the life of the running process, which is exactly a demo's lifetime.
`reset()` re-seeds the four-applicant narrative used for judging: a clean
approve, a borderline case, a CNIC/bank-statement name-mismatch fraud flag
(docs/decisions.md #12), and a thin-file case (item 1.1) — a legitimate but
under-documented applicant whose tier would otherwise approve, exercising
the data-completeness downgrade in app/engine/policy.py live. Documents are
seeded with extraction already "done" (as if a vision call already ran) so
/demo/reset can run each one through the real verify -> score -> brief
pipeline without needing real document images on hand.
"""

from datetime import datetime, timezone

from app.models.schemas import (
    Applicant,
    Application,
    ApplicationStatus,
    AuditEvent,
    Channel,
    Document,
    DocumentType,
    Language,
)


def _now() -> datetime:
    return datetime.now(timezone.utc)


APPLICATIONS: dict[str, Application] = {}


def _clean_approve() -> Application:
    return Application(
        id="APP-001",
        channel=Channel.whatsapp,
        status=ApplicationStatus.submitted,
        applicant=Applicant(
            name="Muhammad Imran",
            cnic_number="42101-1234567-1",
            phone="+923001234567",
            business_name="Imran General Store",
            business_type="Retail / Kiryana",
            city="Karachi",
            language=Language.ur,
            consent_given=True,
        ),
        requested_amount_pkr=500_000,
        documents=[
            Document(
                id="DOC-001",
                type=DocumentType.cnic,
                filename="cnic_front.jpg",
                uploaded_at=_now(),
                status="extracted",
                extracted_fields={
                    "name": "Muhammad Imran",
                    "cnic": "42101-1234567-1",
                    "dob": "1985-03-14",
                    "address": "Shop 12, Tariq Road, Karachi",
                },
            ),
            Document(
                id="DOC-002",
                type=DocumentType.bank_statement,
                filename="ubl_statement_6m.pdf",
                uploaded_at=_now(),
                status="extracted",
                extracted_fields={
                    "account_title": "Muhammad Imran",
                    "avg_monthly_inflow_pkr": 410_000,
                    "avg_monthly_outflow_pkr": 350_000,
                    "months": 6,
                    "end_balance_pkr": 180_000,
                    "bounced_cheques": 0,
                    "account_age_months": 96,
                },
            ),
            Document(
                id="DOC-003",
                type=DocumentType.utility_bill,
                filename="kelectric_june.jpg",
                uploaded_at=_now(),
                status="extracted",
                extracted_fields={
                    "name": "Muhammad Imran",
                    "address": "Shop 12, Tariq Road, Karachi",
                    "on_time": True,
                    "months_history": 6,
                },
            ),
            Document(
                id="DOC-004",
                type=DocumentType.business_questionnaire,
                filename="questionnaire.json",
                uploaded_at=_now(),
                status="extracted",
                extracted_fields={
                    "years_in_business": 8,
                    "employees": 3,
                    "monthly_revenue_pkr": 480_000,
                    "loan_purpose": "Inventory restock for Ramzan season",
                    "registered": True,
                    "premises_owned": True,
                    "years_at_premises": 6,
                    "has_existing_loan": False,
                    "existing_installment_pkr": 0,
                },
            ),
        ],
        audit_trail=[
            AuditEvent(at=_now(), actor="system", action="created", detail="via whatsapp"),
            AuditEvent(at=_now(), actor="system", action="submitted", detail="demo seed"),
        ],
        created_at=_now(),
        updated_at=_now(),
    )


def _borderline() -> Application:
    return Application(
        id="APP-002",
        channel=Channel.portal,
        status=ApplicationStatus.submitted,
        applicant=Applicant(
            name="Ayesha Siddiqui",
            cnic_number="35202-7654321-2",
            phone="+923219876543",
            business_name="Ayesha Boutique",
            business_type="Tailoring / Fashion",
            city="Lahore",
            language=Language.en,
            consent_given=True,
        ),
        # Nudged up from 700k after item 1.3's synthetic-data reanchoring
        # (docs/decisions.md open question) raised the population's median
        # requested_amount_pkr to ~2.1M — at 700k her turnover-to-loan
        # ratio read as above-average leverage, no longer "borderline"
        # against the new baseline. 1.3M keeps her income/cashflow story
        # unchanged but makes the ask genuinely stretched against it.
        requested_amount_pkr=1_300_000,
        documents=[
            Document(
                id="DOC-005",
                type=DocumentType.cnic,
                filename="cnic.jpg",
                uploaded_at=_now(),
                status="extracted",
                extracted_fields={
                    "name": "Ayesha Siddiqui",
                    "cnic": "35202-7654321-2",
                    "dob": "1990-11-02",
                    "address": "House 45, Model Town, Lahore",
                },
            ),
            Document(
                id="DOC-006",
                type=DocumentType.bank_statement,
                filename="bank_statement.pdf",
                uploaded_at=_now(),
                status="extracted",
                extracted_fields={
                    # Cashflow thinned and bounced cheques raised to 3 after
                    # item 1.3's reanchoring, alongside the requested_amount
                    # nudge above — the requested-amount change alone
                    # topped out at tier B (still auto-approve) against the
                    # reanchored population; this combination restores
                    # tier C, and 3 bounced cheques also trips
                    # verification's own MEDIUM threshold (not HIGH) —
                    # still a borderline story, not a fraud one.
                    "account_title": "Ayesha Siddiqui",
                    "avg_monthly_inflow_pkr": 150_000,
                    "avg_monthly_outflow_pkr": 145_000,
                    "months": 6,
                    "end_balance_pkr": 25_000,
                    "bounced_cheques": 3,
                    "account_age_months": 24,
                },
            ),
            Document(
                id="DOC-007",
                type=DocumentType.utility_bill,
                filename="lesco_bill.jpg",
                uploaded_at=_now(),
                status="extracted",
                extracted_fields={
                    "name": "Ayesha Siddiqui",
                    "address": "House 45, Model Town, Lahore",
                    "on_time": False,
                    "months_history": 6,
                },
            ),
            Document(
                id="DOC-008",
                type=DocumentType.business_questionnaire,
                filename="questionnaire.json",
                uploaded_at=_now(),
                status="extracted",
                extracted_fields={
                    "years_in_business": 2,
                    "employees": 2,
                    "monthly_revenue_pkr": 210_000,
                    "loan_purpose": "New sewing machines",
                    "registered": False,
                    "premises_owned": False,
                    "years_at_premises": 2,
                    "has_existing_loan": False,
                    "existing_installment_pkr": 0,
                },
            ),
        ],
        audit_trail=[
            AuditEvent(at=_now(), actor="system", action="created", detail="via portal"),
            AuditEvent(at=_now(), actor="system", action="submitted", detail="demo seed"),
        ],
        created_at=_now(),
        updated_at=_now(),
    )


def _fraud_flag() -> Application:
    return Application(
        id="APP-003",
        channel=Channel.whatsapp,
        status=ApplicationStatus.submitted,
        applicant=Applicant(
            name="Bilal Hussain",
            cnic_number="33100-9988776-5",
            phone="+923331122334",
            business_name="Hussain Textiles",
            business_type="Textiles / Wholesale",
            city="Faisalabad",
            language=Language.ur,
            consent_given=True,
        ),
        requested_amount_pkr=1_000_000,
        documents=[
            Document(
                id="DOC-009",
                type=DocumentType.cnic,
                filename="cnic.jpg",
                uploaded_at=_now(),
                status="extracted",
                extracted_fields={
                    "name": "Bilal Hussain",
                    "cnic": "33100-9988776-5",
                    "dob": "1982-06-20",
                    "address": "Plot 9, Industrial Area, Faisalabad",
                },
            ),
            Document(
                id="DOC-010",
                type=DocumentType.bank_statement,
                filename="bank_statement.pdf",
                uploaded_at=_now(),
                status="extracted",
                extracted_fields={
                    # Deliberate mismatch vs CNIC name — the fraud-flag demo case.
                    "account_title": "M. Hussain Shahid",
                    "avg_monthly_inflow_pkr": 650_000,
                    "avg_monthly_outflow_pkr": 500_000,
                    "months": 6,
                    "end_balance_pkr": 300_000,
                    "bounced_cheques": 0,
                    "account_age_months": 120,
                },
            ),
            Document(
                id="DOC-011",
                type=DocumentType.utility_bill,
                filename="utility_bill.jpg",
                uploaded_at=_now(),
                status="extracted",
                extracted_fields={
                    "name": "Bilal Hussain",
                    "address": "Plot 9, Industrial Area, Faisalabad",
                    "on_time": True,
                    "months_history": 6,
                },
            ),
            Document(
                id="DOC-012",
                type=DocumentType.business_questionnaire,
                filename="questionnaire.json",
                uploaded_at=_now(),
                status="extracted",
                extracted_fields={
                    "years_in_business": 10,
                    "employees": 15,
                    "monthly_revenue_pkr": 700_000,
                    "loan_purpose": "Working capital",
                    "registered": True,
                    "premises_owned": True,
                    "years_at_premises": 8,
                    "has_existing_loan": False,
                    "existing_installment_pkr": 0,
                },
            ),
        ],
        audit_trail=[
            AuditEvent(at=_now(), actor="system", action="created", detail="via whatsapp"),
            AuditEvent(at=_now(), actor="system", action="submitted", detail="demo seed"),
        ],
        created_at=_now(),
        updated_at=_now(),
    )


def _thin_file() -> Application:
    """Legitimate SME, genuinely under-documented: a 2-month bank-statement
    excerpt (no cheque history or account-age visible on it) and a
    partly-filled questionnaire (self-reported revenue/years only). No
    fraud signal — CNIC name matches the bank account title exactly.
    Financially this profile would tier A/B on its own (strong
    turnover-to-loan ratio, positive cashflow, zero debt burden); the point
    is that low data_completeness pulls it to REVIEW anyway (item 1.1)."""
    return Application(
        id="APP-004",
        channel=Channel.whatsapp,
        status=ApplicationStatus.submitted,
        applicant=Applicant(
            name="Sana Malik",
            cnic_number="42201-3344556-7",
            phone="+923451234567",
            business_name="Malik Traders",
            business_type="Retail / General Store",
            city="Multan",
            language=Language.en,
            consent_given=True,
        ),
        requested_amount_pkr=400_000,
        documents=[
            Document(
                id="DOC-013",
                type=DocumentType.cnic,
                filename="cnic.jpg",
                uploaded_at=_now(),
                status="extracted",
                extracted_fields={
                    "name": "Sana Malik",
                    "cnic": "42201-3344556-7",
                    "dob": "1988-09-10",
                    "address": "House 22, Cantt, Multan",
                },
            ),
            Document(
                id="DOC-014",
                type=DocumentType.bank_statement,
                filename="bank_statement_excerpt.pdf",
                uploaded_at=_now(),
                status="extracted",
                extracted_fields={
                    # Short 2-month excerpt, not the usual 6 — cheque history
                    # and account age aren't visible on it, so those 2 keys
                    # are genuinely absent, not null-hacked.
                    "account_title": "Sana Malik",
                    "avg_monthly_inflow_pkr": 500_000,
                    "avg_monthly_outflow_pkr": 430_000,
                    "months": 2,
                    "end_balance_pkr": 70_000,
                },
            ),
            Document(
                id="DOC-015",
                type=DocumentType.utility_bill,
                filename="utility_bill.jpg",
                uploaded_at=_now(),
                status="extracted",
                extracted_fields={
                    "name": "Sana Malik",
                    "address": "House 22, Cantt, Multan",
                    "on_time": True,
                    "months_history": 2,
                },
            ),
            Document(
                id="DOC-016",
                type=DocumentType.business_questionnaire,
                filename="questionnaire.json",
                uploaded_at=_now(),
                status="extracted",
                extracted_fields={
                    # Only the self-reported basics — applicant hasn't
                    # completed the registration/premises/existing-loan
                    # questions yet. 6 of 8 questionnaire fields genuinely
                    # absent, not defaulted-and-hidden.
                    "years_in_business": 5,
                    "monthly_revenue_pkr": 550_000,
                    "loan_purpose": "Restocking inventory ahead of harvest season",
                },
            ),
        ],
        audit_trail=[
            AuditEvent(at=_now(), actor="system", action="created", detail="via whatsapp"),
            AuditEvent(at=_now(), actor="system", action="submitted", detail="demo seed"),
        ],
        created_at=_now(),
        updated_at=_now(),
    )


def _build_demo_applications() -> list[Application]:
    return [_clean_approve(), _borderline(), _fraud_flag(), _thin_file()]


def seed() -> None:
    if APPLICATIONS:
        return
    for app in _build_demo_applications():
        APPLICATIONS[app.id] = app


def reset() -> list[Application]:
    """Clear and re-seed the three demo applicants. Returns them so the
    caller (the /demo/reset route) can run each through the real pipeline."""
    APPLICATIONS.clear()
    apps = _build_demo_applications()
    for app in apps:
        APPLICATIONS[app.id] = app
    return apps
