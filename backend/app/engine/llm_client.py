"""Thin OpenRouter client shared by extraction (vision) and rationale (text).

Only httpx (already a dependency) — no provider SDK. Model IDs are
configurable via env vars since OpenRouter's free/cheap model roster shifts
month to month; check https://openrouter.ai/models before assuming an ID
still exists.
"""

import base64
import os

import httpx

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"


def _api_key() -> str:
    key = os.getenv("OPENROUTER_API_KEY")
    if not key:
        raise RuntimeError("OPENROUTER_API_KEY not set")
    return key


async def _chat(model: str, messages: list[dict], temperature: float) -> str:
    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(
            OPENROUTER_URL,
            headers={"Authorization": f"Bearer {_api_key()}"},
            json={"model": model, "messages": messages, "temperature": temperature},
        )
        resp.raise_for_status()
        return resp.json()["choices"][0]["message"]["content"]


async def vision_json(prompt: str, images: list[tuple[bytes, str]]) -> str:
    """One vision call, one or more images (e.g. rendered PDF pages) + strict
    JSON-only instructions. Returns raw text — the caller strips markdown
    fences and json.loads()s it. `images` is a list of (bytes, mime_type)."""
    model = os.getenv("OPENROUTER_VISION_MODEL", "google/gemini-2.5-flash-lite")
    content: list[dict] = [{"type": "text", "text": prompt}]
    for image_bytes, mime_type in images:
        b64 = base64.b64encode(image_bytes).decode("ascii")
        content.append({"type": "image_url", "image_url": {"url": f"data:{mime_type};base64,{b64}"}})
    messages = [{"role": "user", "content": content}]
    return await _chat(model, messages, temperature=0.0)


async def text(prompt: str, temperature: float = 0.3) -> str:
    model = os.getenv("OPENROUTER_TEXT_MODEL", "google/gemini-2.5-flash-lite")
    messages = [{"role": "user", "content": prompt}]
    return await _chat(model, messages, temperature=temperature)
