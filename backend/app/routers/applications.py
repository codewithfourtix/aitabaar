"""Application endpoints — currently backed by the in-memory mock store.

The dashboard and WhatsApp bot build against these routes; the AI engine
team swaps the internals (DB + real engine) without changing the contract.
"""

from datetime import datetime, timezone

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from app import mock_data
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
    """Mock mode: stores metadata only, file bytes are read and discarded.
    Real mode: persist to Supabase Storage and run extraction."""
    app = _get_or_404(app_id)
    await file.read()
    doc = Document(
        id=f"DOC-{sum(len(a.documents) for a in mock_data.APPLICATIONS.values()) + 1:03d}",
        type=type,
        filename=file.filename or f"{type.value}.bin",
        uploaded_at=_now(),
    )
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


@router.post("/{app_id}/score", response_model=Application)
def score_application(app_id: str):
    """Trigger the AI engine. Mock: copies the seeded APP-001 score."""
    app = _get_or_404(app_id)
    seeded = mock_data.APPLICATIONS["APP-001"]
    app.score = seeded.score
    app.status = ApplicationStatus.scored
    app.audit_trail.append(
        AuditEvent(at=_now(), actor="engine", action="scored", detail="MOCK score")
    )
    app.updated_at = _now()
    return app


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
