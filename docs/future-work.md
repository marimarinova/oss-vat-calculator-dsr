# Future Work

## SME Exemption Calculator (Post-Defence)

This artefact focuses on the OSS special scheme (Art 369a VAT Directive). Future work will extend the DSR framework to the cross-border SME exemption regime (Directive (EU) 2020/285, applicable from 1 January 2025).

Initial architectural analysis suggests the four-tier lifecycle taxonomy developed here generalizes to the SME context, but requires separate empirical validation. Package namespace `@oss-vat/sme-exemption` is reserved for post-defence implementation (target: Q3 2028).

The SME exemption artefact will share the `@oss-vat/shared-core` infrastructure (authentication, multi-tenancy, data lifecycle taxonomy, HMAC audit chain) while implementing SME-specific logic:

- EU-wide annual turnover tracking (EUR 100,000 threshold)
- Per-member-state national small enterprise threshold monitoring
- EX identification number management
- Quarterly notification workflow per Art 284(3a)
- Decision support: SME exemption vs OSS applicability per transaction per destination member state

### Academic context

The dual-artefact configuration enables Paper G ("Complementary Compliance Regimes: A Dual Design Science Evaluation"), which validates the four-tier data lifecycle taxonomy (Paper A) across both OSS and SME regulatory domains, strengthening the generalization claim from single-artefact to cross-regime.

## ViDA Phase 2+ Extensions

See `vida-scope.md` for explicit scope boundaries of v1.0 and planned v2.0+ extensions aligned with ViDA implementation milestones.

## Peppol BIS 3.0 Integration

Peppol Access Point integration is explicitly out of scope for v1.0 and v2.0. The architectural recommendation (documented in Paper F) is for micro-enterprises to use shared Access Point providers (accountant-managed hubs) rather than individual Peppol registrations. Interface contracts for future Peppol integration are documented in `docs/architecture/`.
