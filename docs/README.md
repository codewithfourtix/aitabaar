# Aitabaar Docs — Source of Truth

**Rule: if it's not in `docs/`, it's not decided. If code and docs disagree, docs win — fix the code or fix the docs in the same commit.**

| Doc | What it defines | You must read it if you... |
|---|---|---|
| [architecture.md](architecture.md) | Components, data flow, ports, deployment | are on the team |
| [api.md](api.md) | REST endpoints, request/response examples, errors | build the bot, dashboard, or backend |
| [data-model.md](data-model.md) | Every entity and field, status lifecycle | touch any data |
| [whatsapp-bot-flow.md](whatsapp-bot-flow.md) | Bot conversation states, messages, API calls | build the bot (Ali Z) |
| [dashboard-spec.md](dashboard-spec.md) | Screens, components, API calls per screen | build the dashboard (Ali A) |
| [git-workflow.md](git-workflow.md) | Branches, commits, merges, contract-change process | commit anything |
| [decisions.md](decisions.md) | Why we chose what we chose | disagree with something |
| [demo-runbook.md](demo-runbook.md) | Deploy steps + the 5-step demo script + failure modes | run the demo or deploy |

## Changing the contract (the anti-conflict process)

The API contract lives in **two places that must always match**: `backend/app/models/schemas.py` and `docs/api.md`.

1. Edit `schemas.py` **and** `docs/api.md` in the **same commit**.
2. Post in the WhatsApp group: *"contract change: <what changed>"*.
3. Merge to `stage` before building anything on top of it.

Nobody builds against an endpoint or field that isn't in `docs/api.md`. If you need one that doesn't exist, add it to the docs first (it can be marked `PLANNED`), then build.

## Architecture whiteboard

Original planning sketch: [architecture-whiteboard.jpeg](architecture-whiteboard.jpeg)
