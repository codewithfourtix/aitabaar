"""Application endpoints — currently backed by the in-memory mock store.

The dashboard and WhatsApp bot build against these routes; the AI engine
team swaps the internals (DB + real engine) without changing the contract.
"""

import json
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from app import mock_data, storage
from app.engine import extraction, policy, rationale, scoring, verification
from app.models.schemas import (
    Application,
    ApplicationCreate,
    ApplicationStatus,
    AuditEvent,
    DecisionRequest,
    Document,
    DocumentType,
)

router = APIRouter(prefix="/applications", tags=["applications"])
logger = logging.getLogger("aitabaar.applications")


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _get_or_404(app_id: str) -> Application:
    app = mock_data.APPLICATIONS.get(app_id)
    if app is None:
        raise HTTPException(status_code=404, detail=f"Application {app_id} not found")
    return app


@router.get("", response_model=list[Application])
def list_applications(status: ApplicationStatus | None = None, phone: str | None = None):
    apps = list(mock_data.APPLICATIONS.values())
    if status is not None:
        apps = [a for a in apps if a.status == status]
    if phone is not None:
        apps = [a for a in apps if a.applicant.phone == phone]
    return sorted(apps, key=lambda a: a.created_at, reverse=True)


@router.get("/{app_id}", response_model=Application)
def get_application(app_id: str):
    return _get_or_404(app_id)


@router.post("", response_model=Application, status_code=201)
def create_application(body: ApplicationCreate):
    app_id = f"APP-{len(mock_data.APPLICATIONS) + 1:03d}"
    app = Application(
        id=app_id,
        channel=body.channel,
        status=ApplicationStatus.draft,
        applicant=body.applicant,
        requested_amount_pkr=body.requested_amount_pkr,
        audit_trail=[
            AuditEvent(at=_now(), actor="system", action="created", detail=f"via {body.channel.value}"),
        ],
        created_at=_now(),
        updated_at=_now(),
    )
    mock_data.APPLICATIONS[app_id] = app
    return app


@router.post("/{app_id}/documents", response_model=Document, status_code=201)
async def upload_document(app_id: str, type: DocumentType = Form(...), file: UploadFile = File(...)):
    """Persists the file locally (no Supabase for the demo, see docs/decisions.md)
    and stores metadata. Image/PDF documents are extracted later, during
    /score, so upload stays fast. business_questionnaire is plain JSON from
    the bot/portal — no vision call needed, so it's parsed immediately."""
    app = _get_or_404(app_id)
    if not app.applicant.consent_given:
        raise HTTPException(status_code=403, detail="Consent not given for this application")

    content = await file.read()
    doc_id = f"DOC-{sum(len(a.documents) for a in mock_data.APPLICATIONS.values()) + 1:03d}"
    filename = file.filename or f"{type.value}.bin"
    storage.save(app_id, doc_id, filename, content)

    doc = Document(id=doc_id, type=type, filename=filename, uploaded_at=_now())

    if type == DocumentType.business_questionnaire:
        try:
            doc.extracted_fields = json.loads(content)
            doc.status = "extracted"
        except (json.JSONDecodeError, UnicodeDecodeError):
            doc.status = "failed"
            logger.warning("business_questionnaire upload for %s was not valid JSON", app_id)

    app.documents.append(doc)
    app.audit_trail.append(
        AuditEvent(at=_now(), actor="system", action="document_uploaded", detail=type.value)
    )
    app.updated_at = _now()
    return doc


@router.post("/{app_id}/submit", response_model=Application)
def submit_application(app_id: str):
    app = _get_or_404(app_id)
    app.status = ApplicationStatus.submitted
    app.pending_doc_requests = []
    app.audit_trail.append(AuditEvent(at=_now(), actor="system", action="submitted"))
    app.updated_at = _now()
    return app


async def run_full_pipeline(app: Application, force_offline: bool = False) -> Application:
    """Extract -> verify -> score -> decide -> explain, one AuditEvent per
    stage. Any stage exception lands status=failed with the reason recorded
    — a demo that shows an honest error beats one that hangs (see spec's
    non-negotiables). Shared by POST /score and GET /demo/reset so both
    paths run the exact same pipeline; /demo/reset passes force_offline=True
    so it never depends on a live LLM call (see main.py)."""
    app.status = ApplicationStatus.processing
    app.updated_at = _now()

    try:
        pending = [d for d in app.documents if d.status == "pending"]
        for doc in pending:
            path = storage.path_for(doc.id)
            if path is None:
                doc.status = "failed"
                continue
            file_bytes = storage.load(path)
            await extraction.extract(doc, file_bytes)
        app.audit_trail.append(
            AuditEvent(
                at=_now(),
                actor="engine",
                action="extracted",
                detail=f"{len(pending)} document(s) processed",
            )
        )

        flags = verification.verify(app)
        app.audit_trail.append(
            AuditEvent(at=_now(), actor="engine", action="verified", detail=f"{len(flags)} flag(s)")
        )

        result = scoring.score(app)
        result.inconsistency_flags = flags
        app.audit_trail.append(
            AuditEvent(
                at=_now(),
                actor="engine",
                action="scored",
                detail=f"tier {result.risk_tier}, p={result.repayment_probability:.2f}",
            )
        )

        decision = policy.decide(result.risk_tier, flags, result.data_completeness)
        result.recommended_action = decision.recommended_action
        result.decision_reasons = decision.decision_reasons
        result.policy_overridden = decision.policy_overridden
        result.override_reason = decision.override_reason
        app.audit_trail.append(
            AuditEvent(
                at=_now(),
                actor="engine",
                action="decided",
                detail=(
                    f"{decision.recommended_action.value}"
                    + (f" (overridden: {decision.override_reason})" if decision.policy_overridden else "")
                ),
            )
        )

        result.rationale = await rationale.build_brief(app, result, offline=force_offline)
        app.audit_trail.append(AuditEvent(at=_now(), actor="engine", action="explained"))

        app.score = result
        app.status = ApplicationStatus.scored
    except Exception as exc:  # noqa: BLE001 - a stage failing must never hang the app
        logger.exception("Pipeline failed for %s", app.id)
        app.status = ApplicationStatus.failed
        app.audit_trail.append(AuditEvent(at=_now(), actor="engine", action="failed", detail=str(exc)))

    app.updated_at = _now()
    return app


@router.post("/{app_id}/score", response_model=Application)
async def score_application(app_id: str):
    """Trigger the AI engine: extract -> verify -> score -> explain."""
    app = _get_or_404(app_id)
    return await run_full_pipeline(app)


@router.post("/{app_id}/decision", response_model=Application)
def make_decision(app_id: str, body: DecisionRequest):
    app = _get_or_404(app_id)
    status_map = {
        "approve": ApplicationStatus.approved,
        "reject": ApplicationStatus.rejected,
        "request_docs": ApplicationStatus.needs_docs,
    }
    if body.action not in status_map:
        raise HTTPException(status_code=422, detail=f"Unknown action: {body.action}")
    app.status = status_map[body.action]
    if body.action == "request_docs":
        app.pending_doc_requests = body.requested_doc_types
    app.audit_trail.append(
        AuditEvent(at=_now(), actor=body.officer, action=body.action, detail=body.note)
    )
    app.updated_at = _now()
    return app
