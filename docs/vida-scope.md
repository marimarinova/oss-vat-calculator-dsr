# ViDA Scope Document

**Purpose:** Explicit documentation of what this artefact implements and does not implement regarding ViDA (VAT in the Digital Age, Directive 2025/516). This document serves as a scope defence for academic reviewers and pilot user expectations.

## Included in v1.0 (Pre-Defence)

| Feature | Regulatory basis | Rationale |
|---|---|---|
| OSS special scheme (Union, Non-Union, iOSS) | Art 369a-369x VAT Directive | Primary thesis scope |
| GDPR Art 17 x Art 63c reconciliation | Reg 282/2011 + GDPR | Paper A core contribution |
| HMAC audit chain + Sigstore anchoring | eIDAS Reg 910/2014, Art 63c | Paper B foundation |
| Platform Economy deemed supplier flag | Art 14a VAT Directive (ViDA) | Minimal ViDA readiness |
| ViDA-forward data model (schema extensibility) | Directive 2025/516 | Paper C foundation |

## Included in v2.0 (Post-Defence, Pre-SVR July 2028)

| Feature | Regulatory basis | Rationale |
|---|---|---|
| SVR expanded transaction types | Art 369a expanded by Directive 2025/516 | Paper F core exhibit |
| Own-goods transfers between MS warehouses | SVR Art 17(1) amendment | SVR scope expansion |
| Call-off stock simplification expansion | Art 17a amendment | SVR scope expansion |
| B2C domestic sales in other MS | SVR expansion | New OSS-covered transactions |
| Platform facilitator ID tracking | Art 14a implementing measures | Deemed supplier support |

## NOT Included (Explicit Exclusions)

| Feature | Reason for exclusion |
|---|---|
| **Peppol BIS 3.0 integration** | Infrastructure burden disproportionate to micro-enterprise; recommend shared Access Point providers |
| **EN 16931 e-invoice generation** | B2B focused; outside OSS B2C core scope |
| **Full DRR 2-day real-time reporting** | 2030+ regulatory phase; requires near-real-time pipeline infrastructure |
| **SME exemption regime** | Separate artefact (`@oss-vat/sme-exemption`), post-defence (Paper G) |
| **Domestic-only VAT returns** | Outside cross-border scope; existing tools sufficient |
| **Customs declarations (import VAT)** | Outside OSS scope; iOSS covers import scheme only up to EUR 150 |

## Scope Evolution Timeline

```
v1.0 (Q4 2026)  ── current OSS regime ──────────────────── DEFENCE
v2.0 (Q2 2028)  ── SVR-ready (pre-July 2028 go-live) ──── Paper F
v3.0 (2030+)    ── DRR-integrated (design only) ────────── Paper C
```

## Reviewer FAQ

**Q: Why not Peppol?**
A: Peppol Access Point certification costs EUR 500-2000/year and requires AS4 protocol infrastructure. This is disproportionate for micro-enterprises with annual turnover below EUR 100,000. Paper F recommends shared Access Point providers as policy solution.

**Q: Why not full EN 16931 e-invoicing?**
A: OSS is B2C. EN 16931 mandatory e-invoicing (ViDA DRR) targets intra-EU B2B transactions. Mixed B2B/B2C micro-enterprises can use the optional EN 16931 adapter (documented but not implemented in v1.0).

**Q: Why is SME exemption a separate artefact?**
A: OSS and SME exemption are complementary but structurally different regimes with different threshold logic, identification numbers, and reporting structures. Separate artefacts enable dual-instantiation validation of the four-tier data lifecycle taxonomy (Paper A generalization claim).
