# User Journey Maps: Aitabaar

A journey map illustrates the end-to-end experience a user has with the Aitabaar platform. By tracking the emotional state and actions across the timeline, we can ensure the product design actively reduces friction.

---

## Journey 1: The Applicant (Tariq, SME Owner)

**Goal**: Obtain a PKR 800,000 loan to expand shop inventory without closing the store to visit a bank branch.

| Stage | 1. Awareness & Onboarding | 2. Document Submission | 3. Waiting & Processing | 4. Additional Request (Loop) | 5. Resolution & Funding |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Action** | Discovers Aitabaar via SMS campaign. Messages the WhatsApp bot. | Answers business questions in Urdu. Takes photos of CNIC, bills, and handwritten ledgers. | Continues running his shop. Checks WhatsApp for updates. | Receives a WhatsApp ping asking for the back of his CNIC. Takes a photo and sends it. | Receives an approval message and a notification that funds are in his account. |
| **Touchpoint** | WhatsApp (Mobile) | WhatsApp (Mobile) | WhatsApp (Mobile) | WhatsApp (Mobile) | WhatsApp & Bank SMS |
| **Emotion / Mindset** | Curious but skeptical. *"Will this actually work without going to the branch?"* | Focused but slightly anxious. *"Are these photos clear enough? Will they accept them?"* | Anxious but productive. *"Glad I didn't have to leave my shop."* | Mildly annoyed but relieved it’s easy. *"At least I don't have to drive to the bank."* | Excited and satisfied. *"That was incredibly fast and easy!"* |
| **Pain Point** | Fear of complex English banking forms. | Physical documents are wrinkled or non-standard. | The black hole of traditional banking—usually takes weeks with no updates. | Usually, a missing document means the application gets rejected or delayed by weeks. | N/A |
| **Aitabaar Solution** | Conversational Urdu bot removes language barrier. | AI Vision Engine extracts data accurately regardless of document condition. | Automated status updates sent directly to WhatsApp. | Instant notification via WhatsApp allows him to fix the issue in seconds. | Funds disbursed digitally based on AI credit scoring. |

---

## Journey 2: The Loan Officer (Ayesha)

**Goal**: Quickly and safely evaluate Tariq's loan application without manually cross-referencing paper documents.

| Stage | 1. Queue Management | 2. Evaluation & Analysis | 3. Exception Handling | 4. Final Decision |
| :--- | :--- | :--- | :--- | :--- |
| **Action** | Logs into the React Dashboard. Sorts the queue by newest 'Scored' applications. | Opens Tariq's application. Reads the AI Credit Brief, checks Repayment Probability (88%), and reviews SHAP factors. | Notices the system flagged the CNIC back as missing/blurry. Clicks "Request Documents". | Reviews the newly uploaded CNIC back. Confirms the AI Risk Tier 'A' assessment. Clicks "Approve". |
| **Touchpoint** | Web Dashboard | Web Dashboard (Application Detail View) | Web Dashboard (Action Buttons) | Web Dashboard |
| **Emotion / Mindset** | Focused and busy. *"I have 40 applications to get through today."* | Relieved and confident. *"The SHAP bar charts clearly explain why the score is high."* | Slightly frustrated but in control. *"I need this fixed before I can approve."* | Confident. *"I have a clear audit trail justifying this approval."* |
| **Pain Point** | Sifting through disorganized queues of unverified applications. | Traditional AI models are "black boxes" that she cannot trust or explain to auditors. | Having to manually email or call applicants to get missing files wastes time. | Fear of approving a bad loan due to missing context. |
| **Aitabaar Solution** | The queue only shows applications that have already been structured by the AI Engine. | SHAP visual factors (positive/negative impacts) provide transparent, auditable reasoning. | One-click "Request Docs" button automatically handles the WhatsApp communication. | The summarized brief and complete document tab gives her full confidence. |

---

## Key Design Implications
1. **For the Bot**: The WhatsApp bot must be extremely forgiving with image uploads and conversational errors.
2. **For the Dashboard**: The Loan Officer's interface must prioritize the AI reasoning (SHAP factors) above the raw documents, as that is where they build trust in the system.
