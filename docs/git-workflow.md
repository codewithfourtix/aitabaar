# Git Workflow

## Branches

- **`main`** — default branch, stable. Moves only when the team merges `stage` into it after verification.
- **`stage`** — integration branch. **Everything merges here first** and gets tested here.
- **Feature branches** — `<yourname>/<what>`, e.g. `ali/whatsapp-flow`, `anas/scoring-engine`, `ateeb/queue-screen`. Branch off `stage`.

```bash
git checkout stage && git pull          # always start from latest stage
git checkout -b yourname/feature
# ... work, commit ...
git checkout stage && git pull          # pick up others' work first
git merge yourname/feature
# resolve conflicts locally if any, run your service, then:
git push origin stage
```

Announce in the group after pushing to `stage` if you changed anything others depend on.

## Rules

1. **Never commit directly to `main`.** `stage → main` merges are a team decision.
2. **Pull `stage` before merging into it.** Conflicts get resolved on your machine, not in the remote.
3. Stay in your folder (`backend/`, `whatsapp-bot/`, `dashboard/`, `portal/`). Touching shared files (`docs/`, root files, `schemas.py`) → follow the contract-change process in [docs/README.md](README.md) and tell the group.
4. **Small, focused commits** — one logical change each, imperative mood: `Add consent step to bot flow`, `Fix SHAP bar direction colors`. Not `updates` / `wip` / `final final`.
5. No co-author trailers, no AI attribution lines in commit messages.
6. Never commit: `.env`, API keys, real personal data (real CNICs/statements), `node_modules`, model binaries. `.gitignore` covers these — don't fight it.
7. Merge `stage` into your long-running feature branch daily — don't drift.
8. During the 72-hour hackathon: no PR reviews required, merge to `stage` freely, but **`stage` must always run** — if you break it, fixing it is your top priority.

## Contract changes (the one place conflicts actually happen)

`backend/app/models/schemas.py` + `docs/api.md` change **together, in one commit, announced in the group**. If you build against a shape that isn't in the docs, the rework is on you.
