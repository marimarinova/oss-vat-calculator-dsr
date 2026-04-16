# @oss-vat/sme-exemption

**Status: Reserved namespace — development begins post-defence (target Q3 2028)**

Cross-border SME exemption calculator supporting Directive (EU) 2020/285 (applicable from 1 January 2025).

## Planned scope

- EU-wide turnover tracking (€100,000 annual threshold)
- Per-MS national small enterprise threshold monitoring
- EX identification number management
- Quarterly notification workflow
- Decision support: SME exemption vs OSS per transaction per destination MS

## Relationship to OSS Calculator

Shares `@oss-vat/shared-core` infrastructure (auth, multi-tenancy, taxonomy, HMAC audit chain). Independent release cycle and Zenodo DOI track.

## Academic context

This package will serve as the second DSR artefact instantiation for Paper G ("Complementary Compliance Regimes: A Dual Design Science Evaluation"), validating the four-tier data lifecycle taxonomy (Paper A) across both OSS and SME regulatory domains.

See `docs/future-work.md` for research territory reservation.
