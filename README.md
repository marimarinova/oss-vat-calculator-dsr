# OSS VAT Calculator

**Automated cross-border VAT compliance for European micro-enterprises**

A Design Science Research (DSR) artefact addressing the regulatory burdens faced by EU micro-enterprises applying the cross-border VAT One-Stop Shop (OSS) special scheme. This repository contains production-grade software implementing a three-layer pan-European architecture for VAT compliance automation across all 27 EU member states.

Developed as part of a doctoral dissertation at the Department of Finance and Accounting, Faculty of Economics and Business Administration, Sofia University "St. Kliment Ohridski" (2024-2026).

---

## Quick Start

### Prerequisites

- Node.js >= 20.0.0
- pnpm >= 9.0.0
- Firebase CLI (for deployment)

### Installation & Development

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run development server
pnpm dev

# Run all tests
pnpm test

# Format code
pnpm format
```

### Firebase Setup

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase (creates .firebaserc config)
firebase login

# Deploy to development environment
firebase deploy --only hosting,firestore:rules,firestore:indexes --project oss-vat-calculator-dev

# Deploy to production
firebase deploy --only hosting,firestore:rules,firestore:indexes --project oss-vat-calculator
```

---

## Architecture Overview

### Three-Layer Pan-European Design

```
┌─────────────────────────────────────────────────────────────┐
│ Layer 3: Localization (i18n, currency, country names)       │
│          - 27 EU member state support                        │
│          - Multi-language message bundles (BG, EN, DE, FR)   │
│          - Currency conversion (ECB + BNB rates)             │
└─────────────────────────────────────────────────────────────┘
                            ↑
┌─────────────────────────────────────────────────────────────┐
│ Layer 2: National Adapters (authority-specific submission)   │
│          - NAP Bulgaria (primary, v1.0)                      │
│          - Future: BZSt (DE), FinanzOnline (AT), NL, ...     │
│          - Section aggregation (2A, 2B, 2C, 2D)              │
│          - Output generators (PDF, CSV, UBL/EN16931)         │
└─────────────────────────────────────────────────────────────┘
                            ↑
┌─────────────────────────────────────────────────────────────┐
│ Layer 1: Core Engine (regulation-neutral business logic)     │
│          - Transaction recording (63-column canonical schema)│
│          - VAT rate lookup & calculation                     │
│          - Four-tier data lifecycle enforcement (T0-T4)      │
│          - HMAC audit chain computation                      │
│          - Quarterly aggregation engine                      │
│          - Correction & credit note processing               │
└─────────────────────────────────────────────────────────────┘
```

### Monorepo Structure

| Package                   | Description                                                              | Status                  |
| ------------------------- | ------------------------------------------------------------------------ | ----------------------- |
| `@oss-vat/shared-core`    | Authentication, multi-tenancy, data lifecycle taxonomy, HMAC audit chain | Active development      |
| `@oss-vat/oss-calculator` | Primary OSS compliance artefact with Layer 2 & 3 implementation (v1.0)   | Active development      |
| `@oss-vat/sme-exemption`  | SME exemption calculator (Directive 2020/285)                            | Reserved (post-defence) |
| `@oss-vat/web-app`        | Firebase-hosted frontend (React + Vite)                                  | Planned                 |

---

## Key Features

### Design Principle 1: Multi-Tenancy Architecture

- Isolated user data per authentication context
- Row-level security enforcement via Firestore rules
- Support for 27 EU member states simultaneously

### Design Principle 2: Data Access Control

- User-scoped transaction collection (users/{userId}/transactions/{transactionId})
- Append-only audit log enforcement (no updates/deletes)
- Read-only access to archived data
- Comprehensive Firestore security rules implementation

### Design Principle 3: Validated Data Lifecycle

- Transaction-level field validation (amount > 0, valid country code, valid date)
- VAT rate validation (0-100%)
- EU country code enforcement (27 MS only)
- Date format validation (ISO 8601: YYYY-MM-DD)

### Design Principle 4: Regulatory Output Alignment

- NAP Bulgarian portal CSV format export
- PDF invoice generation per Directive 2006/112/EC Article 226
- EN 16931 / UBL 2.1 XML for future ViDA compliance (2035)

### Design Principle 5: Forward Compatibility

- ViDA SVR support skeleton (ready for 2028 expansion)
- PEPPOL invoicing profile compatibility
- Extensible adapter pattern for future MS implementations

---

## Documentation

### Architecture & Design

- [Three-Layer Architecture Deep Dive](docs/architecture/three-layer.md) — Layer 1/2/3 design patterns
- [Data Lifecycle Taxonomy](docs/architecture/taxonomy.md) — T0-T4 lifecycle enforcement
- [ViDA Scope & Future Roadmap](docs/vida-scope.md) — Post-2028 evolution planning
- [Regulatory Evolution Log](docs/regulatory-log.md) — VAT directive changes tracked

### Implementation Details

- [Layer 3 Output Generation](packages/oss-calculator/LAYER3_IMPLEMENTATION_SUMMARY.md) — PDF/CSV/UBL generators
- [Layer 2 NAP Adapter](packages/oss-calculator/IMPLEMENTATION.md) — Bulgarian portal integration
- [Shared Core Types](packages/shared-core/README.md) — Authentication & audit chain

---

## Testing

### Run All Tests

```bash
# Unit tests across all packages
pnpm test

# Watch mode (development)
pnpm test -- --watch

# Coverage report
pnpm test -- --coverage
```

### Test Coverage Targets

- **@oss-vat/shared-core**: 95%+ (HMAC audit chain, lifecycle enforcement)
- **@oss-vat/oss-calculator**: 95%+ (105+ test cases for Layer 2 & 3)
- **@oss-vat/sme-exemption**: 95%+ (post-defence)

---

## Firebase Deployment

### Configuration Files

- **firebase.json** — Hosting, Firestore rules, and index configuration
- **firestore.rules** — Security rules enforcing Design Principles 2 & 3
- **firestore.indexes.json** — Composite indexes for optimized queries
- **.firebaserc** — Project aliases (dev/production)

### Security Rules Highlights

- User-scoped data access (match on userId)
- Append-only audit logs (no updates/deletes allowed)
- Read-only archived data
- VAT transaction validation:
  - amount > 0
  - valid country code (27 EU MS)
  - valid date format (ISO 8601)
  - valid VAT rates (0-100%)

### Environment Variables

Copy `.env.example` to `.env.local` and populate Firebase credentials:

```bash
cp .env.example .env.local
```

Required variables:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_MEASUREMENT_ID`

---

## Research Context

### Contribution to Design Science Research

This artefact implements **five core design principles** for automating cross-border VAT compliance:

1. **Multi-Tenancy Architecture** — Isolate user data across 27 EU member states
2. **Data Access Control** — Enforce user-scoped read/write via Firestore rules
3. **Validated Data Lifecycle** — Immutable audit trail with field-level validation
4. **Regulatory Output Alignment** — Direct export to authority portal formats (NAP Bulgaria primary)
5. **Forward Compatibility** — Ready for ViDA SVR expansion (2028) and pan-EU standardization

### Methodology

- **DSR Approach** (Peffers et al., 2007; Johannesson & Perjons, 2021)
- **Problem Investigation** — EU regulatory complexity burdens micro-enterprises
- **Design Artifacts** — Three-layer architecture, 105+ test cases, production code
- **Evaluation** — Functional completeness, regulatory compliance, type safety

### Academic Publication

**Springer ASFT Series Chapter** (2026)

- _Title_: "Automating Cross-Border VAT Compliance: A Design Science Approach to OSS Reporting for EU Micro-Enterprises"
- _Authors_: Marieta Marinova, Department of Finance and Accounting, Sofia University
- _Focus_: Addressing information asymmetries in VAT compliance through automation

### Regulatory References

- Directive 2006/112/EC (VAT Directive)
- Directive 2024/... (ViDA — VAT in the Digital Age)
- Council Regulation (EU) No 1042/2013 (OSS special scheme)
- Bulgarian Ordinance on VAT (OSS portal specification)

### Standards & Frameworks

- EN 16931-1:2017 (Semantic data model for invoicing)
- UBL 2.1 (Universal Business Language)
- PEPPOL (Pan-European Public Procurement Online)
- ISO 3166-1 (Country codes)
- ISO 4217 (Currency codes)
- ISO 8601 (Date/time format)

---

## Compliance & Quality

### Type Safety

- 100% TypeScript with strict mode enabled
- Full source maps and declaration files
- Discriminated union types for results (success/error)

### Validation

- 45+ validation rules for invoice generation (Article 226 compliance)
- 35+ test cases for NAP CSV export format
- 33+ test cases for EN 16931 / UBL adapter
- Firestore security rule validation at DB layer

### Security

- User authentication via Firebase Auth
- Row-level security via Firestore rules
- HMAC-based audit chain (Layer 1)
- Read-only append-only audit logs
- OWASP-aligned headers (X-Frame-Options, X-Content-Type-Options, CSP)

---

## License

MIT License — Marieta Marinova, 2026

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

---

## Citation

If you use this artefact in academic research, please cite:

```bibtex
@inproceedings{marinova2026oss,
  title={Automating Cross-Border VAT Compliance: A Design Science Approach to OSS Reporting for EU Micro-Enterprises},
  author={Marinova, Marieta},
  booktitle={Springer ASFT Series},
  year={2026},
  publisher={Springer},
  address={Berlin/Heidelberg}
}
```

---

## Contributing

This is an academic research artefact. Contributions are welcome through GitHub issues and pull requests. Please ensure all tests pass and maintain TypeScript strict mode compliance.

## Contact

**Author**: Marieta Marinova  
**Email**: kavaznia@gmail.com  
**Institution**: Sofia University "St. Kliment Ohridski", Department of Finance and Accounting  
**GitHub**: https://github.com/marimarinova/oss-vat-calculator
