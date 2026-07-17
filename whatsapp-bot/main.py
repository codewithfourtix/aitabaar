"""Aitabaar WhatsApp bot — applicant channel (English/Urdu).

Meta WhatsApp Cloud API webhook. Guides the applicant through:
language pick -> consent -> CNIC -> bank statement -> utility bill ->
business questionnaire -> submit -> status updates.

Owner: Ali Zulfiqar.
"""

import os

from fastapi import FastAPI, Request, Response

app = FastAPI(title="Aitabaar WhatsApp Bot")

VERIFY_TOKEN = os.getenv("WHATSAPP_VERIFY_TOKEN", "aitabaar-verify")


@app.get("/health")
def health():
    return {"status": "ok", "service": "aitabaar-whatsapp-bot"}


@app.get("/webhook")
def verify_webhook(request: Request):
    """Meta webhook verification handshake."""
    params = request.query_params
    if params.get("hub.mode") == "subscribe" and params.get("hub.verify_token") == VERIFY_TOKEN:
        return Response(content=params.get("hub.challenge", ""), media_type="text/plain")
    return Response(status_code=403)


@app.post("/webhook")
async def receive_message(request: Request):
    """Incoming WhatsApp messages land here."""
    payload = await request.json()
    # TODO: parse message, advance conversation state, reply via Cloud API
    print("incoming:", payload)
    return {"status": "received"}
