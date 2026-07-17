"""In-memory mock store so the dashboard and bot can build against real
shapes before the AI engine and database exist. Replace with DB later."""

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
    ScoreResult,
    ShapFactor,
)


def _now() -> datetime:
    return datetime.now(timezone.utc)


APPLICATIONS: dict[str, Application] = {}


def seed() -> None:
    if APPLICATIONS:
        return

    APPLICATIONS["APP-001"] = Application(
        id="APP-001",
        channel=Channel.whatsapp,
        status=ApplicationStatus.scored,
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
                extracted_fields={"name": "Muhammad Imran", "cnic": "42101-1234567-1"},
            ),
            Document(
                id="DOC-002",
                type=DocumentType.bank_statement,
                filename="ubl_statement_6m.pdf",
                uploaded_at=_now(),
                extracted_fields={"avg_monthly_inflow_pkr": 410_000, "months": 6},
            ),
        ],
        score=ScoreResult(
            repayment_probability=0.81,
            risk_tier="B",
            recommended_amount_pkr=400_000,
            factors=[
                ShapFactor(
                    feature="avg_monthly_inflow",
                    label="Average monthly deposits (PKR 410k)",
                    impact=0.14,
                    direction="positive",
                ),
                ShapFactor(
                    feature="inflow_volatility",
                    label="Seasonal dip in deposits (Ramzan months)",
                    impact=-0.06,
                    direction="negative",
                ),
                ShapFactor(
                    feature="utility_payment_streak",
                    label="18 months of on-time utility payments",
                    impact=0.09,
                    direction="positive",
                ),
            ],
            rationale=(
                "Stable retail business with consistent deposits over 6 months. "
                "Deposit volatility is seasonal, not structural. Recommended amount "
                "capped at ~1x average monthly inflow to keep instalments serviceable."
            ),
            inconsistency_flags=[],
        ),
        audit_trail=[
            AuditEvent(at=_now(), actor="system", action="submitted", detail="via WhatsApp"),
            AuditEvent(at=_now(), actor="engine", action="scored", detail="tier B, p=0.81"),
        ],
        created_at=_now(),
        updated_at=_now(),
    )

    APPLICATIONS["APP-002"] = Application(
        id="APP-002",
        channel=Channel.portal,
        status=ApplicationStatus.submitted,
        applicant=Applicant(
            name="Ayesha Siddiqui",
            phone="+923219876543",
            business_name="Ayesha Boutique",
            business_type="Tailoring / Fashion",
            city="Lahore",
            language=Language.en,
            consent_given=True,
        ),
        requested_amount_pkr=300_000,
        documents=[
            Document(
                id="DOC-003",
                type=DocumentType.cnic,
                filename="cnic.jpg",
                uploaded_at=_now(),
            ),
        ],
        audit_trail=[
            AuditEvent(at=_now(), actor="system", action="submitted", detail="via portal"),
        ],
        created_at=_now(),
        updated_at=_now(),
    )
