# OSS VAT Calculator

**Automated cross-border VAT compliance for European micro-enterprises**

A Design Science Research artefact addressing the regulatory burdens faced by EU micro-enterprises applying the cross-border VAT One-Stop Shop (OSS) special scheme. Developed as part of a doctoral dissertation at the Department of Finance and Accounting, Faculty of Economics and Business Administration, Sofia University "St. Kliment Ohridski".

## Monorepo Structure

| Package | Description | Status |
|---|---|---|
| `@oss-vat/shared-core` | Auth, multi-tenancy, data lifecycle taxonomy, HMAC audit chain | Active development |
| `@oss-vat/oss-calculator` | Primary OSS compliance artefact (v1.0) | Active development |
| `@oss-vat/sme-exemption` | SME exemption calculator (Directive 2020/285) | Reserved (post-defence) |

## Quick Start

```bash
# Prerequisites: Node.js >= 20, pnpm >= 9
pnpm install
pnpm build
pnpm dev
```

## Documentation

- [Three-Layer Architecture](docs/architecture/three-layer.md)
- [Data Lifecycle Taxonomy](docs/architecture/taxonomy.md)
- [ViDA Scope](docs/vida-scope.md)
- [Future Work](docs/future-work.md)
- [Regulatory Changelog](docs/regulatory-log.md)

## Research Context

This artefact follows the DSR methodology (Peffers et al., 2007) and contributes to the Springer ASFT series chapter "Automating Cross-Border VAT Compliance: A Design Science Approach to OSS Reporting for EU Micro-Enterprises".

## License

[MIT](LICENSE) — Marieta Marinova, 2026
