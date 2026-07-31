"""Synthetic SME credit dataset generator.

1,000 fully synthetic rows, reproducible via numpy.random.default_rng(42).
No real UBL customer data anywhere in this file or its output — see
DATA_CARD.md. Feature names match what the engine can actually collect from
a real application (see docs/data-model.md's extraction targets): bank
statement inflow/outflow/bounced cheques, the business questionnaire, and
the requested amount.

Anchored (item 1.3, docs/decisions.md open question) to the team's
published-figures data-anchoring sheet: SMEDA "SME Financing Portfolio in
Pakistan" (Sep 2024, citing SBP), SBP Financial Stability Review 2024, SBP
SME Prudential Regulations, SBP SME Financial Review, and an Economic
Census / KSBL policy brief on establishment mix. Each block below is
commented [SOURCED] (a published figure, used directly) or [ASSUMPTION] (a
bounded modeling choice with no public figure) — see DATA_CARD.md's
provenance section for the full citation list.

Re-anchored (decision #19, docs/decisions.md) to State Bank of Pakistan,
"Prudential Regulations for Small & Medium Enterprise Financing" (SME,
Housing & Sustainable Finance Department, updated 16 Jul 2026) — this
supersedes the earlier SBP SME PR bands/cap the sheet was written against.
Two figures changed: enterprise size bands (Part-I) and the clean-facility
exposure limit (Regulation R-9). See DATA_CARD.md's "Not adopted" note,
now resolved.

Run: python data/generate.py  (from backend/)
"""

import numpy as np
import pandas as pd

N = 1_000
RNG = np.random.default_rng(42)

BUSINESS_TYPES = ["retail_wholesale", "food", "textiles", "services", "light_manufacturing"]

# [SOURCED] Economic Census / KSBL policy brief establishment mix: Retail &
# Wholesale Trade ~45%; Services (restaurant/hotel, transport,
# personal/other services) ~28%; Manufacturing ~20%; Agriculture ~5%;
# Other ~2%. The generator only has these 5 categories (no "agriculture" or
# "other"), so the two non-matching sourced buckets are folded into the
# closest existing category rather than invented as new ones:
#   retail_wholesale = Retail & Wholesale Trade, as-is             -> 45%
#   food             = restaurant/hotel slice of the Services figure -> 8%
#   services         = remaining Services (28-8) + Agriculture(5)
#                       + Other(2), catch-all                      -> 27%
#   textiles         = Manufacturing subsector split                -> 12%
#   light_manufacturing = Manufacturing subsector split, remainder   -> 8%
BUSINESS_TYPE_P = [0.45, 0.08, 0.12, 0.27, 0.08]


def generate() -> pd.DataFrame:
    business_type = RNG.choice(BUSINESS_TYPES, size=N, p=BUSINESS_TYPE_P)

    # [ASSUMPTION] No published years-in-business distribution for SME loan
    # applicants. Gamma shape kept from the original generator — its
    # median (~5.8yrs) and mean (7yrs) already sit in the sheet's suggested
    # 5-7yr center, with a meaningful <=5yr start-up share.
    years_in_business = np.clip(RNG.gamma(shape=2.0, scale=3.5, size=N), 1, 25).round().astype(int)

    # [ASSUMPTION, bounded] Most Pakistani SMEs are informal, but loan
    # applicants skew more formal than the general population — sheet
    # suggests ~40% registered.
    registered = RNG.random(N) < 0.40

    # [SOURCED bounds] SBP Small Enterprise turnover ceiling PKR 400M/yr
    # (~33.3M/month, R-1 2026 bands); Medium PKR 400-2,000M/yr. Applicant
    # pool skews micro/small with only a thin tail into medium —
    # sigma/clip tuned so the vast majority of rows stay well under the
    # small-enterprise ceiling and a handful reach into medium, never
    # beyond it (max clip 150M/month ~= 1,800M/yr, inside the Medium
    # band). Median ~650k sits in the sheet's suggested PKR 400k-800k
    # center; upper clip widened alongside the new, higher size bands.
    monthly_revenue_pkr = np.clip(
        RNG.lognormal(mean=np.log(650_000), sigma=1.0, size=N), 100_000, 150_000_000
    )

    # [SOURCED] SBP SME Financial Review: 99.06% of establishments employ
    # 1-10 people. Base count clusters there (mean ~4); a boost applied
    # only to medium-scale-revenue rows reaches the sheet's ~20-50 tail for
    # the medium end.
    employees = 1 + RNG.poisson(lam=3, size=N)
    medium_scale_revenue = monthly_revenue_pkr > 33_300_000  # ~PKR 400M/yr Small ceiling (R-1 2026)
    employees = employees + np.where(medium_scale_revenue, RNG.integers(20, 40, size=N), 0)
    employees = np.clip(employees, 1, 50)

    # [ASSUMPTION] ~35-40% owned (sheet).
    premises_owned = RNG.random(N) < 0.37
    # [ASSUMPTION] Correlated with years_in_business, capped at it.
    years_at_premises = np.minimum(
        np.clip(RNG.uniform(0, 20, size=N), 0, None), years_in_business
    ).round().astype(int)

    # Bank statement figures, correlated with revenue via a margin: inflow
    # a fraction of revenue, outflow a bit below inflow, net often thin so
    # a low-buffer applicant reads as higher risk (shape unchanged — it
    # already matches the sheet's description of this coupling).
    avg_monthly_inflow_pkr = (monthly_revenue_pkr * RNG.uniform(0.5, 0.9, size=N)).round(-3)
    avg_monthly_outflow_pkr = (avg_monthly_inflow_pkr * RNG.uniform(0.7, 0.98, size=N)).round(-3)
    net_cashflow_pkr = avg_monthly_inflow_pkr - avg_monthly_outflow_pkr

    # [ASSUMPTION, risk driver] Most 0-1, minority 2+ — kept as a strong
    # negative driver in the label logit below (distribution unchanged, it
    # already matches the sheet).
    bounced_cheques = RNG.choice([0, 1, 2, 3, 4], size=N, p=[0.70, 0.15, 0.08, 0.04, 0.03])

    # [ASSUMPTION] Correlated with years_in_business (in months), capped at
    # it — previously drawn independently, now fixed per the sheet.
    account_age_months = np.minimum(
        np.clip(RNG.uniform(6, 240, size=N), 6, None), years_in_business * 12
    ).round().astype(int)

    # [SOURCED-leaning] Only ~6.5% of Pakistani SMEs borrow formally
    # (SBP/Karandaaz) — applicants are mostly first-time. Sheet suggests
    # ~20-25% with an existing loan; 25% sits at that range's edge.
    has_existing_loan = RNG.random(N) < 0.25
    existing_installment_pkr = np.where(
        has_existing_loan,
        monthly_revenue_pkr * RNG.uniform(0.05, 0.25, size=N),
        0.0,
    ).round(-3)

    # [SOURCED bound] SBP's clean (unsecured, cash-flow-based) lending
    # limit is PKR 50M/borrower (Regulation R-9, 2026 PR) — this
    # product's ceiling, so requests are capped there with a thin tail
    # toward it, not beyond it. Median unchanged (~2M); only the upper
    # tail widened versus the old PKR 10M cap.
    requested_amount_pkr = np.clip(
        RNG.lognormal(mean=np.log(2_000_000), sigma=0.6, size=N), 500_000, 50_000_000
    )

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

    # Latent logit -> repaid (1) / defaulted (0). Driver ranking and
    # coefficients UNCHANGED from the original generator (debt burden >
    # bounced cheques > cashflow > years in business > turnover-to-loan >
    # account age — consistent with credit literature; the sheet says this
    # doesn't need fabricated coefficients). Only the intercept is
    # re-tuned so the base rate lands ~80% repaid / ~20% default:
    # deliberately between the current clean SME-portfolio NPL (~4.9%, Dec
    # 2024, guarantee-scheme-backed) and the May-2023 stressed peak
    # (~38%) — higher than the portfolio average because Aitabaar's target
    # segment (thin-file/previously-unbanked) is riskier than already
    # banked firms, and because a ~5% base rate would be a severely
    # imbalanced, hard-to-learn training set. This is a modeling
    # assumption bounded by the sourced range, not a claimed real default
    # rate — see DATA_CARD.md.
    z_debt_burden = (debt_burden_ratio - debt_burden_ratio.mean()) / debt_burden_ratio.std()
    z_cashflow = (net_cashflow_pkr - net_cashflow_pkr.mean()) / net_cashflow_pkr.std()
    z_years = (years_in_business - years_in_business.mean()) / years_in_business.std()
    z_turnover = (turnover_to_loan_ratio - turnover_to_loan_ratio.mean()) / turnover_to_loan_ratio.std()
    z_account_age = (account_age_months - account_age_months.mean()) / account_age_months.std()

    logit = (
        2.5
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
