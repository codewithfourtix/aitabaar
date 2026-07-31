"""Stage 1 - Extraction: Gemini vision (via OpenRouter) parses uploaded
documents into structured fields.

Field names match docs/data-model.md's declared extraction targets, plus
`account_title` on bank_statement (needed by verification's NAME_MISMATCH
check; additive, the dashboard renders extracted_fields as a generic
key-value list so extra keys are harmless).

Accepts jpg/png photos and PDFs (docs/api.md always allowed pdf; this file
just hadn't implemented it yet). PDFs are rendered page-by-page to images
via pymupdf (pure pip package, no system poppler dependency - important for
a fast Railway deploy) and fed through the same vision call as a photo, so
a scanned/photographed PDF and a digitally-generated one are handled
identically. One retry on LLM failure, then the document is marked failed
and the pipeline continues; one bad document must never kill the whole
application.
"""

import json
import logging

import fitz  # pymupdf

from app.engine import llm_client
from app.models.schemas import Document, DocumentType

logger = logging.getLogger("aitabaar.extraction")

MAX_PDF_PAGES = 6
PDF_RENDER_DPI = 150

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
        "This is a Pakistani bank statement, possibly spanning several pages. Extract "
        "these fields as JSON only, no prose, no markdown fences: "
        '{"account_title": string, "avg_monthly_inflow_pkr": number, '
        '"avg_monthly_outflow_pkr": number, "months": integer number of months covered, '
        '"end_balance_pkr": number, "bounced_cheques": integer count of bounced/returned cheques}. '
        "Use all pages provided together to compute the averages. Return null for any "
        "field you cannot read confidently rather than guessing. Pages may be angled, "
        "low-light, or mix Urdu and English."
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
    DocumentType.business_registration: (
        "This is a Pakistani business registration document. It may be an FBR NTN "
        "certificate, a trade license, a partnership deed, or a trade body / chamber "
        "of commerce membership certificate. Extract these fields as JSON only, no "
        "prose, no markdown fences: "
        '{"business_name": string registered business name, '
        '"owner_name": string proprietor/partner/director name if shown, '
        '"ntn": string National Tax Number if shown, '
        '"registration_number": string license or incorporation number if shown, '
        '"legal_structure": one of "sole_proprietorship" | "partnership" | '
        '"private_limited" | "other", '
        '"registered_on": string YYYY-MM-DD if shown, '
        '"issuing_authority": string e.g. FBR, SECP, the chamber name}. '
        "Return null for any field you cannot read confidently rather than guessing. "
        "The document may be angled, low-light, or mix Urdu and English."
    ),
    DocumentType.property_document: (
        "This is a Pakistani document evidencing rights over business premises — "
        "either proof of ownership (registry / sale deed / property tax receipt) or "
        "a rent agreement. Extract these fields as JSON only, no prose, no markdown "
        "fences: "
        '{"holder_name": string owner or tenant named on the document, '
        '"address": string address of the premises, '
        '"tenure": "owned" if it evidences ownership or "rented" if it is a rent '
        "or lease agreement, "
        '"monthly_rent_pkr": number if it is a rent agreement else null, '
        '"agreement_start": string YYYY-MM-DD if shown, '
        '"agreement_end": string YYYY-MM-DD if shown}. '
        "Return null for any field you cannot read confidently rather than guessing. "
        "The document may be angled, low-light, or mix Urdu and English."
    ),
}

_IMAGE_EXTENSIONS = {".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png"}


class UnsupportedDocumentError(Exception):
    pass


def _strip_fences(text: str) -> str:
    text = text.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[1] if "\n" in text else text[3:]
        if text.endswith("```"):
            text = text.rsplit("```", 1)[0]
    return text.strip()


def _render_pdf_pages(file_bytes: bytes) -> list[tuple[bytes, str]]:
    doc = fitz.open(stream=file_bytes, filetype="pdf")
    try:
        if len(doc) == 0:
            raise UnsupportedDocumentError("PDF has no pages")
        page_count = min(len(doc), MAX_PDF_PAGES)
        if len(doc) > MAX_PDF_PAGES:
            logger.warning("PDF has %d pages, only reading the first %d", len(doc), MAX_PDF_PAGES)
        return [
            (doc[i].get_pixmap(dpi=PDF_RENDER_DPI).tobytes("png"), "image/png")
            for i in range(page_count)
        ]
    finally:
        doc.close()


def _prepare_images(filename: str, file_bytes: bytes) -> list[tuple[bytes, str]]:
    lower = filename.lower()
    for ext, mime in _IMAGE_EXTENSIONS.items():
        if lower.endswith(ext):
            return [(file_bytes, mime)]
    if lower.endswith(".pdf"):
        return _render_pdf_pages(file_bytes)
    raise UnsupportedDocumentError(f"unsupported file type for '{filename}' (jpg/png/pdf only)")


async def extract(document: Document, file_bytes: bytes) -> Document:
    prompt = _PROMPTS.get(document.type)
    if prompt is None:
        # business_questionnaire is parsed directly at upload time, not here.
        document.status = "extracted"
        return document

    try:
        images = _prepare_images(document.filename, file_bytes)
    except Exception as exc:  # noqa: BLE001 - a bad file must not kill the application
        document.status = "failed"
        document.verification_flags.append(f"EXTRACTION_UNSUPPORTED: {exc}")
        return document

    last_error: Exception | None = None
    for attempt in range(2):
        try:
            raw = await llm_client.vision_json(prompt, images)
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
