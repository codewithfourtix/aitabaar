# Model Metrics

Trained on `data/synthetic_sme.csv` (1000 rows), 80/20 stratified split, seed 42.

- **AUC:** 0.778
- **KS statistic:** 0.489
- **Threshold:** 0.5
- **Confusion matrix** (test set, n=200):

|  | Predicted default | Predicted repay |
|---|---|---|
| **Actual default** | 30 | 43 |
| **Actual repay** | 17 | 110 |

Synthetic data only — see `data/DATA_CARD.md`. An AUC in the 0.78-0.85 band
is intentional: a much higher score would mean the synthetic generator
leaked the label into a feature, which is a red flag, not a win.
