# OSS VAT Calculator - Synthetic Data Validation Report

## Executive Summary

This report documents the validation of the OSS VAT Calculator against a synthetic dataset of 2,700 transactions (100 cases for each of the 27 EU Member States, reflecting standard-rated physical goods, reduced-rate digital services, and mixed baskets), plus 23 fixed-date oracle transition checks.

The validation has two distinct components:

1. **External oracle validation** (BG, DE, FR, NL, AT, for the rate types with verified history per Refactor 1): expected rates/amounts come from a small hardcoded oracle table (`ORACLE_RATES` in `scripts/synthetic-validation.ts`), transcribed directly from the verified seed sources (PwC, eClear/ASD, Tax Foundation, vatcalc, WTS Klient - see `packages/oss-calculator/src/data/eu-vat-history.seed.ts`). This oracle does **not** call `getVATRate()` - it is an independent check of the engine's output against the source data.
2. **Internal consistency check** (the remaining 22 Member States, plus FR reduced/super-reduced which has no verified history in R1): expected rates come from `getVATRate()` against the same `EU_VAT_RATES` table the engine uses. This confirms TaxEngine correctly applies the configured rate table, but is not an independent verification of the rate values themselves - that remains future work for those Member States.

## Validation Methodology

1. **Synthetic Data Generation**: Generated 2,700 transactions (100 per EU Member State) with deterministic seeding (PRNG seed: 42) for reproducibility, plus a fixed set of oracle transition-date checks for BG/DE/FR/NL/AT.
2. **Independent Oracle**: For BG, DE, FR (standard only), NL, and AT, expected rates/amounts are computed from the hardcoded `ORACLE_RATES` table - independent of the engine's rate table.
3. **Internal Consistency Fallback**: For all other (country, rate type) combinations, expected rates/amounts are computed from `getVATRate()` against `EU_VAT_RATES`.
4. **Engine Processing**: Ran all transactions through TaxEngine.
5. **Field-by-Field Comparison**: Compared VAT amounts and applied rates against the expected values from step 2/3.

## Results

### Overall Accuracy

| Metric                    | Value      |
| ------------------------- | ---------- |
| Total Transactions        | 2723       |
| Accurate Transactions     | 2723       |
| Accuracy Rate             | 100.00%    |
| Mean Absolute Error (EUR) | EUR 0.0000 |
| Max Absolute Error (EUR)  | EUR 0.0000 |

### External Oracle Validation (BG, DE, FR, NL, AT)

Expected values from the independent `ORACLE_RATES` table (not from `getVATRate()`).

| Metric                    | Value      |
| ------------------------- | ---------- |
| Total Transactions        | 490        |
| Accurate Transactions     | 490        |
| Accuracy Rate             | 100.00%    |
| Mean Absolute Error (EUR) | EUR 0.0000 |
| Max Absolute Error (EUR)  | EUR 0.0000 |

### Internal Consistency Check (other 22 Member States + FR reduced/super-reduced)

Expected values from `getVATRate()` against the engine's own `EU_VAT_RATES` table - confirms correct application of the configured table, not an independent check of the rate values.

| Metric                    | Value      |
| ------------------------- | ---------- |
| Total Transactions        | 2233       |
| Accurate Transactions     | 2233       |
| Accuracy Rate             | 100.00%    |
| Mean Absolute Error (EUR) | EUR 0.0000 |
| Max Absolute Error (EUR)  | EUR 0.0000 |

### Performance Metrics

| Metric                       | Value     |
| ---------------------------- | --------- |
| Total Processing Time        | 18.73 ms  |
| Average Time per Transaction | 0.0015 ms |
| Minimum Time per Transaction | 0.0007 ms |
| Maximum Time per Transaction | 0.2342 ms |
| Median Time per Transaction  | 0.0010 ms |

### Accuracy by Product Type

| Product Type    | Accurate | Total | Accuracy |
| --------------- | -------- | ----- | -------- |
| standard-goods  | 918      | 918   | 100.00%  |
| reduced-digital | 891      | 891   | 100.00%  |
| mixed-basket    | 891      | 891   | 100.00%  |

### Accuracy by EU Member State

| Country Code | Country Name   | Accurate | Total | Accuracy |
| ------------ | -------------- | -------- | ----- | -------- |
| AT           | Austria        | 100      | 100   | 100.00%  |
| BE           | Belgium        | 100      | 100   | 100.00%  |
| BG           | Bulgaria       | 100      | 100   | 100.00%  |
| CY           | Cyprus         | 100      | 100   | 100.00%  |
| CZ           | Czech Republic | 100      | 100   | 100.00%  |
| DE           | Germany        | 100      | 100   | 100.00%  |
| DK           | Denmark        | 100      | 100   | 100.00%  |
| EE           | Estonia        | 100      | 100   | 100.00%  |
| EL           | Greece         | 100      | 100   | 100.00%  |
| ES           | Spain          | 100      | 100   | 100.00%  |
| FI           | Finland        | 100      | 100   | 100.00%  |
| FR           | France         | 100      | 100   | 100.00%  |
| HR           | Croatia        | 100      | 100   | 100.00%  |
| HU           | Hungary        | 100      | 100   | 100.00%  |
| IE           | Ireland        | 100      | 100   | 100.00%  |
| IT           | Italy          | 100      | 100   | 100.00%  |
| LT           | Lithuania      | 100      | 100   | 100.00%  |
| LU           | Luxembourg     | 100      | 100   | 100.00%  |
| LV           | Latvia         | 100      | 100   | 100.00%  |
| MT           | Malta          | 100      | 100   | 100.00%  |
| NL           | Netherlands    | 100      | 100   | 100.00%  |
| PL           | Poland         | 100      | 100   | 100.00%  |
| PT           | Portugal       | 100      | 100   | 100.00%  |
| RO           | Romania        | 100      | 100   | 100.00%  |
| SE           | Sweden         | 100      | 100   | 100.00%  |
| SI           | Slovenia       | 100      | 100   | 100.00%  |
| SK           | Slovakia       | 100      | 100   | 100.00%  |

### Oracle Transition-Date Checks (BG, DE, FR, NL, AT)

Fixed-date checks against `ORACLE_RATES` exercising the verified rate transitions added in Refactor 1.

| Transaction           | Country | Expected Rate | Actual Rate | Expected VAT | Actual VAT | Match |
| --------------------- | ------- | ------------- | ----------- | ------------ | ---------- | ----- |
| ORACLE-DE-STANDARD-00 | DE      | 19%           | 19%         | EUR 190.00   | EUR 190.00 | Yes   |
| ORACLE-DE-STANDARD-01 | DE      | 16%           | 16%         | EUR 160.00   | EUR 160.00 | Yes   |
| ORACLE-DE-STANDARD-02 | DE      | 16%           | 16%         | EUR 160.00   | EUR 160.00 | Yes   |
| ORACLE-DE-STANDARD-03 | DE      | 19%           | 19%         | EUR 190.00   | EUR 190.00 | Yes   |
| ORACLE-DE-REDUCED-04  | DE      | 7%            | 7%          | EUR 70.00    | EUR 70.00  | Yes   |
| ORACLE-DE-REDUCED-05  | DE      | 5%            | 5%          | EUR 50.00    | EUR 50.00  | Yes   |
| ORACLE-DE-REDUCED-06  | DE      | 5%            | 5%          | EUR 50.00    | EUR 50.00  | Yes   |
| ORACLE-DE-REDUCED-07  | DE      | 7%            | 7%          | EUR 70.00    | EUR 70.00  | Yes   |
| ORACLE-NL-REDUCED-08  | NL      | 6%            | 6%          | EUR 60.00    | EUR 60.00  | Yes   |
| ORACLE-NL-REDUCED-09  | NL      | 9%            | 9%          | EUR 90.00    | EUR 90.00  | Yes   |
| ORACLE-NL-STANDARD-10 | NL      | 21%           | 21%         | EUR 210.00   | EUR 210.00 | Yes   |
| ORACLE-NL-STANDARD-11 | NL      | 21%           | 21%         | EUR 210.00   | EUR 210.00 | Yes   |
| ORACLE-AT-REDUCED-12  | AT      | 10%           | 10%         | EUR 100.00   | EUR 100.00 | Yes   |
| ORACLE-AT-REDUCED-13  | AT      | 5%            | 5%          | EUR 50.00    | EUR 50.00  | Yes   |
| ORACLE-AT-REDUCED-14  | AT      | 5%            | 5%          | EUR 50.00    | EUR 50.00  | Yes   |
| ORACLE-AT-REDUCED-15  | AT      | 10%           | 10%         | EUR 100.00   | EUR 100.00 | Yes   |
| ORACLE-AT-STANDARD-16 | AT      | 20%           | 20%         | EUR 200.00   | EUR 200.00 | Yes   |
| ORACLE-BG-STANDARD-17 | BG      | 20%           | 20%         | EUR 200.00   | EUR 200.00 | Yes   |
| ORACLE-BG-STANDARD-18 | BG      | 20%           | 20%         | EUR 200.00   | EUR 200.00 | Yes   |
| ORACLE-BG-REDUCED-19  | BG      | 9%            | 9%          | EUR 90.00    | EUR 90.00  | Yes   |
| ORACLE-BG-REDUCED-20  | BG      | 9%            | 9%          | EUR 90.00    | EUR 90.00  | Yes   |
| ORACLE-FR-STANDARD-21 | FR      | 20%           | 20%         | EUR 200.00   | EUR 200.00 | Yes   |
| ORACLE-FR-STANDARD-22 | FR      | 20%           | 20%         | EUR 200.00   | EUR 200.00 | Yes   |

## Quality Assurance

- **Independent Oracle for 5 Member States**: BG, DE, FR (standard), NL, AT rate expectations are transcribed directly from verified sources (PwC, eClear/ASD, Tax Foundation, vatcalc, WTS Klient), not derived from `getVATRate()`.
- **Internal Consistency for the Remaining Countries**: The other 22 Member States (and FR reduced/super-reduced) are checked against the engine's own rate table; independent verification of those rates is future work.
- **Deterministic Validation**: Uses fixed PRNG seed (42) for reproducibility.
- **Rounding**: All VAT amounts rounded to EUR cent precision (2 decimal places).
- **Tolerance**: 0.01 EUR (1 cent) for amounts, 0.001 percentage points for rates.

## Technical Details

### Synthetic Dataset Composition

- **Countries**: 27 EU Member States
- **Transactions per Country**: 100 (standard: 34, reduced: 33, mixed: 33)
- **Oracle Transition Checks**: 23 fixed-date transactions across BG, DE, FR, NL, AT
- **Date Range (per-country dataset)**: Q1 2026 (January 1 - March 31, 2026)
- **Amount Range (per-country dataset)**: EUR 5 - EUR 500 per transaction
- **Currency**: EUR only (no conversion required)

### Discrepancies Found

No discrepancies. All transactions validated successfully.

## Conclusion

The OSS VAT Calculator processes all 2723 synthetic transactions with **100.00% overall accuracy** (100.00% against the independent oracle for BG/DE/FR/NL/AT, 100.00% on the internal consistency check for the remaining countries). The oracle results confirm that the date-aware, provenance-carrying rate lookup introduced in Refactor 1 reproduces the verified historical rate transitions for the 5 scoped Member States.

---

**Report Generated**: 2026-06-15T20:54:02.776Z
**PRNG Seed**: 42 (for reproducibility)
