"""Shared API contract for Aitabaar.

This file is the single source of truth for the shapes exchanged between
the backend, the WhatsApp bot, the dashboard and the portal.
Change it here first, then tell the team (see docs/api.md).
"""

from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field


class Channel(str, Enum):
    whatsapp = "whatsapp"
    portal = "portal"


class Language(str, Enum):
    en = "en"
    ur = "ur"


class ApplicationStatus(str, Enum):
    draft = "draft"                  # applicant still uploading
    submitted = "submitted"          # all docs in, waiting for engine
    processing = "processing"        # engine running
    needs_docs = "needs_docs"        # officer requested more documents
    scored = "scored"                # credit brief ready for officer review
    approved = "approved"
    rejected = "rejected"
    failed = "failed"                # a pipeline stage errored; see audit_trail for detail


class DocumentType(str, Enum):
    cnic = "cnic"
    bank_statement = "bank_statement"
    utility_bill = "utility_bill"
    business_questionnaire = "business_questionnaire"


class Document(BaseModel):
    id: str
    type: DocumentType
    filename: str
    uploaded_at: datetime
    status: str = "pending"          # "pending" | "extracted" | "failed"
    # Filled by the extraction stage:
    extracted_fields: dict = Field(default_factory=dict)
    verification_flags: list[str] = Field(default_factory=list)


class Applicant(BaseModel):
    name: str
    cnic_number: str | None = None
    phone: str
    business_name: str
    business_type: str | None = None
    city: str | None = None
    language: Language = Language.en
    consent_given: bool = False


class ShapFactor(BaseModel):
    """One SHAP explanation row: why the score moved up or down."""
    feature: str                     # e.g. "avg_monthly_inflow"
    label: str                       # human-readable, e.g. "Average monthly deposits"
    impact: float                    # signed contribution to the score
    direction: str                   # "positive" | "negative"


class RecommendedAction(str, Enum):
    """Policy-layer recommendation only — the officer still decides via
    POST /applications/{id}/decision. Never set by the scoring model itself."""
    approve = "APPROVE"
    review = "REVIEW"
    decline = "DECLINE"


class ScoreResult(BaseModel):
    repayment_probability: float = Field(ge=0, le=1)
    risk_tier: str                   # "A" | "B" | "C" | "D"
    recommended_amount_pkr: int
    factors: list[ShapFactor]
    rationale: str                   # one-paragraph plain-language credit brief
    inconsistency_flags: list[str] = Field(default_factory=list)
    # Policy layer (app/engine/policy.py) — set after scoring + verification,
    # never by the model. repayment_probability/risk_tier above are untouched.
    recommended_action: RecommendedAction = RecommendedAction.review
    decision_reasons: list[str] = Field(default_factory=list)
    policy_overridden: bool = False
    override_reason: str | None = None
    # Data completeness (app/engine/scoring.py) — how much of the feature
    # row came from real extracted values vs. median fallback. Feeds the
    # policy layer's low-completeness downgrade; never changes the model
    # output above.
    data_completeness: float = 1.0
    defaulted_fields: list[str] = Field(default_factory=list)
    completeness_band: str = "HIGH"  # "HIGH" >=0.8 | "MEDIUM" >=0.6 | "LOW" <0.6


class AuditEvent(BaseModel):
    at: datetime
    actor: str                       # "system" | "engine" | officer name
    action: str                      # e.g. "scored", "requested_docs", "approved"
    detail: str = ""


class Application(BaseModel):
    id: str
    channel: Channel
    status: ApplicationStatus
    applicant: Applicant
    requested_amount_pkr: int
    documents: list[Document] = Field(default_factory=list)
    # Doc types the officer asked for via request_docs; cleared on resubmit.
    # The bot reads [0] to ask the applicant for exactly one item.
    pending_doc_requests: list[DocumentType] = Field(default_factory=list)
    score: ScoreResult | None = None
    audit_trail: list[AuditEvent] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime


# ── Request bodies ────────────────────────────────────────

class ApplicationCreate(BaseModel):
    channel: Channel
    applicant: Applicant
    requested_amount_pkr: int


class DecisionRequest(BaseModel):
    officer: str
    action: str                      # "approve" | "reject" | "request_docs"
    note: str = ""
    requested_doc_types: list[DocumentType] = Field(default_factory=list)
