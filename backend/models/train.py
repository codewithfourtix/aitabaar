"""Train the repayment-probability model on the synthetic dataset.

Stratified 80/20 split, XGBoost binary:logistic, modest depth, early
stopping. Persists the model AND the exact training feature order —
feature-order drift between training and inference is the classic silent
bug here (a plausible wrong score with no error), so scoring.py loads the
order from features.json and never re-declares it.

Run: python models/train.py  (from backend/, after data/generate.py)
"""

import json

import numpy as np
import pandas as pd
import xgboost as xgb
from sklearn.metrics import confusion_matrix, roc_auc_score, roc_curve
from sklearn.model_selection import train_test_split

BUSINESS_TYPES = ["retail_wholesale", "food", "textiles", "services", "light_manufacturing"]

FEATURE_COLUMNS = [
    *[f"business_type_{t}" for t in BUSINESS_TYPES],
    "years_in_business",
    "registered",
    "monthly_revenue_pkr",
    "employees",
    "premises_owned",
    "years_at_premises",
    "avg_monthly_inflow_pkr",
    "avg_monthly_outflow_pkr",
    "net_cashflow_pkr",
    "bounced_cheques",
    "account_age_months",
    "has_existing_loan",
    "existing_installment_pkr",
    "requested_amount_pkr",
    "debt_burden_ratio",
    "turnover_to_loan_ratio",
]


def build_features(df: pd.DataFrame) -> pd.DataFrame:
    """Shared by training and inference: raw columns -> the model's feature
    vector, in FEATURE_COLUMNS order. One-hot encodes business_type."""
    out = pd.DataFrame(index=df.index)
    for t in BUSINESS_TYPES:
        out[f"business_type_{t}"] = (df["business_type"] == t).astype(int)
    for col in FEATURE_COLUMNS:
        if col.startswith("business_type_"):
            continue
        out[col] = df[col]
    return out[FEATURE_COLUMNS]


def main() -> None:
    df = pd.read_csv("data/synthetic_sme.csv")
    X = build_features(df)
    y = df["repaid"]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    model = xgb.XGBClassifier(
        objective="binary:logistic",
        max_depth=4,
        n_estimators=200,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        eval_metric="auc",
        early_stopping_rounds=20,
        random_state=42,
    )
    model.fit(X_train, y_train, eval_set=[(X_test, y_test)], verbose=False)

    proba = model.predict_proba(X_test)[:, 1]
    auc = roc_auc_score(y_test, proba)
    fpr, tpr, _ = roc_curve(y_test, proba)
    ks = float(np.max(tpr - fpr))
    preds = (proba >= 0.5).astype(int)
    tn, fp, fn, tp = confusion_matrix(y_test, preds).ravel()

    model.save_model("models/aitbaar_xgb.json")
    with open("models/features.json", "w", encoding="utf-8") as f:
        json.dump({"columns": FEATURE_COLUMNS, "medians": X.median().to_dict()}, f, indent=2)

    metrics = f"""# Model Metrics

Trained on `data/synthetic_sme.csv` ({len(df)} rows), 80/20 stratified split, seed 42.

- **AUC:** {auc:.3f}
- **KS statistic:** {ks:.3f}
- **Threshold:** 0.5
- **Confusion matrix** (test set, n={len(y_test)}):

|  | Predicted default | Predicted repay |
|---|---|---|
| **Actual default** | {tn} | {fp} |
| **Actual repay** | {fn} | {tp} |

Synthetic data only — see `data/DATA_CARD.md`. An AUC in the 0.78-0.85 band
is intentional: a much higher score would mean the synthetic generator
leaked the label into a feature, which is a red flag, not a win.
"""
    with open("models/METRICS.md", "w", encoding="utf-8") as f:
        f.write(metrics)

    print(f"AUC={auc:.3f} KS={ks:.3f}  (target band: 0.78-0.85)")
    print("wrote models/aitbaar_xgb.json, models/features.json, models/METRICS.md")


if __name__ == "__main__":
    main()
