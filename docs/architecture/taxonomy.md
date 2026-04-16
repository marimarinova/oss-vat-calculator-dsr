# Four-Tier Data Lifecycle Taxonomy

## Overview

Reconciles GDPR right-to-erasure (Art 17) with EU VAT mandatory retention (Art 63c Implementing Regulation 282/2011, extended by ViDA DRR).

## Tier Definitions

| Tier | Name | TTL | Trigger | Example |
|---|---|---|---|---|
| 0 | Ephemeral | < 90 days | Auto-purge on TTL expiry | Session tokens, draft calculations, temporary exports |
| 1 | Soft-deletable | 30-day grace period | User deletion request | User notes, custom labels, non-regulatory metadata |
| 2 | Pseudonymizable PII | Retain shell, anonymize PII | GDPR Art 17 request | Customer name, email, address → anonymized; transaction amounts, VAT, dates → preserved |
| 3 | Immutable retention | >= 10 years (Art 63c + ViDA DRR) | Cannot be deleted | Transaction canonical record, VAT calculations, submission confirmations, audit trail |
| 4 | Eternal public commitment | Permanent | Never | Sigstore transparency log anchors, Zenodo DOI metadata |

## Transition Rules

- Tier 0 → automatic purge (no user action)
- Tier 1 → soft delete → 30-day grace → permanent delete
- Tier 2 → pseudonymization (PII fields set to anonymized values, non-PII preserved)
- Tier 3 → no deletion possible; pseudonymization of PII overlay only (original hash preserved in audit chain)
- Tier 4 → immutable by definition (external system of record)

## GDPR Art 17 Request Flow (Tier 2)

1. User requests data deletion
2. System identifies all records per tier classification
3. Tier 0/1 records: deleted immediately (or after 30-day grace)
4. Tier 2 records: PII fields anonymized, transaction shell preserved
5. Tier 3 records: deletion refused with Art 63c legal basis explanation
6. Tier 4 records: not applicable (external)
7. Confirmation issued to user with tier breakdown

## Academic Context

This taxonomy is the core contribution of Paper A (IJAIS target). Dual-instantiation validation across OSS and SME artefacts strengthens generalization claim (Paper G).
