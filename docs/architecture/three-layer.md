# Three-Layer Pan-EU Architecture

## Overview

The OSS VAT Calculator follows a three-layer architecture designed for regulatory evolution across 27 EU member states:

```
Layer 3: Localization (i18n, currency, country names)
Layer 2: National Adapters (NAP Bulgaria primary, extensible)
Layer 1: Core Engine (tax calculation, schema, audit, lifecycle)
```

## Layer 1 — Core Engine

Regulation-neutral business logic:

- Transaction recording with 63-column canonical schema
- VAT rate lookup and calculation
- Four-tier data lifecycle enforcement (Tier 0-4)
- HMAC audit chain computation
- Quarterly aggregation engine
- Correction and credit note processing

## Layer 2 — National Adapters

Member-state-specific submission logic:

- **NAP Bulgaria** (primary adapter, v1.0)
  - Cheatsheet dashboard matching NAP OSS form structure
  - Four sections: 2A (services from BG), 2B (goods from BG), 2C (services from other MS), 2D (goods from other MS)
  - Copy-paste workflow optimized for manual NAP web form entry
  - Browser extension auto-fill (v1.1 stretch goal)
- **Future adapters** — DE (BZSt/ELSTER), AT (BMF FinanzOnline), NL (Belastingdienst)

## Layer 3 — Localization

- Bulgarian country name mapping (exact NAP dropdown match)
- Currency conversion (ECB + BNB reference rates)
- i18n message bundles (BG, EN primary; DE, FR planned)
- Date format localization (dd.mm.yyyy for BG)

## Design Rationale

This architecture supports regulatory evolution by isolating change:

- ViDA SVR expansion (July 2028) → Layer 1 schema extension + Layer 2 adapter update
- New MS adapter → Layer 2 only
- EN 16931 e-invoicing → optional Layer 2 module
- GDPR/retention changes → Layer 1 taxonomy update only

This separation is a core contribution of Paper C.
