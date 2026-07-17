"""Stage 1 — Extraction: vision LLM parses uploaded documents into fields.

Input: raw document (image/PDF).
Output: Document.extracted_fields (e.g. CNIC number, monthly inflows).
Owner: Anas / Obaid.
"""

from app.models.schemas import Document


async def extract(document: Document, file_bytes: bytes) -> Document:
    raise NotImplementedError("Wire up vision LLM (Gemini / GPT-4o via OpenRouter)")
