# @oss-vat/oss-calculator

Primary DSR artefact — automated cross-border VAT OSS compliance for EU micro-enterprises.

## Scope (v1.0)

- OSS Union scheme (Art 369a–369k VAT Directive)
- Non-Union scheme readiness (Art 369 et seq.)
- iOSS import scheme (Art 369l–369x)
- NAP Bulgaria cheatsheet dashboard with copy-paste workflow
- Article 63c 10-year canonical retention schema (63 columns)
- ViDA forward-compatible data model (platform deemed supplier flag ready)

## Architecture

Three-layer pan-EU design:
1. **Core engine** — tax calculation, schema, audit
2. **National adapters** — NAP Bulgaria (primary), extensible to other MS
3. **Localization** — i18n, currency, country name mappings

## Status

Under active development (Sprint 1+).
