# Layer 3: Output Generation

**Design Principle 5: Portal-aligned output with forward compatibility**

This layer provides three complementary output generators for EU VAT OSS compliance:

## Overview

Layer 3 implements the final stage of the OSS VAT Calculator pipeline, converting calculated VAT data into three distinct output formats:

1. **PDF Invoice Generator** — Directive 2006/112/EC Article 226 compliant invoicing
2. **CSV Exporter** — Bulgarian National Revenue Agency (NAP) OSS portal submission
3. **EN 16931 Adapter** — UBL 2.1 XML for forward compatibility with ViDA (2035)

Each generator is designed for production use, fully type-safe, and works in both Node.js and browser environments (where applicable).

---

## 1. PDF Invoice Generator

**File:** `pdf-invoice.ts`

Generates professional PDF invoices compliant with EU Directive 2006/112/EC, Article 226, which prescribes mandatory invoice content for VAT reporting.

### Mandatory Fields (Article 226)

The PDF generator ensures all required fields are present:

- ✓ Seller VAT identification number
- ✓ Buyer identification (name, address, VAT number if B2B)
- ✓ Sequential invoice number
- ✓ Invoice date
- ✓ Date of supply (if different from invoice date)
- ✓ Description of goods/services
- ✓ Quantity
- ✓ Net amount per line
- ✓ Applicable VAT rate per line
- ✓ VAT amount per line
- ✓ Total net amount
- ✓ Total VAT amount
- ✓ Total gross amount
- ✓ Currency (ISO 4217)

### Usage

```typescript
import { generatePDFInvoice } from '@oss-vat/oss-calculator';

const invoice = {
  invoiceNumber: 'INV-2024-001',
  invoiceDate: new Date('2024-01-15'),
  supplyDate: new Date('2024-01-10'), // optional

  seller: {
    name: 'TechCorp Bulgaria',
    address: 'ul. Aleksandar Batenberg 57',
    city: 'Sofia',
    postalCode: '1000',
    country: 'Bulgaria',
    vatNumber: 'BG202024680', // REQUIRED per Article 226
  },

  buyer: {
    name: 'GmbH Company',
    address: 'Hauptstraße 100',
    city: 'Berlin',
    postalCode: '10115',
    country: 'Germany',
    vatNumber: 'DE123456789', // required for B2B
  },

  lineItems: [
    {
      description: 'Web Development Services',
      quantity: 40,
      unitPrice: 50,
      netAmount: 2000,
      vatRate: 19,
      vatAmount: 380,
      grossAmount: 2380,
    },
  ],

  totalNetAmount: 2000,
  totalVATAmount: 380,
  totalGrossAmount: 2380,
  currency: 'EUR',
  paymentTerms: 'Net 30 days', // optional
  notes: 'Invoice note', // optional
};

const result = await generatePDFInvoice(invoice, {
  format: 'a4',
  fontSize: 10,
  marginMm: 15,
  // companyLogo: { dataUrl: '...', widthMm: 40, heightMm: 20 }
});

if (result.success) {
  // result.pdf is a Uint8Array containing PDF binary
  // result.filename is 'invoice-INV-2024-001.pdf'
  // result.mimeType is 'application/pdf'

  // Save to file (Node.js)
  const fs = require('fs');
  fs.writeFileSync(result.filename, Buffer.from(result.pdf));

  // Or: Download in browser
  const blob = new Blob([result.pdf], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = result.filename;
  a.click();
}
```

### Validation

The PDF generator performs comprehensive validation:

- Seller VAT number is mandatory (Article 226)
- All required fields are non-empty
- VAT rates are in valid range (0-100%)
- Line items have positive quantities
- Totals are mathematically consistent

### Error Handling

```typescript
const result = await generatePDFInvoice(invoice);
if (!result.success) {
  console.error(result.error); // "PDF generation failed"
  console.error(result.details); // Specific validation errors
}
```

---

## 2. CSV Exporter for Bulgarian NAP Portal

**File:** `csv-nap-export.ts`

Generates CSV files formatted for the Bulgarian National Revenue Agency (NAP) OSS portal, with proper column structure, decimal separators, and date formatting.

### NAP Specifications

#### Sections

- **2A:** Services supplied from Bulgaria
- **2B:** Goods supplied from Bulgaria
- **2C:** Services supplied from other Member States
- **2D:** Goods supplied from other Member States

#### Format Requirements

- **Decimal separator:** Period (`.`) per NAP spec
- **Date format:** `dd.mm.yyyy`
- **Encoding:** UTF-8
- **Column structure:** `section`, `member_state`, `vat_rate`, `taxable_amount`, `vat_amount`

### Usage

```typescript
import { generateNAPExportCSV, aggregateToNAPRows } from '@oss-vat/oss-calculator';

// Aggregate line items into NAP rows
const napRows = aggregateToNAPRows([
  {
    description: 'Service to Germany',
    netAmount: 1500,
    vatRate: 19,
    vatAmount: 285,
    section: '2A',
    memberState: 'DE',
  },
  {
    description: 'Service to Germany (continued)',
    netAmount: 800,
    vatRate: 19,
    vatAmount: 152,
    section: '2A',
    memberState: 'DE',
  },
  {
    description: 'Service to France',
    netAmount: 1000,
    vatRate: 20,
    vatAmount: 200,
    section: '2A',
    memberState: 'FR',
  },
]);

// napRows will aggregate by section+memberState:
// [
//   { section: '2A', memberState: 'DE', vatRate: 19, taxableAmount: 2300, vatAmount: 437 },
//   { section: '2A', memberState: 'FR', vatRate: 20, taxableAmount: 1000, vatAmount: 200 },
// ]

const document = {
  rows: napRows,
  reportPeriod: {
    year: 2024,
    quarter: 1,
  },
  submittingEntity: {
    bulgarianVATNumber: 'BG202024680',
    companyName: 'TechCorp Bulgaria EOOD',
  },
  generatedAt: new Date(),
  totalNetAmount: 3300,
  totalVATAmount: 637,
};

const result = generateNAPExportCSV(document, {
  delimiter: ',',
  decimalSeparator: '.', // NAP spec
  dateFormat: 'dd.mm.yyyy', // NAP spec
  includeHeader: true,
});

if (result.success) {
  // result.csv contains the CSV text
  // result.filename is 'NAP-OSS-Q1-2024.csv'
  console.log(result.csv);
  // section,member_state,vat_rate,taxable_amount,vat_amount
  // 2A,DE,19.00,2300.00,437.00
  // 2A,FR,20.00,1000.00,200.00
}
```

### Aggregation Helper

`aggregateToNAPRows()` automatically:

- Groups items by section and member state
- Sums taxable amounts and VAT amounts
- Validates VAT rate consistency per group

### Validation

The CSV exporter validates:

- Report period: quarter is 1-4, year is ≥2015
- Member state codes: 2-letter ISO 3166-1 alpha-2
- Section codes: Must be 2A, 2B, 2C, or 2D
- VAT rates: 0-100%
- VAT calculations: Allows small rounding errors (≤0.01)
- Document totals: Match sum of rows (with tolerance)

### Date Formatting

```typescript
import { formatNAPDate } from '@oss-vat/oss-calculator';

formatNAPDate(new Date('2024-03-15')); // '15.03.2024'
formatNAPDate(new Date('2024-03-15'), 'yyyy-mm-dd'); // '2024-03-15'
```

---

## 3. EN 16931 / UBL 2.1 Adapter

**File:** `en16931-adapter.ts`

Provides a forward-compatibility skeleton for EU ViDA (VAT in the Digital Age) compliance, with implementation deadline 2035.

### Current Implementation

The adapter generates basic UBL 2.1 XML with:

- ✓ Proper XML structure and namespaces
- ✓ EN 16931 semantic data model
- ✓ Mandatory invoice elements
- ✓ Party information (seller/buyer)
- ✓ Line items with tax details
- ✓ VAT calculations and totals
- ✓ PEPPOL compliance profile

### Future Capabilities (Deferred to 2035)

Not yet implemented but placeholders for:

- Electronic signature support (XAdES)
- Time-stamping service integration
- Audit trail for ViDA compliance
- Advanced certifications

### Usage

```typescript
import { generateUBLInvoice, convertToUBL } from '@oss-vat/oss-calculator';

// Option 1: Generate directly from UBL type
const ubl = {
  customizationID: 'urn:cen.eu:en16931:2017#compliance#T0',
  profileID: 'urn:fdc:peppol.eu:2017:poacc:billing:01:1.0',
  id: 'INV-2024-001',
  issueDate: new Date('2024-01-15'),
  documentCurrencyCode: 'EUR',
  seller: {
    name: 'TechCorp Bulgaria',
    address: 'ul. Aleksandar Batenberg 57',
    city: 'Sofia',
    postalCode: '1000',
    country: 'Bulgaria',
    vatNumber: 'BG202024680',
  },
  buyer: {
    name: 'GmbH Company',
    address: 'Hauptstraße 100',
    city: 'Berlin',
    postalCode: '10115',
    country: 'Germany',
    vatNumber: 'DE123456789',
  },
  lineItems: [
    {
      description: 'Web Development Services',
      quantity: 40,
      unitPrice: 50,
      netAmount: 2000,
      vatRate: 19,
      vatAmount: 380,
      grossAmount: 2380,
    },
  ],
  totalNetAmount: 2000,
  totalVATAmount: 380,
  totalGrossAmount: 2380,
};

const result = generateUBLInvoice(ubl);

// Option 2: Convert from standard Invoice type
const invoice = {
  /* Invoice type */
};
const ublAdapted = convertToUBL(invoice);
const resultConverted = generateUBLInvoice(ublAdapted);

if (result.success) {
  // result.xml contains UBL 2.1 XML text
  // result.filename is 'invoice-INV-2024-001.xml'
  console.log(result.xml);

  // Save XML
  const fs = require('fs');
  fs.writeFileSync(result.filename, result.xml, 'utf-8');
}
```

### XML Structure

Generated XML includes:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2" ...>
  <cbc:UBLVersionID>2.1</cbc:UBLVersionID>
  <cbc:CustomizationID>urn:cen.eu:en16931:2017#compliance#T0</cbc:CustomizationID>
  <cbc:ProfileID>urn:fdc:peppol.eu:2017:poacc:billing:01:1.0</cbc:ProfileID>
  <cbc:ID>INV-2024-001</cbc:ID>
  <cbc:IssueDate>2024-01-15</cbc:IssueDate>
  <!-- Party info -->
  <!-- Line items -->
  <!-- Tax totals -->
  <!-- Monetary totals -->
</Invoice>
```

### Validation

The UBL adapter validates:

- Invoice ID is present
- Issue date is provided
- Currency code is valid ISO 4217
- Customization ID is present
- Profile ID is present
- At least one line item exists

---

## Type System

All generators use comprehensive TypeScript types:

```typescript
// Core invoice type
interface Invoice {
  invoiceNumber: string;
  invoiceDate: Date;
  supplyDate?: Date;
  seller: Party;
  buyer: Party;
  lineItems: VATLineItem[];
  totalNetAmount: number;
  totalVATAmount: number;
  totalGrossAmount: number;
  currency: string;
  paymentTerms?: string;
  notes?: string;
  referenceNumber?: string;
}

// VAT line item
interface VATLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  netAmount: number;
  vatRate: number;
  vatAmount: number;
  grossAmount: number;
}

// Party (buyer/seller)
interface Party {
  name: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
  vatNumber?: string;
  email?: string;
  phone?: string;
}
```

### Success and Error Results

All generators return discriminated union types:

```typescript
// Success
interface PDFGenerationResult {
  success: true;
  pdf: Uint8Array;
  filename: string;
  mimeType: 'application/pdf';
  generatedAt: Date;
}

// Error
interface GenerationError {
  success: false;
  error: string;
  details?: string;
}
```

---

## Testing

All three generators are covered by comprehensive vitest test suites:

### PDF Invoice Tests (`pdf-invoice.test.ts`)

- Validates Article 226 compliance
- Tests all mandatory fields
- Checks VAT calculations
- Handles multiple currencies
- Tests error cases

### CSV NAP Tests (`csv-nap-export.test.ts`)

- Validates NAP format requirements
- Tests aggregation logic
- Checks decimal separator handling
- Validates section and MS codes
- Tests rounding tolerance

### UBL Adapter Tests (`en16931-adapter.test.ts`)

- Validates XML structure
- Checks PEPPOL compliance
- Tests XML special character escaping
- Validates party information
- Tests currency handling

### Running Tests

```bash
cd packages/oss-calculator
npm test

# Or from root
npm run test
```

---

## Design Decisions

### 1. PDF Generation

- Uses `jspdf` library (2.5 KB, widely adopted)
- Works in Node.js and browser
- No external dependencies for content generation
- Template-based to allow customization

### 2. CSV Export

- Pure TypeScript, no external dependencies
- NAP portal alignment (Bulgarian specification)
- Supports multiple delimiters and decimal formats
- Aggregation helper for multi-line consolidation

### 3. EN 16931 Adapter

- Template string-based XML generation
- No heavy XML library required
- Forward-compatible skeleton design
- Ready for ViDA requirements (2035)

### 4. Type Safety

- Full TypeScript with strict mode enabled
- Discriminated union types for results
- Comprehensive validation before generation
- Detailed error messages for debugging

---

## Academic Context

This Layer 3 implementation is part of the **Design Science Research (DSR) artefact** for Springer academic publication, authored by Marieta Marinova (PhD Accounting, Sofia University).

**Design Principle 5:** Portal-aligned output with forward compatibility ensures that VAT calculation results can be efficiently exported to:

- Tax authorities (Bulgarian NAP portal)
- Invoicing systems (PDF, ISO-compliant)
- Digital governance frameworks (UBL/ViDA ready)

The implementation balances **immediate compliance** (Article 226, NAP requirements) with **future extensibility** (ViDA 2035).

---

## References

- **Directive 2006/112/EC** — VAT Directive (Article 226 - Invoice Requirements)
- **EN 16931-1:2017** — Semantic data model for invoicing
- **UBL 2.1** — Universal Business Language (OASIS standard)
- **PEPPOL** — Pan-European Public Procurement Online (invoicing profiles)
- **EU ViDA Directive 2024** — VAT in the Digital Age (implementation 2035)

---

## License

MIT License. See root LICENSE file.

**Author:** Marieta Marinova
