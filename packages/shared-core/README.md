# @oss-vat/shared-core

Shared infrastructure for OSS VAT Calculator monorepo.

## Modules

- **Auth** — Supabase Auth (magic link, 50k MAU free tier)
- **Multi-tenancy** — PostgreSQL Row-Level Security per tenant
- **Data Lifecycle Taxonomy** — Four-tier classification (Tier 0–4) reconciling GDPR Art 17 with Art 63c retention
- **HMAC Audit Chain** — `h_n = HMAC_k(h_{n-1} || canonical(row_n))` with periodic Sigstore anchoring
- **Audit Log** — Immutable append-only log with B-Trust QES support

## Status

Under active development (Sprint 0.8+).
