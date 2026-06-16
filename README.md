# OSS VAT Calculator

**Automated cross-border VAT compliance for European micro-enterprises**

A Design Science Research (DSR) artefact addressing the regulatory burdens faced by EU micro-enterprises applying the cross-border VAT One-Stop Shop (OSS) special scheme. This repository contains production-grade software implementing a three-layer pan-European architecture for VAT compliance automation across all 27 EU member states.

Developed as part of a doctoral dissertation at the Department of Finance and Accounting, Faculty of Economics and Business Administration, Sofia University "St. Kliment Ohridski" (2024-2026).

---

## Quick Start

### Prerequisites

- Node.js >= 20.0.0
- pnpm >= 9.0.0
- Firebase CLI (for deployment — see [Deployment](#deployment) below)

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

---

## Architecture Overview

### Three-Layer Pan-European Design

```
┌─────────────────────────────────────────────────────────────┐
│ Layer 3: Localization (i18n, currency, country names)       │
│          - 27 EU member state support                        │
│          - Multi-language message bundles (BG, EN, DE, FR)   │
│          - ECB daily reference-rate currency conversion      │
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
│          - Transaction recording (canonical schema)          │
│          - VAT rate lookup & calculation                     │
│          - Four-tier data lifecycle enforcement (T0-T4)      │
│          - HMAC-SHA256 audit chain (Web Crypto SubtleCrypto) │
│          - Quarterly aggregation engine                      │
│          - Correction & credit note processing               │
│          - Threshold monitoring (Art. 59c, Dir. 2020/285)    │
└─────────────────────────────────────────────────────────────┘
```

### Monorepo Structure

| Package                   | Description                                                                | Status             |
| ------------------------- | -------------------------------------------------------------------------- | ------------------ |
| `@oss-vat/shared-core`    | Authentication, multi-tenancy, data lifecycle taxonomy, HMAC audit chain   | Active development |
| `@oss-vat/oss-calculator` | Primary OSS compliance artefact with Layer 2 & 3 implementation (v1.0)     | Active development |
| `@oss-vat/sme-exemption`  | SME exemption monitor — `SMECrossBorderMonitor`, EUR 100,000 cap           | Implemented        |
| `@oss-vat/web-app`        | Firebase-hosted frontend (React + Vite); Firestore + localStorage fallback | Built              |

---

## Key Features

### VAT Rates: Date-Aware Historical Lookup

VAT rates are looked up from `EU_VAT_RATES`, which stores date-versioned rate histories. Each rate entry carries `sourceUrl` and `legalBasis` provenance metadata.

- **11 countries with fully verified rate history**: BG, DE, FR, NL, AT, EE, FI, SK, LU, IE, CZ — historical changes verified against official government sources
- **Remaining 16 EU member states**: current standard rate verified against the EU Commission's published rate table; historical snapshots are not yet covered
- All 27 current standard rates have been independently verified

### Threshold Monitoring

Three statutory monitors are implemented:

| Monitor                  | Threshold   | Legal basis                                       |
| ------------------------ | ----------- | ------------------------------------------------- |
| `DistanceSalesMonitor`   | EUR 10,000  | Art. 59c VAT Directive — OSS registration trigger |
| `SMECrossBorderMonitor`  | EUR 100,000 | Dir. (EU) 2020/285 — cross-border SME exemption   |
| `IOSSConsignmentMonitor` | EUR 150     | IOSS consignment value cap                        |

`DistanceSalesMonitor` tracks union-wide distance sales of goods and electronically supplied services; crossing the EUR 10,000 threshold triggers mandatory OSS registration. `SMECrossBorderMonitor` tracks union-wide annual turnover across both the current and preceding calendar year; exceeding the cap in either year removes eligibility for the cross-border SME exemption.

### ECB Daily Reference-Rate Currency Conversion

Currency conversion implements **Article 91(2) of Directive 2006/112/EC** (ECB rate on the date VAT becomes chargeable) and **Article 61c of Implementing Regulation (EU) 282/2011** (ECB rate on the last day of the OSS reporting period).

- `ConversionPolicy.DAILY_AT_CHARGEABLE_EVENT` — Art. 91(2): rate on the chargeable event date
- `ConversionPolicy.LAST_DAY_OF_PERIOD` — Art. 61c: rate on the last day of the reporting quarter
- Weekend and public-holiday rollback: walks back up to 4 calendar days to find the most recent published ECB rate
- Cross-rate via EUR: non-EUR to non-EUR pairs use triangular conversion (source → EUR → target)
- ISO 4217 minor-unit rounding via `ECB_DECIMAL_PLACES` table (29 currencies; 0 decimals for JPY, KRW, ISK)
- Module-level rate store (`registerDailyRate` / `clearDailyRates`) populated from ECB eurofxref-daily XML via `parseECBDailyXML()`
- Scheduled ingestion via a Cloud Function stub (`functions/ecb-daily-fetcher.stub.ts`) — illustrative only, not deployed

### HMAC-SHA256 Audit Chain

The audit chain is implemented using the **Web Crypto SubtleCrypto API** with HMAC-SHA256:

- Each audit entry carries `sequenceNumber`, `previousHash`, and `keyEpoch`
- Sequential gaps in `sequenceNumber` are detected as truncation attempts
- Key rotation by epoch: the correct key is selected per-entry when verifying a chain that spans a key rotation boundary
- The HMAC signing key never leaves the server — browser-side code calls an `AuditSigner` interface implemented as a Cloud Function stub (`functions/sign-audit-entry.stub.ts`)
- `shared-core` exports `AuditChain`, `AuditEntry`, `verifyChain`, `appendEntry`

### Art. 63c OSS Record Keeping

**Article 63c of Council Implementing Regulation (EU) 282/2011** mandates 10-year retention of 12 enumerated data elements for every OSS supply.

All 12 statutory fields are implemented (`Art63cRecord`):

| Field group                 | Art. 63c ref | Implementation                                        |
| --------------------------- | ------------ | ----------------------------------------------------- |
| Member state of consumption | (a)          | `memberStateOfConsumption`                            |
| Supply type                 | (b)          | `supplyType` (goods / services / digital)             |
| Date of supply              | (c)          | `dateOfSupply`                                        |
| Taxable amount + currency   | (d)          | `taxableAmount`, `currency`                           |
| VAT rate applied            | (e)          | `vatRateApplied`                                      |
| VAT amount                  | (f)          | `vatAmount`                                           |
| Date & amount of payment    | (g)–(h)      | `paymentInformation` (from `/payments` subcollection) |
| Advance payments            | (i)          | `advancePaymentInfo`                                  |
| Invoice details             | (j)          | `invoiceNumber`, `invoiceDate`                        |
| Customer location evidence  | (k)          | `customerLocationEvidence` (up to 2 items)            |
| Return/correction info      | (l)          | `returnInformation` (from `/returns` subcollection)   |

Fields not yet captured in the transaction schema are set to the sentinel `NOT_CAPTURED` (never fabricated).

Export formats: **CSV** (16 columns) and **JSON**. Each record includes `retentionUntil: "${supplyYear + 10}-12-31"` and `scheme: 'UNION_OSS'` metadata.

Firestore subcollections:

- `users/{uid}/transactions/{txId}/payments/{paymentId}` — append-only, validated (date, amount, currency, isAdvance, createdAt)
- `users/{uid}/transactions/{txId}/returns/{returnId}` — append-only, validated (date, returnedAmount, vatRate, createdAt)

### Regulatory Output

- **NAP Bulgaria CSV** — Bulgarian tax authority portal format (Section 2A/2B/2C/2D aggregation)
- **PDF invoice** — per Directive 2006/112/EC Article 226 mandatory fields
- **EN 16931 / UBL 2.1 XML** — semantic invoice standard for future ViDA compliance (2035)

### Web Application

The `@oss-vat/web-app` package is a **built React + Vite application** with Firebase hosting:

- Pages: Dashboard, Transactions, Calculator, Filing, Settings, Login
- Firestore persistence (user-scoped, append-only) with a localStorage fallback for demo use without Firebase credentials
- Transaction corrections via supplementary entries (no in-place mutation)
- Threshold alerts via `ThresholdAlert` component
- VAT return preview via `ReturnPreview` component

---

## Testing & Validation

### Test Suite

417 tests across 4 packages (Vitest v2.1.9, strict TypeScript):

| Package                   | Tests |
| ------------------------- | ----- |
| `@oss-vat/oss-calculator` | 270   |
| `@oss-vat/shared-core`    | 133   |
| `@oss-vat/sme-exemption`  | 5     |
| `@oss-vat/web-app`        | 9     |

```bash
# Unit tests across all packages
pnpm test

# Watch mode (development)
pnpm test -- --watch

# Coverage report
pnpm test -- --coverage
```

### Synthetic Validation

2,730 synthetic transactions verified by `scripts/synthetic-validation.ts`:

- **Verified countries** (11 — BG, DE, FR, NL, AT, EE, FI, SK, LU, IE, CZ): results cross-checked against an independent external oracle derived from official historical rate sources
- **Remaining 16 countries**: internal consistency check only (correct rate applied, correct arithmetic)
- Validation report: `scripts/VALIDATION_REPORT.md`

---

## Deployment

> **Not yet deployed.** Production deployment requires a Firebase Blaze plan, project credentials, and active Cloud Functions. The Cloud Function stubs in `functions/` are illustrative and not built or deployed.

When credentials are available:

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase (creates .firebaserc config)
firebase login

# Deploy hosting, Firestore rules and indexes
firebase deploy --only hosting,firestore:rules,firestore:indexes --project oss-vat-calculator-dev
```

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

### Firestore Security Rules

- User-scoped data access (`match on userId`)
- Append-only audit logs — updates and deletes are rejected at the rules layer
- Payment and return subcollections: create-only with field-level validation
- VAT transaction field validation: `amount > 0`, valid ISO 3166-1 EU country code, ISO 8601 date, VAT rate 0–100%

---

## Scope & Known Limitations

This artefact covers **B2C OSS Union Scheme** supplies only. The following are out of scope and not implemented:

- B2B reverse charge transactions
- Export supplies (outside EU)
- Deemed supplier / marketplace facilitation (Art. 14a)
- IOSS transaction processing (separate scheme)
- Full EU-27 verified VAT rate history (11 countries fully verified; 16 are current-rate only)
- Production deployment (Firebase Blaze plan, credentials, and live Cloud Functions not configured)

---

## Research Context

### Contribution to Design Science Research

This artefact implements **five core design principles** for automating cross-border VAT compliance:

1. **Multi-Tenancy Architecture** — Isolate user data across 27 EU member states
2. **Data Access Control** — Enforce user-scoped read/write via Firestore rules (append-only)
3. **Validated Data Lifecycle** — Immutable HMAC-SHA256 audit trail with field-level validation
4. **Regulatory Output Alignment** — Direct export to authority portal formats (NAP Bulgaria primary); Art. 63c OSS records
5. **Forward Compatibility** — Ready for ViDA SVR expansion (2028) and pan-EU standardization

### Methodology

- **DSR Approach** (Peffers et al., 2007; Johannesson & Perjons, 2021)
- **Problem Investigation** — EU regulatory complexity burdens micro-enterprises
- **Design Artifacts** — Three-layer architecture, 417 tests, 2,730 validated synthetic transactions, production code
- **Evaluation** — Functional completeness, regulatory compliance, type safety

### Academic Publication

**Springer ASFT Series Chapter** (2026)

- _Title_: "Automating Cross-Border VAT Compliance: A Design Science Approach to OSS Reporting for EU Micro-Enterprises"
- _Authors_: Marieta Marinova, Department of Finance and Accounting, Sofia University
- _Focus_: Addressing information asymmetries in VAT compliance through automation

### Regulatory References

- Directive 2006/112/EC (VAT Directive), Art. 59c, Art. 91(2), Art. 226
- Directive (EU) 2020/285 (SME exemption)
- Directive 2024/... (ViDA — VAT in the Digital Age)
- Council Implementing Regulation (EU) 282/2011, Art. 61c, Art. 63c (as amended by Reg. (EU) 2017/2459)
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

- 100% TypeScript with strict mode enabled (`strict: true`, no `any`, no `@ts-ignore`)
- Full source maps and declaration files
- Discriminated union types for results (success/error)

### Security

- User authentication via Firebase Auth
- Row-level security via Firestore rules
- HMAC-SHA256 audit chain (Web Crypto SubtleCrypto) — signing key server-side only
- Append-only audit logs enforced at the Firestore rules layer
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
