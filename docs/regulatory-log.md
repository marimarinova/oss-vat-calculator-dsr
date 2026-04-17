# Regulatory Changelog

**Purpose:** Track EU regulatory developments affecting the OSS VAT Calculator artefact. Auto-populated via n8n workflow (EUR-Lex RSS + OpenAI summarization) with manual review.

**Update frequency:** Daily (automated) + weekly manual review

**Relevance tiers:**

- **Tier 1** — Directly affects artefact implementation (schema, logic, UI)
- **Tier 2** — Affects publication strategy (Paper A/B/C/F/G content)
- **Tier 3** — General context (policy direction, political signals)

---

## Entries

### 2025-04-14 | Directive (EU) 2025/516 — ViDA adopted

- **Source:** EUR-Lex, ECOFIN Council
- **Document:** Directive (EU) 2025/516 amending Directive 2006/112/EC
- **Relevance:** Tier 1
- **Affects papers:** All (0, A, B, C, F, G)
- **Summary:** ViDA adopted. Three pillars: (1) Digital Reporting Requirements + e-invoicing, (2) Platform Economy deemed supplier rules, (3) Single VAT Registration (SVR). SVR go-live 1 July 2028. DRR mandatory intra-EU B2B by 1 July 2030.
- **Action:** Baseline regulatory event for entire project.

### 2025-01-01 | Directive (EU) 2020/285 — SME exemption applicable

- **Source:** EUR-Lex
- **Document:** Council Directive (EU) 2020/285
- **Relevance:** Tier 2
- **Affects papers:** G
- **Summary:** Cross-border SME exemption regime becomes applicable. MS must transpose. EUR 100,000 EU-wide threshold. EX identification numbers issued by home MS.
- **Action:** Reserved `@oss-vat/sme-exemption` namespace. Post-defence development.

---

_Newer entries will be prepended above this line by n8n workflow._
