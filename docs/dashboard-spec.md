# Loan Officer Dashboard — Spec

Owner: **Ali Ateeb** · `dashboard/` · React (Vite) + **Tailwind + Recharts** · deploy: **Vercel** · dev port 5173 · API base from `VITE_API_URL`

Mock data works today: `GET /applications` returns APP-001 (scored, full SHAP factors) and APP-002 (submitted). Build every screen against it.

## Screen 1 — Application Queue (`/`)

`GET /applications` (optionally `?status=`).

- Table: ID · applicant name · business name · city · channel icon (WhatsApp/portal) · requested PKR · **status chip** · risk tier badge (if scored) · updated_at.
- Filter tabs across the top: All / Submitted / Scored / Needs docs / Decided — counts on each.
- Sort: newest first (API already does). Row click → Screen 2.
- Status chip colors: draft gray · submitted blue · processing blue pulse · scored purple · needs_docs amber · approved green · rejected red.

## Screen 2 — Application Detail (`/applications/:id`)

`GET /applications/{id}`. Layout: 3 sections.

**A. AI Credit Brief (the hero — this is the demo money-shot)**
- **Score gauge (Recharts): credit score 0–100** (= round(repayment_probability × 100)) + risk tier badge (A–D) + recommended loan range vs requested amount.
- `rationale` paragraph.
- SHAP factor bars: one row per `factors[]` — `label`, horizontal bar sized by `|impact|`, green right for positive / red left for negative.
- `inconsistency_flags` as amber warning banners at top if non-empty.
- If `score == null`: placeholder + **"Run AI Assessment"** button → `POST /applications/{id}/score` → refetch.

**B. Documents**
- Card per `documents[]`: type label, filename, uploaded_at, `extracted_fields` as key-value list, `verification_flags` as red text.
- (File preview is PLANNED — show fields only for now.)

**C. Audit Trail**
- Vertical timeline of `audit_trail[]`: at · actor · action · detail. Every event, unfiltered — this is the compliance story, make it visible in the demo.

## Decision bar (sticky bottom of Screen 2, only when status = `scored`)

Three actions → `POST /applications/{id}/decision`:

| Button | Body | Extra UI |
|---|---|---|
| ✅ Approve | `{officer, action: "approve", note}` | confirm modal with recommended amount |
| ❌ Reject | `{officer, action: "reject", note}` | note required |
| 📄 Request document | `{officer, action: "request_docs", note, requested_doc_types}` | pick exactly **ONE** doc type + note — "request exactly the one missing item" is the product promise |

`officer`: hardcode a name or a simple name input in the header — no auth (decisions.md #8).
After decision: refetch, status chip updates, new audit event appears — show this live in the demo.

## Don't build (cut list)

Login/auth · pagination · real file viewer · editing applications · charts beyond SHAP bars · responsive mobile layout (officers use desktop).
