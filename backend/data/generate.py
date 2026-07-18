"""Synthetic SME credit dataset generator.

1,000 fully synthetic rows, reproducible via numpy.random.default_rng(42).
No real UBL customer data anywhere in this file or its output — see
DATA_CARD.md. Feature names match what the engine can actually collect from
a real application (see docs/data-model.md's extraction targets): bank
statement inflow/outflow/bounced cheques, the business questionnaire, and
the requested amount. A few features a bank underwriter would want
(registered, premises_owned, account_age_months, existing loan info) aren't
collected by our intake flow yet, so scoring.py defaults them from this
same dataset's medians at inference time — documented, not hidden.

Run: python data/generate.py  (from backend/)
"""

import numpy as np
import pandas as pd

N = 1_000
RNG = np.random.default_rng(42)

BUSINESS_TYPES = ["retail_wholesale", "food", "textiles", "services", "light_manufacturing"]
BUSINESS_TYPE_P = [0.45, 0.15, 0.15, 0.15, 0.10]


def generate() -> pd.DataFrame:
    business_type = RNG.choice(BUSINESS_TYPES, size=N, p=BUSINESS_TYPE_P)

    # Right-skewed years in business: 1-25.
    years_in_business = np.clip(RNG.gamma(shape=2.0, scale=3.5, size=N), 1, 25).round().astype(int)

    registered = RNG.random(N) < 0.35

    # Lognormal monthly revenue, median ~600k, roughly 100k-15m.
    monthly_revenue_pkr = np.clip(RNG.lognormal(mean=np.log(600_000), sigma=0.75, size=N), 100_000, 15_000_000)

    employees = np.clip(
        (monthly_revenue_pkr / 100_000) * RNG.uniform(0.3, 1.2, size=N) + RNG.normal(0, 2, size=N),
        1,
        40,
    ).round().astype(int)

    premises_owned = RNG.random(N) < 0.30
    years_at_premises = np.minimum(
        np.clip(RNG.uniform(0, 20, size=N), 0, None), years_in_business
    ).round().astype(int)

    # Bank statement figures, correlated with revenue.
    avg_monthly_inflow_pkr = (monthly_revenue_pkr * RNG.uniform(0.5, 0.9, size=N)).round(-3)
    avg_monthly_outflow_pkr = (avg_monthly_inflow_pkr * RNG.uniform(0.7, 0.98, size=N)).round(-3)
    net_cashflow_pkr = avg_monthly_inflow_pkr - avg_monthly_outflow_pkr

    # Bounced cheques: mostly 0, occasionally more — payment-discipline proxy.
    bounced_cheques = RNG.choice([0, 1, 2, 3, 4], size=N, p=[0.70, 0.15, 0.08, 0.04, 0.03])

    account_age_months = np.clip(RNG.uniform(6, 240, size=N), 6, 240).round().astype(int)

    has_existing_loan = RNG.random(N) < 0.25
    existing_installment_pkr = np.where(
        has_existing_loan,
        monthly_revenue_pkr * RNG.uniform(0.05, 0.25, size=N),
        0.0,
    ).round(-3)

    requested_amount_pkr = np.clip(RNG.lognormal(mean=np.log(1_500_000), sigma=0.6, size=N), 500_000, 7_500_000)

    debt_burden_ratio = existing_installment_pkr / np.maximum(avg_monthly_inflow_pkr, 1)
    turnover_to_loan_ratio = avg_monthly_inflow_pkr / np.maximum(requested_amount_pkr / 12, 1)

    df = pd.DataFrame(
        {
            "business_type": business_type,
            "years_in_business": years_in_business,
            "registered": registered.astype(int),
            "monthly_revenue_pkr": monthly_revenue_pkr.round(-3),
            "employees": employees,
            "premises_owned": premises_owned.astype(int),
            "years_at_premises": years_at_premises,
            "avg_monthly_inflow_pkr": avg_monthly_inflow_pkr,
            "avg_monthly_outflow_pkr": avg_monthly_outflow_pkr,
            "net_cashflow_pkr": net_cashflow_pkr,
            "bounced_cheques": bounced_cheques,
            "account_age_months": account_age_months,
            "has_existing_loan": has_existing_loan.astype(int),
            "existing_installment_pkr": existing_installment_pkr,
            "requested_amount_pkr": requested_amount_pkr.round(-3),
            "debt_burden_ratio": debt_burden_ratio,
            "turnover_to_loan_ratio": turnover_to_loan_ratio,
        }
    )

    # Latent logit -> repaid (1) / defaulted (0), ~70/30, with genuine noise
    # so AUC lands ~0.78-0.85 rather than a suspicious 0.99. Driving order:
    # debt burden > payment discipline (bounced cheques) > cashflow >
    # years in business > turnover-to-loan > account age.
    z_debt_burden = (debt_burden_ratio - debt_burden_ratio.mean()) / debt_burden_ratio.std()
    z_cashflow = (net_cashflow_pkr - net_cashflow_pkr.mean()) / net_cashflow_pkr.std()
    z_years = (years_in_business - years_in_business.mean()) / years_in_business.std()
    z_turnover = (turnover_to_loan_ratio - turnover_to_loan_ratio.mean()) / turnover_to_loan_ratio.std()
    z_account_age = (account_age_months - account_age_months.mean()) / account_age_months.std()

    logit = (
        1.15
        - 1.1 * z_debt_burden
        - 0.55 * bounced_cheques
        + 0.55 * z_cashflow
        + 0.45 * z_years
        + 0.35 * z_turnover
        + 0.20 * z_account_age
        + RNG.normal(0, 1.05, size=N)  # noise — keeps this honest, not a giveaway
    )
    p_repay = 1 / (1 + np.exp(-logit))
    df["repaid"] = (RNG.random(N) < p_repay).astype(int)

    return df


if __name__ == "__main__":
    data = generate()
    data.to_csv("data/synthetic_sme.csv", index=False)
    print(f"wrote data/synthetic_sme.csv — {len(data)} rows, repaid rate {data['repaid'].mean():.2%}")
