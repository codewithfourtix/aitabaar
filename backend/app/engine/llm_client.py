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


async def vision_json(prompt: str, image_bytes: bytes, mime_type: str = "image/jpeg") -> str:
    """One vision call, image + strict JSON-only instructions. Returns raw
    text — the caller strips markdown fences and json.loads()s it."""
    model = os.getenv("OPENROUTER_VISION_MODEL", "google/gemini-2.5-flash-lite")
    b64 = base64.b64encode(image_bytes).decode("ascii")
    messages = [
        {
            "role": "user",
            "content": [
                {"type": "text", "text": prompt},
                {"type": "image_url", "image_url": {"url": f"data:{mime_type};base64,{b64}"}},
            ],
        }
    ]
    return await _chat(model, messages, temperature=0.0)


async def text(prompt: str, temperature: float = 0.3) -> str:
    model = os.getenv("OPENROUTER_TEXT_MODEL", "google/gemini-2.5-flash-lite")
    messages = [{"role": "user", "content": prompt}]
    return await _chat(model, messages, temperature=temperature)
