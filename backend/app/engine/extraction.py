"""Stage 1 - Extraction: Gemini vision (via OpenRouter) parses uploaded
documents into structured fields.

Field names match docs/data-model.md's declared extraction targets, plus
`account_title` on bank_statement (needed by verification's NAME_MISMATCH
check; additive, the dashboard renders extracted_fields as a generic
key-value list so extra keys are harmless).

MVP scope: images only (jpg/png) - no PDF parsing. One retry on failure,
then the document is marked failed and the pipeline continues; one bad
document must never kill the whole application.
"""

import json
import logging

from app.engine import llm_client
from app.models.schemas import Document, DocumentType

logger = logging.getLogger("aitabaar.extraction")

_PROMPTS: dict[DocumentType, str] = {
    DocumentType.cnic: (
        "This is a photo of a Pakistani CNIC (national ID card). Extract these "
        "fields as JSON only, no prose, no markdown fences: "
        '{"name": string, "cnic": string in XXXXX-XXXXXXX-X format, '
        '"dob": string YYYY-MM-DD, "address": string}. '
        "Return null for any field you cannot read confidently rather than guessing. "
        "The photo may be angled, low-light, or mix Urdu and English."
    ),
    DocumentType.bank_statement: (
        "This is a page from a Pakistani bank statement. Extract these fields as "
        "JSON only, no prose, no markdown fences: "
        '{"account_title": string, "avg_monthly_inflow_pkr": number, '
        '"avg_monthly_outflow_pkr": number, "months": integer number of months covered, '
        '"end_balance_pkr": number, "bounced_cheques": integer count of bounced/returned cheques}. '
        "Return null for any field you cannot read confidently rather than guessing. "
        "The photo may be angled, low-light, or mix Urdu and English."
    ),
    DocumentType.utility_bill: (
        "This is a photo of a Pakistani utility bill (electricity/gas). Extract these "
        "fields as JSON only, no prose, no markdown fences: "
        '{"name": string consumer name, "address": string, '
        '"on_time": boolean whether paid on/before the due date, '
        '"months_history": integer months of billing history visible}. '
        "Return null for any field you cannot read confidently rather than guessing. "
        "The photo may be angled, low-light, or mix Urdu and English."
    ),
}

_IMAGE_EXTENSIONS = {".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png"}


def _strip_fences(text: str) -> str:
    text = text.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[1] if "\n" in text else text[3:]
        if text.endswith("```"):
            text = text.rsplit("```", 1)[0]
    return text.strip()


def _mime_type(filename: str) -> str | None:
    lower = filename.lower()
    for ext, mime in _IMAGE_EXTENSIONS.items():
        if lower.endswith(ext):
            return mime
    return None


async def extract(document: Document, file_bytes: bytes) -> Document:
    prompt = _PROMPTS.get(document.type)
    if prompt is None:
        # business_questionnaire is parsed directly at upload time, not here.
        document.status = "extracted"
        return document

    mime_type = _mime_type(document.filename)
    if mime_type is None:
        document.status = "failed"
        document.verification_flags.append(
            "EXTRACTION_UNSUPPORTED: only jpg/png documents are supported in this MVP"
        )
        return document

    last_error: Exception | None = None
    for attempt in range(2):
        try:
            raw = await llm_client.vision_json(prompt, file_bytes, mime_type)
            fields = json.loads(_strip_fences(raw))
            document.extracted_fields = fields
            document.status = "extracted"
            return document
        except Exception as exc:  # noqa: BLE001 - one bad doc must not kill the application
            last_error = exc
            logger.warning("extraction attempt %d failed for %s: %s", attempt + 1, document.id, exc)

    document.status = "failed"
    document.verification_flags.append(f"EXTRACTION_FAILED: {last_error}")
    return document
