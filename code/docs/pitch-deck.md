# Pitch Deck — slide-by-slide content

Build in Canva, export as interactive PDF with clickable links (demo video, live dashboard, WhatsApp QR). 3-minute pitch. Numbers below are sourced from the submitted canvases — keep them consistent.

## 1 — Title
**Aitbaar (اعتبار)** — Same-day, explainable SME loans on WhatsApp.
Team Aitbaar · UBL National Innovation Hackathon 2026 · theme: AI in Banking.
Tagline: *"Apna karobar, apna aitbaar."*

## 2 — Problem (the human version)
A shopkeeper needs Ramzan stock. The bank sends him home 3–5 times for "one more paper" — the checklist is *discovered* as the officer reads, never declared. The decision takes weeks; the season passes. The officer reads 40–60 pages by hand per file.
**~5M SMEs, 40% of GDP — but only ~155k have a bank loan and SMEs get 6–7% of private credit.**

## 3 — Root cause (one line, our sharpest insight)
**The cost to assess is high relative to the ticket, and that cost is human.** Same officer effort at PKR 500k as at PKR 50M — so small tickets get rationed. Not risk appetite. Cost.

## 4 — Solution (two sides, one engine)
- **Applicant:** applies on WhatsApp, in Urdu, from behind the counter. Full document checklist up front. Consent once. Zero branch visits to apply.
- **Engine:** Extract (Gemini vision) → Verify (deterministic cross-checks, fraud flags) → Score (XGBoost + SHAP) → Explain (LLM writes only from SHAP output).
- **Officer:** one page instead of fifty. Approve / decline / request exactly **one** item. Every step audited.

## 5 — Live demo (the slide is just a frame — demo carries it)
5 steps: WhatsApp apply → docs by photo → queue moves live (extract/verify/score) → one-page brief with fraud flag on file #2 → approve → "Mubarak ho 🎉" lands on the phone.
*Fallback: embedded demo video link if live fails.*

## 6 — Why judges can trust it (the moat with the buyer)
- **Explainable:** SHAP factors behind every score; LLM structurally cannot invent reasons.
- **Human-in-the-loop:** AI recommends, officer decides — recorded with reasoning.
- **Consent-first:** captured and timestamped in-chat before any processing; only applicant-submitted documents, no scraped data.
- **Honest data:** synthetic 1,000-record dataset with a documented generator; AUC 0.778 stated as pipeline-proof, not real-world claim. Remedy = pilot on real files.

## 7 — Why now / why UBL
SBP targets **750k SME borrowers by 2028** (vs 276k in 2025) — ~473k net new borrowers to assess. No bank can hire its way there. UBL: 11M customers, Temenos origination live, existing WhatsApp banking channel, IFC engagement to cut SME turnaround. **The buyer's alternative is a hiring plan that doesn't exist.**

## 8 — Business model
B2B SaaS to banks. PKR 300–800 per assessed file vs ~PKR 30 marginal cost (>90% gross margin) + annual platform licence + integration fee. We don't lend, we don't take credit risk — we sell decision throughput.

## 9 — Traction & team
Working end-to-end system (not a mockup): live WhatsApp number, deployed dashboard, real trained model, <60s per file. Team shipped a WhatsApp-native AI product for Pakistani users before — **1st of 162+ teams, Code for Pakistan AI hackathon.**

## 10 — Ask
Pilot: one city, one product, 500 files, run in parallel with the manual process. Compare turnaround, officer-minutes per file, and default outcomes. Links: [demo video] · [live dashboard] · [WhatsApp QR] · [github.com/codewithfourtix/aitabaar]
