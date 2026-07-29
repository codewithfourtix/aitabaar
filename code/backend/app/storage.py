"""Local filesystem storage for uploaded documents.

No Supabase for the demo (docs/decisions.md) — files live under
backend/data/uploads/, which .gitignore already excludes. Good enough for a
single running demo process; not durable across redeploys.
"""

from pathlib import Path

UPLOAD_ROOT = Path(__file__).resolve().parent.parent / "data" / "uploads"

# document_id -> filesystem path. Internal only — not part of the API
# contract (Document doesn't expose it; dashboard-spec.md cuts file preview).
_PATHS: dict[str, str] = {}


def save(app_id: str, document_id: str, filename: str, content: bytes) -> str:
    app_dir = UPLOAD_ROOT / app_id
    app_dir.mkdir(parents=True, exist_ok=True)
    path = app_dir / f"{document_id}_{filename}"
    path.write_bytes(content)
    _PATHS[document_id] = str(path)
    return str(path)


def path_for(document_id: str) -> str | None:
    return _PATHS.get(document_id)


def load(path: str) -> bytes:
    return Path(path).read_bytes()
