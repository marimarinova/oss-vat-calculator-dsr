import { describe, it, expect } from 'vitest';
import {
  NOT_CAPTURED,
  ART63C_CSV_HEADERS,
  retentionUntil,
  buildArt63cRecord,
  buildArt63cDocument,
  exportArt63cCSV,
  exportArt63cJSON,
  type Art63cInputTransaction,
  type Art63cInputCorrection,
} from './art63c-record';

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const TX_SERVICE: Art63cInputTransaction = {
  id: 'tx-001',
  date: '2024-03-15',
  buyerCountry: 'DE',
  amount: 10000, // 100.00 EUR in cents
  currency: 'EUR',
  description: 'SaaS subscription',
  productType: 'services',
  vatRate: 19,
};

const TX_GOODS_NO_RATE: Art63cInputTransaction = {
  id: 'tx-002',
  date: '2024-06-01',
  buyerCountry: 'FR',
  amount: 5000, // 50.00 EUR in cents
  currency: 'EUR',
  description: 'Printed book',
  productType: 'goods',
  // vatRate intentionally absent
};

const TX_2023: Art63cInputTransaction = {
  id: 'tx-003',
  date: '2023-11-20',
  buyerCountry: 'IT',
  amount: 20000,
  currency: 'EUR',
  description: 'Consulting',
  productType: 'services',
  vatRate: 22,
};

const CORRECTION: Art63cInputCorrection = {
  id: 'corr-001',
  originalTransactionId: 'tx-001',
  reasonCode: 'PRICE-CHANGE',
  createdAt: 1710000000000,
};

// ---------------------------------------------------------------------------
// 1. Column manifest: all 19 columns present and in Art. 63c(1)(a)–(l) order
// ---------------------------------------------------------------------------

describe('ART63C_CSV_HEADERS', () => {
  it('contains exactly 19 columns', () => {
    expect(ART63C_CSV_HEADERS).toHaveLength(19);
  });

  it('starts with the internal transaction_id column', () => {
    expect(ART63C_CSV_HEADERS[0]).toBe('transaction_id');
  });

  it('follows Art. 63c(1)(a)–(l) order: a→b→b→c→d→d→e→f→g→g→h→h→i→j→k→l→l→l', () => {
    const expected = [
      'transaction_id',
      'art63c_1a_member_state_of_consumption',
      'art63c_1b_supply_description',
      'art63c_1b_supply_quantity',
      'art63c_1c_date_of_supply',
      'art63c_1d_taxable_amount',
      'art63c_1d_taxable_amount_currency',
      'art63c_1e_taxable_amount_adjustment',
      'art63c_1f_vat_rate_applied',
      'art63c_1g_vat_amount_payable',
      'art63c_1g_vat_amount_currency',
      'art63c_1h_payment_date',
      'art63c_1h_payment_amount',
      'art63c_1i_advance_payment_info',
      'art63c_1j_invoice_information',
      'art63c_1k_customer_location_evidence',
      'art63c_1l_return_proof',
      'art63c_1l_return_taxable_amount',
      'art63c_1l_return_vat_rate',
    ];
    expect(Array.from(ART63C_CSV_HEADERS)).toEqual(expected);
  });
});

// ---------------------------------------------------------------------------
// 2. retentionUntil: (supplyYear + 10)-12-31
// ---------------------------------------------------------------------------

describe('retentionUntil()', () => {
  it('2024 supply year → 2034-12-31', () => {
    expect(retentionUntil(2024)).toBe('2034-12-31');
  });

  it('2020 supply year → 2030-12-31', () => {
    expect(retentionUntil(2020)).toBe('2030-12-31');
  });

  it('2023 supply year → 2033-12-31', () => {
    expect(retentionUntil(2023)).toBe('2033-12-31');
  });
});

// ---------------------------------------------------------------------------
// 3. buildArt63cRecord: field population and NOT_CAPTURED flags
// ---------------------------------------------------------------------------

describe('buildArt63cRecord()', () => {
  describe('fully populated fields (transaction with vatRate)', () => {
    const record = buildArt63cRecord(TX_SERVICE, []);

    it('Field 1: memberStateOfConsumption = buyerCountry', () => {
      expect(record.memberStateOfConsumption).toBe('DE');
    });

    it('Field 2a: supplyDescription includes description and productType', () => {
      expect(record.supplyDescription).toContain('SaaS subscription');
      expect(record.supplyDescription).toContain('services');
    });

    it('Field 2b: supplyQuantity = NOT_CAPTURED', () => {
      expect(record.supplyQuantity).toBe(NOT_CAPTURED);
    });

    it('Field 3: dateOfSupply = ISO date string', () => {
      expect(record.dateOfSupply).toBe('2024-03-15');
    });

    it('Field 4: taxableAmountEUR = amount / 100', () => {
      expect(record.taxableAmountEUR).toBe(100);
    });

    it('Field 4: taxableAmountCurrency = EUR', () => {
      expect(record.taxableAmountCurrency).toBe('EUR');
    });

    it('Field 5: taxableAmountAdjustment = NOT_CAPTURED when no corrections', () => {
      expect(record.taxableAmountAdjustment).toBe(NOT_CAPTURED);
    });

    it('Field 6: vatRateApplied = 19 (from vatRate)', () => {
      expect(record.vatRateApplied).toBe(19);
    });

    it('Field 7: vatAmountPayable = taxableAmount * vatRate / 100', () => {
      // 100 EUR * 19% = 19.00 EUR
      expect(record.vatAmountPayable).toBe(19);
    });

    it('Field 7: vatAmountCurrency = EUR', () => {
      expect(record.vatAmountCurrency).toBe('EUR');
    });
  });

  describe('NOT_CAPTURED fields (schema gaps)', () => {
    const record = buildArt63cRecord(TX_SERVICE, []);

    it('Field 8 (paymentDate) = NOT_CAPTURED', () => {
      expect(record.paymentDate).toBe(NOT_CAPTURED);
    });

    it('Field 8 (paymentAmount) = NOT_CAPTURED', () => {
      expect(record.paymentAmount).toBe(NOT_CAPTURED);
    });

    it('Field 9 (advancePaymentInfo) = NOT_CAPTURED', () => {
      expect(record.advancePaymentInfo).toBe(NOT_CAPTURED);
    });

    it('Field 10 (invoiceInformation) = NOT_CAPTURED', () => {
      expect(record.invoiceInformation).toBe(NOT_CAPTURED);
    });

    it('Field 11 (customerLocationEvidence) = NOT_CAPTURED', () => {
      expect(record.customerLocationEvidence).toBe(NOT_CAPTURED);
    });

    it('Field 12 (returnProof) = NOT_CAPTURED', () => {
      expect(record.returnProof).toBe(NOT_CAPTURED);
    });

    it('Field 12 (returnTaxableAmount) = NOT_CAPTURED', () => {
      expect(record.returnTaxableAmount).toBe(NOT_CAPTURED);
    });

    it('Field 12 (returnVatRate) = NOT_CAPTURED', () => {
      expect(record.returnVatRate).toBe(NOT_CAPTURED);
    });
  });

  describe('partially captured fields (no vatRate)', () => {
    const record = buildArt63cRecord(TX_GOODS_NO_RATE, []);

    it('Field 6: vatRateApplied = NOT_CAPTURED when vatRate absent', () => {
      expect(record.vatRateApplied).toBe(NOT_CAPTURED);
    });

    it('Field 7: vatAmountPayable = NOT_CAPTURED when vatRate absent', () => {
      expect(record.vatAmountPayable).toBe(NOT_CAPTURED);
    });

    it('Field 4: taxableAmountEUR still computed (50.00 EUR)', () => {
      expect(record.taxableAmountEUR).toBe(50);
    });
  });

  describe('Field 5: correction linking', () => {
    it('references correction id and reasonCode when linked', () => {
      const record = buildArt63cRecord(TX_SERVICE, [CORRECTION]);
      expect(record.taxableAmountAdjustment).toContain('CORRECTION_REFERENCED');
      expect(record.taxableAmountAdjustment).toContain('PRICE-CHANGE');
      expect(record.taxableAmountAdjustment).toContain('corr-001');
      expect(record.taxableAmountAdjustment).toContain('NOT_CAPTURED');
    });

    it('does not link corrections for a different transaction', () => {
      const record = buildArt63cRecord(TX_GOODS_NO_RATE, [CORRECTION]);
      expect(record.taxableAmountAdjustment).toBe(NOT_CAPTURED);
    });
  });

  describe('VAT amount rounding', () => {
    it('rounds to 2 decimal places (cents precision)', () => {
      const tx: Art63cInputTransaction = {
        id: 'tx-rnd',
        date: '2024-01-01',
        buyerCountry: 'BG',
        amount: 333, // 3.33 EUR
        currency: 'EUR',
        description: 'Test',
        productType: 'services',
        vatRate: 20, // 3.33 * 20% = 0.666 → rounds to 0.67
      };
      const record = buildArt63cRecord(tx, []);
      expect(record.vatAmountPayable).toBe(0.67);
    });
  });
});

// ---------------------------------------------------------------------------
// 4. buildArt63cDocument: year filtering and metadata
// ---------------------------------------------------------------------------

describe('buildArt63cDocument()', () => {
  const allTransactions = [TX_SERVICE, TX_GOODS_NO_RATE, TX_2023];

  it('filters to the specified year only', () => {
    const doc = buildArt63cDocument(allTransactions, [], 2024);
    expect(doc.records).toHaveLength(2);
    expect(doc.records.map((r) => r.transactionId)).toEqual(['tx-001', 'tx-002']);
  });

  it('returns empty records when year has no transactions', () => {
    const doc = buildArt63cDocument(allTransactions, [], 2022);
    expect(doc.records).toHaveLength(0);
  });

  it('metadata.scheme = UNION_OSS', () => {
    const doc = buildArt63cDocument(allTransactions, [], 2024);
    expect(doc.metadata.scheme).toBe('UNION_OSS');
  });

  it('metadata.retentionUntil = 2034-12-31 for periodYear 2024', () => {
    const doc = buildArt63cDocument(allTransactions, [], 2024);
    expect(doc.metadata.retentionUntil).toBe('2034-12-31');
  });

  it('metadata.periodYear = requested year', () => {
    const doc = buildArt63cDocument(allTransactions, [], 2024);
    expect(doc.metadata.periodYear).toBe(2024);
  });

  it('metadata.regulation references Art. 63c', () => {
    const doc = buildArt63cDocument(allTransactions, [], 2024);
    expect(doc.metadata.regulation).toContain('282/2011');
    expect(doc.metadata.regulation).toContain('63c');
  });

  it('passes sellerInfo into metadata when provided', () => {
    const doc = buildArt63cDocument(allTransactions, [], 2024, {
      name: 'Test Seller OOD',
      vatId: 'BG123456789',
      country: 'BG',
    });
    expect(doc.metadata.sellerInfo?.name).toBe('Test Seller OOD');
    expect(doc.metadata.sellerInfo?.vatId).toBe('BG123456789');
  });

  it('metadata.generatedAt is an ISO datetime string', () => {
    const doc = buildArt63cDocument(allTransactions, [], 2024);
    expect(() => new Date(doc.metadata.generatedAt)).not.toThrow();
    expect(doc.metadata.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});

// ---------------------------------------------------------------------------
// 5. exportArt63cCSV: structure and column order
// ---------------------------------------------------------------------------

describe('exportArt63cCSV()', () => {
  const doc = buildArt63cDocument([TX_SERVICE, TX_GOODS_NO_RATE], [], 2024, {
    name: 'OSS Seller Ltd',
    vatId: 'BG999888777',
  });
  const result = exportArt63cCSV(doc);

  it('returns a filename for the period year', () => {
    expect(result.filename).toBe('art63c-oss-record-2024.csv');
  });

  it('rowCount matches number of records', () => {
    expect(result.rowCount).toBe(2);
  });

  it('CSV includes a header row with all 19 column names', () => {
    const lines = result.csv.split('\n').filter((l) => !l.startsWith('#'));
    const headerLine = lines[0];
    const headers = headerLine.split(',');
    expect(headers).toEqual(Array.from(ART63C_CSV_HEADERS));
  });

  it('CSV header columns are in Art. 63c(1)(a)–(l) order', () => {
    const lines = result.csv.split('\n').filter((l) => !l.startsWith('#'));
    const headers = lines[0].split(',');
    expect(headers[1]).toBe('art63c_1a_member_state_of_consumption');
    expect(headers[2]).toBe('art63c_1b_supply_description');
    expect(headers[4]).toBe('art63c_1c_date_of_supply');
    expect(headers[5]).toBe('art63c_1d_taxable_amount');
    expect(headers[8]).toBe('art63c_1f_vat_rate_applied');
    expect(headers[16]).toBe('art63c_1l_return_proof');
  });

  it('includes metadata comment rows (prefixed with #)', () => {
    const commentLines = result.csv.split('\n').filter((l) => l.startsWith('#'));
    expect(commentLines.length).toBeGreaterThan(0);
    const combined = commentLines.join('\n');
    expect(combined).toContain('UNION_OSS');
    expect(combined).toContain('2034-12-31');
  });

  it('data row contains NOT_CAPTURED for absent fields', () => {
    const lines = result.csv.split('\n').filter((l) => !l.startsWith('#'));
    const dataRow1 = lines[1]; // first data row: TX_SERVICE
    expect(dataRow1).toContain('NOT_CAPTURED');
  });

  it('data row contains populated values for known fields', () => {
    const lines = result.csv.split('\n').filter((l) => !l.startsWith('#'));
    const dataRow1 = lines[1];
    expect(dataRow1).toContain('DE'); // memberStateOfConsumption
    expect(dataRow1).toContain('2024-03-15'); // dateOfSupply
    expect(dataRow1).toContain('100'); // taxableAmountEUR
    expect(dataRow1).toContain('19'); // vatRateApplied
  });

  it('escapes commas in description field with double-quotes', () => {
    const tx: Art63cInputTransaction = {
      id: 'tx-comma',
      date: '2024-04-01',
      buyerCountry: 'NL',
      amount: 1000,
      currency: 'EUR',
      description: 'Course, workshop, and training',
      productType: 'services',
    };
    const d = buildArt63cDocument([tx], [], 2024);
    const r = exportArt63cCSV(d);
    const lines = r.csv.split('\n').filter((l) => !l.startsWith('#'));
    const dataRow = lines[1];
    expect(dataRow).toContain('"Course, workshop, and training [services]"');
  });
});

// ---------------------------------------------------------------------------
// 6. exportArt63cJSON: structure
// ---------------------------------------------------------------------------

describe('exportArt63cJSON()', () => {
  const doc = buildArt63cDocument([TX_SERVICE], [], 2024);
  const result = exportArt63cJSON(doc);

  it('returns a filename for the period year', () => {
    expect(result.filename).toBe('art63c-oss-record-2024.json');
  });

  it('recordCount matches number of records', () => {
    expect(result.recordCount).toBe(1);
  });

  it('json parses without error', () => {
    expect(() => JSON.parse(result.json)).not.toThrow();
  });

  it('parsed JSON has metadata block with scheme and retentionUntil', () => {
    const parsed = JSON.parse(result.json) as {
      metadata: { scheme: string; retentionUntil: string };
    };
    expect(parsed.metadata.scheme).toBe('UNION_OSS');
    expect(parsed.metadata.retentionUntil).toBe('2034-12-31');
  });

  it('parsed JSON has records array with all Art. 63c fields', () => {
    const parsed = JSON.parse(result.json) as { records: Array<Record<string, unknown>> };
    expect(parsed.records).toHaveLength(1);
    const rec = parsed.records[0];
    expect(rec['memberStateOfConsumption']).toBe('DE');
    expect(rec['dateOfSupply']).toBe('2024-03-15');
    expect(rec['taxableAmountEUR']).toBe(100);
    expect(rec['supplyQuantity']).toBe(NOT_CAPTURED);
    expect(rec['paymentDate']).toBe(NOT_CAPTURED);
    expect(rec['invoiceInformation']).toBe(NOT_CAPTURED);
  });
});
