# Model Metrics

Trained on `data/synthetic_sme.csv` (1000 rows), 80/20 stratified split, seed 42.

- **AUC:** 0.780
- **KS statistic:** 0.506
- **Threshold:** 0.5
- **Confusion matrix** (test set, n=200):

|  | Predicted default | Predicted repay |
|---|---|---|
| **Actual default** | 15 | 25 |
| **Actual repay** | 5 | 155 |

Synthetic data only — see `data/DATA_CARD.md`. An AUC in the 0.78-0.85 band
is intentional: a much higher score would mean the synthetic generator
leaked the label into a feature, which is a red flag, not a win.
