# Model Metrics

Trained on `data/synthetic_sme.csv` (1000 rows), 80/20 stratified split, seed 42.

- **AUC:** 0.786
- **KS statistic:** 0.487
- **Threshold:** 0.5
- **Confusion matrix** (test set, n=200):

|  | Predicted default | Predicted repay |
|---|---|---|
| **Actual default** | 23 | 17 |
| **Actual repay** | 20 | 140 |

Synthetic data only — see `data/DATA_CARD.md`. This AUC is in the intended 0.78-0.85 band.
The target band itself is intentional: a much higher score would mean the
synthetic generator leaked the label into a feature, which is a red flag,
not a win.

## Tier cutoffs and regulatory monotonicity check (R-17)

Tier = P(repay) bucket, persisted in `models/features.json`'s
`tier_cutoffs` (single source of truth for both this check and
`app/engine/scoring.py`'s inference-time tiering). Cutoffs are kept
conservative rather than loosened alongside the R-9 clean-facility cap
increase (10M -> 50M): unsecured/clean SME facilities get no
Forced-Sale-Value provisioning benefit under Annexure II, so
loss-given-default on this product is effectively high — see
`docs/decisions.md` #19.

Calibrated and checked on 5-fold out-of-fold predictions over the full
1000-row dataset (every prediction from a model that never saw that
row), not the single 80/20 split above — with only ~1,000 rows, a 200-row
single holdout was too small to resolve 4 tiers' bad-rate ordering
reliably (see `calibrate_tier_cutoffs()`'s docstring in `models/train.py`).

| Tier | Cutoff (P repay) | Observed bad rate (5-fold OOF, n=1000) |
|---|---|---|
| A | >= 0.80 | 8.9% |
| B | >= 0.65 | 22.2% |
| C | >= 0.50 | 27.4% |
| D | >= 0.00 | 45.0% |

**Monotonicity check:** PASS — observed bad rate rises A->D as required (R-17).

## Default catch rate (recall/precision operating point)

`SCALE_POS_WEIGHT = 0.4` (`models/train.py`) down-weights the majority "repaid"
class during training so more true defaulters score low enough to land in tier C/D (reviewed or
declined) instead of A/B (auto-approved, no human ever looks at them). This is a genuine
recall/precision tradeoff along the model's ROC curve, not a free improvement — team-agreed
MODERATE operating point, `docs/decisions.md` #20.

|  | This model (weighted) | Unweighted baseline (same cutoffs) |
|---|---|---|
| True defaulters caught (land in tier C/D) | 115/199 (58%) | 98/199 (49%) |
| True good applicants still auto-approved (tier A/B) | 632/801 (79%) | 702/801 (88%) |

Both computed on the same 5-fold OOF predictions as the tier check above. The real fix for this
tradeoff is richer signal (R-15 roadmap — wallet/alt-data, digital supply chain; see
`docs/compliance-sbp.md`), which would raise the underlying AUC instead of trading recall for
precision on the same one. Re-tune `SCALE_POS_WEIGHT` if the business risk appetite changes.
