# UBL National Innovation Hackathon 2026

## Team Name

Aitbaar
---

## Selected Thematic Area

Artificial Intelligence in Banking


---

## Problem Statement

Pakistan has ~5M SMEs producing 40% of GDP, yet only ~155k hold a bank loan. The primary barrier is friction in the application process: business owners often have to make 3–5 branch trips because document checklists are not declared upfront, loan officers have to manually read 40–60 pages per file, and decisions take weeks.
---

## Solution

**Aitbaar** is an AI-assisted SME loan origination platform designed to eliminate application friction and streamline approvals:
- **Frictionless Application:** SME owners apply via WhatsApp in Urdu with a full document checklist provided upfront and zero required branch visits.
- **AI Engine (Extract → Verify → Score → Explain):** Utilizes Gemini vision for extraction, deterministic cross-document fraud flags, an XGBoost repayment model (trained on a synthetic Pakistani SME dataset), and SHAP factor attribution. 
- **One-Page Credit Brief:** Instead of reading fifty pages, loan officers review a single AI-generated page with a score, risk tier, decision factors, and red flags—allowing them to quickly approve, decline, or request specific missing items.


---

## Tech Stack

- **Applicant Channel (WhatsApp Bot):** Node.js, `whatsapp-web.js`, Docker
- **Backend & AI Engine:** Python, FastAPI, Gemini Vision API, RapidFuzz, XGBoost + SHAP (for scoring and explanation)
- **Dashboard (Loan Officer UI):** React, Vercel
- **Deployment:** Railway (Backend/Bot) & Vercel (Frontend)

---

## Team Members

| Name | GitHub Username |
|------|-----------------|
|Anas Tahir|MuhammadAnasTahir|
|Ali Ateeb|Ali-Ateeb|
|Muhammad Obaidullah|thesocialobaid|
|Ali Zulfiqar|codewithfourtix|

---

## Submission Checklist

- [x] Source Code
- [x] Pitch Deck
- [ ] UI/UX
- [x] Architecture Diagram
- [ ] Demo Video
- [ ] Documentation
