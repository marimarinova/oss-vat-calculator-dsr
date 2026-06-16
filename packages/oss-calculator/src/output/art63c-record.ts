/**
 * Art. 63c OSS Record Export
 *
 * Implements the legally-required 10-year transactional record mandated by
 * Article 63c of Council Implementing Regulation (EU) 282/2011 (as amended
 * by Regulation (EU) 2017/2459 and subsequent OSS package amendments).
 *
 * Each record maps one transaction to the 12 enumerated data elements in
 * Art. 63c(1)(a)–(l). Data elements that the current transaction schema does
 * NOT capture are set to the literal sentinel 'NOT_CAPTURED' together with
 * an inline TODO noting which schema field would satisfy the requirement.
 * No data is fabricated.
 *
 * 10-year retention rule (Art. 63c(2)):
 *   Records must be retained until 31 December of the 10th year following
 *   the calendar year of the supply. The `retentionUntil` metadata field
 *   reflects this: `${supplyYear + 10}-12-31`.
 *
 * Electronic availability rule (Art. 63c(2)):
 *   Records must be electronically available on request to the Member States
 *   of consumption and identification. The `scheme = 'UNION_OSS'` metadata
 *   field identifies the applicable VAT scheme.
 */

// ---------------------------------------------------------------------------
// Sentinel for missing schema fields
// ---------------------------------------------------------------------------

export const NOT_CAPTURED = 'NOT_CAPTURED' as const;
export type NotCaptured = typeof NOT_CAPTURED;

// ---------------------------------------------------------------------------
// Input types
// Defined here to avoid cross-package imports; structurally compatible with
// StorageTransaction / StorageCorrection in packages/web-app/src/services/storage.ts.
// ---------------------------------------------------------------------------

/** A single payment received for a transaction (Art. 63c(1)(h) and (i)). */
export interface Art63cPayment {
  id: string;
  date: string; // ISO date YYYY-MM-DD
  amount: number; // in cents
  currency: string; // ISO 4217
  isAdvance: boolean; // true = received before the supply (Art. 63c(1)(i))
}

/** One piece of customer-location evidence (Art. 63c(1)(k) / Art. 63c(2)). */
export interface Art63cLocationEvidenceItem {
  evidenceType: string; // e.g. 'billing-country', 'ip-country', 'bank-country'
  value: string; // e.g. 'DE', '192.0.2.1'
}

/** A return of goods entry (Art. 63c(1)(l) / Art. 63c(3)). */
export interface Art63cReturn {
  id: string;
  date: string; // ISO date YYYY-MM-DD
  returnedAmount: number; // taxable amount returned, in cents
  vatRate: number; // VAT rate that applied, as a percentage
}

/**
 * Minimal transaction shape required to build an Art. 63c record.
 * Structurally compatible with `StorageTransaction` (amount in cents).
 */
export interface Art63cInputTransaction {
  id: string;
  date: string; // ISO date YYYY-MM-DD
  buyerCountry: string; // 2-letter ISO 3166-1 alpha-2
  amount: number; // in cents (divided by 100 to get the EUR display amount)
  currency: string; // ISO 4217
  description: string;
  productType: 'goods' | 'services';
  quantity: number; // number of units supplied (Art. 63c(1)(b)); default 1
  invoiceNumber?: string; // optional invoice reference (Art. 63c(1)(j))
  vatRate?: number; // as a percentage (e.g. 19 for 19%)
  payments?: Art63cPayment[]; // payments received (Art. 63c(1)(h) and (i))
  locationEvidence?: Art63cLocationEvidenceItem[]; // 1-2 items (Art. 63c(1)(k))
  returns?: Art63cReturn[]; // returns of goods (Art. 63c(1)(l))
}

/**
 * Minimal correction shape required to satisfy Art. 63c(1)(e).
 * Structurally compatible with `StorageCorrection`.
 */
export interface Art63cInputCorrection {
  id: string;
  originalTransactionId: string;
  reasonCode: string;
  createdAt: number; // ms since epoch
  adjustedAmount: number; // corrected taxable amount in cents (Art. 63c(1)(e))
}

// ---------------------------------------------------------------------------
// Art. 63c record (one per transaction)
// Fields follow the Art. 63c(1)(a)–(l) order exactly.
// ---------------------------------------------------------------------------

/**
 * A single Art. 63c OSS record entry.
 *
 * All 12 statutory data elements are now populated when the corresponding
 * data is present (Refactor 7c). Empty lists produce 'none', not NOT_CAPTURED.
 * The only remaining NOT_CAPTURED scenarios are:
 *   - Field 5 (taxableAmountAdjustment): no corrections linked to this transaction
 *   - Field 6 (vatRateApplied): vatRate absent from the transaction
 *   - Field 7 (vatAmountPayable): vatRate absent (same condition)
 */
export interface Art63cRecord {
  /** Internal transaction reference (not a statutory Art. 63c field) */
  transactionId: string;

  // Art. 63c(1)(a): Member State of consumption
  memberStateOfConsumption: string;

  // Art. 63c(1)(b): Type of service or description and quantity of goods
  supplyDescription: string; // description + productType
  supplyQuantity: number; // number of units supplied

  // Art. 63c(1)(c): Date of the supply
  dateOfSupply: string; // ISO date YYYY-MM-DD

  // Art. 63c(1)(d): Taxable amount + currency
  taxableAmountEUR: number; // amount / 100 (cents → EUR)
  taxableAmountCurrency: string; // ISO 4217

  // Art. 63c(1)(e): Any subsequent increase or reduction of the taxable amount
  taxableAmountAdjustment: string; // NOT_CAPTURED or 'CORRECTION(adjustedAmount:X EUR; ...)'

  // Art. 63c(1)(f): VAT rate applied
  vatRateApplied: number | NotCaptured;

  // Art. 63c(1)(g): Amount of VAT payable + currency
  vatAmountPayable: number | NotCaptured;
  vatAmountCurrency: string;

  // Art. 63c(1)(h): Date and amount of payments received
  // 'none' when no payments have been recorded; serialised list otherwise.
  paymentInformation: string;

  // Art. 63c(1)(i): Any payments on account received before the supply
  // 'none' when no advance payments; serialised list otherwise.
  advancePaymentInfo: string;

  // Art. 63c(1)(j): Invoice information (where an invoice was issued)
  invoiceInformation: string | NotCaptured;

  // Art. 63c(1)(k): Information used to determine the place of the customer
  // 'none' when no evidence recorded; '; '-joined list otherwise.
  customerLocationEvidence: string;

  // Art. 63c(1)(l): Proof of any returns of goods (taxable amount + VAT rate)
  // 'none' when no returns; serialised list otherwise.
  returnInformation: string;
}

// ---------------------------------------------------------------------------
// Document metadata
// ---------------------------------------------------------------------------

/**
 * Metadata header for the Art. 63c export document.
 * Reflects the 10-year retention and electronic-availability requirements
 * of Art. 63c(2) IR 282/2011.
 */
export interface Art63cMetadata {
  scheme: 'UNION_OSS';
  regulation: 'Council Implementing Regulation (EU) 282/2011, Article 63c';
  /** ISO date YYYY-12-31: 10 years after end of the supply year (Art. 63c(2)) */
  retentionUntil: string;
  /** ISO datetime of export generation */
  generatedAt: string;
  /** Calendar year covered by this document */
  periodYear: number;
  sellerInfo?: {
    name?: string;
    vatId?: string;
    country?: string;
  };
}

/** Full Art. 63c export document: metadata header + per-transaction records */
export interface Art63cDocument {
  metadata: Art63cMetadata;
  records: Art63cRecord[];
}

// ---------------------------------------------------------------------------
// CSV column manifest (ordered exactly per Art. 63c(1)(a)–(l))
// ---------------------------------------------------------------------------

interface CsvColumn {
  key: keyof Art63cRecord;
  header: string;
}

const CSV_COLUMNS: ReadonlyArray<CsvColumn> = [
  { key: 'transactionId', header: 'transaction_id' },
  { key: 'memberStateOfConsumption', header: 'art63c_1a_member_state_of_consumption' },
  { key: 'supplyDescription', header: 'art63c_1b_supply_description' },
  { key: 'supplyQuantity', header: 'art63c_1b_supply_quantity' },
  { key: 'dateOfSupply', header: 'art63c_1c_date_of_supply' },
  { key: 'taxableAmountEUR', header: 'art63c_1d_taxable_amount' },
  { key: 'taxableAmountCurrency', header: 'art63c_1d_taxable_amount_currency' },
  { key: 'taxableAmountAdjustment', header: 'art63c_1e_taxable_amount_adjustment' },
  { key: 'vatRateApplied', header: 'art63c_1f_vat_rate_applied' },
  { key: 'vatAmountPayable', header: 'art63c_1g_vat_amount_payable' },
  { key: 'vatAmountCurrency', header: 'art63c_1g_vat_amount_currency' },
  { key: 'paymentInformation', header: 'art63c_1h_payment_information' },
  { key: 'advancePaymentInfo', header: 'art63c_1i_advance_payment_info' },
  { key: 'invoiceInformation', header: 'art63c_1j_invoice_information' },
  { key: 'customerLocationEvidence', header: 'art63c_1k_customer_location_evidence' },
  { key: 'returnInformation', header: 'art63c_1l_return_information' },
] as const;

// Export for tests
export const ART63C_CSV_HEADERS: ReadonlyArray<string> = CSV_COLUMNS.map((c) => c.header);

// ---------------------------------------------------------------------------
// Core functions
// ---------------------------------------------------------------------------

/**
 * Computes the Art. 63c(2) retention deadline for a given supply year.
 * Returns ISO date YYYY-12-31 where YYYY = supplyYear + 10.
 *
 * Example: supply year 2024 → retentionUntil '2034-12-31'
 */
export function retentionUntil(supplyYear: number): string {
  return `${supplyYear + 10}-12-31`;
}

/**
 * Builds a single Art. 63c record for one transaction.
 *
 * @param tx - The transaction to record (may include payments, locationEvidence, returns)
 * @param corrections - All corrections for this user/period; linked entries are
 *   referenced in field 5 (taxableAmountAdjustment). Pass [] if corrections are
 *   not available in the current context.
 */
export function buildArt63cRecord(
  tx: Art63cInputTransaction,
  corrections: Art63cInputCorrection[],
): Art63cRecord {
  const taxableAmountEUR = tx.amount / 100;

  // Field 5: link any corrections that reference this transaction.
  const linkedCorrections = corrections.filter((c) => c.originalTransactionId === tx.id);
  const taxableAmountAdjustment: string =
    linkedCorrections.length === 0
      ? NOT_CAPTURED
      : linkedCorrections
          .map((c) => {
            const adjustedEUR = c.adjustedAmount / 100;
            return `CORRECTION(adjustedAmount:${adjustedEUR} ${tx.currency}; reasonCode:${c.reasonCode}; corrId:${c.id})`;
          })
          .join('; ');

  // Fields 6 & 7: VAT
  const vatRateApplied: number | NotCaptured = tx.vatRate !== undefined ? tx.vatRate : NOT_CAPTURED;
  const vatAmountPayable: number | NotCaptured =
    tx.vatRate !== undefined
      ? Math.round(((taxableAmountEUR * tx.vatRate) / 100) * 100) / 100
      : NOT_CAPTURED;

  // Field 8 (Art. 63c(1)(h)): payments received — date and amount
  const payments = tx.payments ?? [];
  const paymentInformation =
    payments.length === 0
      ? 'none'
      : payments
          .map((p) => `PAYMENT(date:${p.date}; amount:${p.amount / 100} ${p.currency})`)
          .join('; ');

  // Field 9 (Art. 63c(1)(i)): advance payments (isAdvance = true)
  const advances = payments.filter((p) => p.isAdvance);
  const advancePaymentInfo =
    advances.length === 0
      ? 'none'
      : advances
          .map((a) => `ADVANCE(date:${a.date}; amount:${a.amount / 100} ${a.currency})`)
          .join('; ');

  // Field 11 (Art. 63c(1)(k)): customer location evidence
  const evidence = tx.locationEvidence ?? [];
  const customerLocationEvidence =
    evidence.length === 0 ? 'none' : evidence.map((e) => `${e.evidenceType}:${e.value}`).join('; ');

  // Field 12 (Art. 63c(1)(l)): returns of goods
  const returns = tx.returns ?? [];
  const returnInformation =
    returns.length === 0
      ? 'none'
      : returns
          .map(
            (r) =>
              `RETURN(date:${r.date}; returnedAmount:${r.returnedAmount / 100} ${tx.currency}; vatRate:${r.vatRate}%)`,
          )
          .join('; ');

  return {
    transactionId: tx.id,
    // Field 1
    memberStateOfConsumption: tx.buyerCountry,
    // Field 2
    supplyDescription: `${tx.description} [${tx.productType}]`,
    supplyQuantity: tx.quantity,
    // Field 3
    dateOfSupply: tx.date,
    // Field 4
    taxableAmountEUR,
    taxableAmountCurrency: tx.currency,
    // Field 5
    taxableAmountAdjustment,
    // Field 6
    vatRateApplied,
    // Field 7
    vatAmountPayable,
    vatAmountCurrency: tx.currency,
    // Field 8
    paymentInformation,
    // Field 9
    advancePaymentInfo,
    // Field 10
    invoiceInformation: tx.invoiceNumber ?? NOT_CAPTURED,
    // Field 11
    customerLocationEvidence,
    // Field 12
    returnInformation,
  };
}

/**
 * Builds the full Art. 63c document for a given calendar year.
 * Filters `transactions` to the requested `periodYear` and attaches metadata
 * with the correct `retentionUntil` date and `scheme = 'UNION_OSS'`.
 *
 * @param transactions - All transactions for the user (unfiltered); may include
 *   payments, locationEvidence, and returns if they have been loaded and attached.
 * @param corrections - All corrections for the user (used for field 5)
 * @param periodYear - Calendar year to export (e.g. 2024)
 * @param sellerInfo - Optional seller identification for the metadata header
 */
export function buildArt63cDocument(
  transactions: Art63cInputTransaction[],
  corrections: Art63cInputCorrection[],
  periodYear: number,
  sellerInfo?: Art63cMetadata['sellerInfo'],
): Art63cDocument {
  const yearTransactions = transactions.filter((tx) => {
    const year = new Date(tx.date).getFullYear();
    return year === periodYear;
  });

  const records = yearTransactions.map((tx) => buildArt63cRecord(tx, corrections));

  const metadata: Art63cMetadata = {
    scheme: 'UNION_OSS',
    regulation: 'Council Implementing Regulation (EU) 282/2011, Article 63c',
    retentionUntil: retentionUntil(periodYear),
    generatedAt: new Date().toISOString(),
    periodYear,
    ...(sellerInfo !== undefined ? { sellerInfo } : {}),
  };

  return { metadata, records };
}

// ---------------------------------------------------------------------------
// Export formats
// ---------------------------------------------------------------------------

/** Result of a CSV export */
export interface Art63cCSVResult {
  csv: string;
  filename: string;
  rowCount: number;
}

/** Result of a JSON export */
export interface Art63cJSONResult {
  json: string;
  filename: string;
  recordCount: number;
}

function csvEscapeField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Exports an Art. 63c document as CSV.
 *
 * Column order follows Art. 63c(1)(a)–(l) exactly (see `CSV_COLUMNS`).
 * Each row is one transaction. The first row is the header.
 * NOT_CAPTURED values are written as the literal string 'NOT_CAPTURED'.
 */
export function exportArt63cCSV(doc: Art63cDocument): Art63cCSVResult {
  const delimiter = ',';
  const lines: string[] = [];

  // Metadata comment rows (prefixed with #, ignored by most CSV parsers)
  lines.push(`# OSS Art. 63c Record`);
  lines.push(`# scheme: ${doc.metadata.scheme}`);
  lines.push(`# regulation: ${doc.metadata.regulation}`);
  lines.push(`# periodYear: ${doc.metadata.periodYear}`);
  lines.push(`# retentionUntil: ${doc.metadata.retentionUntil}`);
  lines.push(`# generatedAt: ${doc.metadata.generatedAt}`);
  if (doc.metadata.sellerInfo?.name) {
    lines.push(`# seller: ${doc.metadata.sellerInfo.name}`);
  }
  if (doc.metadata.sellerInfo?.vatId) {
    lines.push(`# sellerVatId: ${doc.metadata.sellerInfo.vatId}`);
  }

  // Header row
  lines.push(CSV_COLUMNS.map((c) => c.header).join(delimiter));

  // Data rows
  for (const record of doc.records) {
    const cells = CSV_COLUMNS.map((col) => {
      const raw = record[col.key];
      return csvEscapeField(String(raw));
    });
    lines.push(cells.join(delimiter));
  }

  const csv = lines.join('\n');
  return {
    csv,
    filename: `art63c-oss-record-${doc.metadata.periodYear}.csv`,
    rowCount: doc.records.length,
  };
}

/**
 * Exports an Art. 63c document as JSON.
 *
 * The output is a self-contained JSON object with a `metadata` block
 * (scheme, retentionUntil, etc.) and a `records` array.
 */
export function exportArt63cJSON(doc: Art63cDocument): Art63cJSONResult {
  const json = JSON.stringify(doc, null, 2);
  return {
    json,
    filename: `art63c-oss-record-${doc.metadata.periodYear}.json`,
    recordCount: doc.records.length,
  };
}
