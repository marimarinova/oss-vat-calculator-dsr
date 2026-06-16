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
  type Art63cPayment,
  type Art63cReturn,
  type Art63cLocationEvidenceItem,
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
  quantity: 1,
  invoiceNumber: 'INV-2024-001',
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
  quantity: 3,
  // vatRate intentionally absent
  // invoiceNumber intentionally absent
};

const TX_2023: Art63cInputTransaction = {
  id: 'tx-003',
  date: '2023-11-20',
  buyerCountry: 'IT',
  amount: 20000,
  currency: 'EUR',
  description: 'Consulting',
  productType: 'services',
  quantity: 1,
  vatRate: 22,
};

const CORRECTION: Art63cInputCorrection = {
  id: 'corr-001',
  originalTransactionId: 'tx-001',
  reasonCode: 'PRICE-CHANGE',
  createdAt: 1710000000000,
  adjustedAmount: 8000, // corrected to 80.00 EUR
};

// Full-data fixture used in the "all fields populated" test.
const PAYMENTS_FULL: Art63cPayment[] = [
  { id: 'pay-1', date: '2024-04-20', amount: 5000, currency: 'EUR', isAdvance: true },
  { id: 'pay-2', date: '2024-05-01', amount: 5000, currency: 'EUR', isAdvance: false },
];

const EVIDENCE_FULL: Art63cLocationEvidenceItem[] = [
  { evidenceType: 'billing-country', value: 'DE' },
  { evidenceType: 'ip-country', value: 'DE' },
];

const RETURNS_FULL: Art63cReturn[] = [
  { id: 'ret-1', date: '2024-06-15', returnedAmount: 2000, vatRate: 19 },
];

const TX_FULL: Art63cInputTransaction = {
  id: 'tx-full',
  date: '2024-05-01',
  buyerCountry: 'DE',
  amount: 10000,
  currency: 'EUR',
  description: 'Software licence',
  productType: 'services',
  quantity: 2,
  invoiceNumber: 'INV-2024-FULL',
  vatRate: 19,
  payments: PAYMENTS_FULL,
  locationEvidence: EVIDENCE_FULL,
  returns: RETURNS_FULL,
};

const CORRECTION_FULL: Art63cInputCorrection = {
  id: 'corr-full',
  originalTransactionId: 'tx-full',
  reasonCode: 'PRICE-CHANGE',
  createdAt: 1714600000000,
  adjustedAmount: 9000,
};

// ---------------------------------------------------------------------------
// 1. Column manifest: all 16 columns present and in Art. 63c(1)(a)–(l) order
// ---------------------------------------------------------------------------

describe('ART63C_CSV_HEADERS', () => {
  it('contains exactly 16 columns', () => {
    expect(ART63C_CSV_HEADERS).toHaveLength(16);
  });

  it('starts with the internal transaction_id column', () => {
    expect(ART63C_CSV_HEADERS[0]).toBe('transaction_id');
  });

  it('follows Art. 63c(1)(a)–(l) order', () => {
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
      'art63c_1h_payment_information',
      'art63c_1i_advance_payment_info',
      'art63c_1j_invoice_information',
      'art63c_1k_customer_location_evidence',
      'art63c_1l_return_information',
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
// 3. buildArt63cRecord: field population and NOT_CAPTURED / 'none' flags
// ---------------------------------------------------------------------------

describe('buildArt63cRecord()', () => {
  describe('fields always populated (transaction with vatRate, no extra data)', () => {
    const record = buildArt63cRecord(TX_SERVICE, []);

    it('Field 1: memberStateOfConsumption = buyerCountry', () => {
      expect(record.memberStateOfConsumption).toBe('DE');
    });

    it('Field 2a: supplyDescription includes description and productType', () => {
      expect(record.supplyDescription).toContain('SaaS subscription');
      expect(record.supplyDescription).toContain('services');
    });

    it('Field 2b: supplyQuantity = tx.quantity (1)', () => {
      expect(record.supplyQuantity).toBe(1);
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

    it('Field 6: vatRateApplied = 19', () => {
      expect(record.vatRateApplied).toBe(19);
    });

    it('Field 7: vatAmountPayable = 19.00 EUR', () => {
      expect(record.vatAmountPayable).toBe(19);
    });

    it('Field 7: vatAmountCurrency = EUR', () => {
      expect(record.vatAmountCurrency).toBe('EUR');
    });

    it('Field 8: paymentInformation = "none" when no payments', () => {
      expect(record.paymentInformation).toBe('none');
    });

    it('Field 9: advancePaymentInfo = "none" when no payments', () => {
      expect(record.advancePaymentInfo).toBe('none');
    });

    it('Field 10: invoiceInformation = invoiceNumber when present', () => {
      expect(record.invoiceInformation).toBe('INV-2024-001');
    });

    it('Field 11: customerLocationEvidence = "none" when no evidence', () => {
      expect(record.customerLocationEvidence).toBe('none');
    });

    it('Field 12: returnInformation = "none" when no returns', () => {
      expect(record.returnInformation).toBe('none');
    });
  });

  describe('NOT_CAPTURED fields remain where data is genuinely absent', () => {
    const record = buildArt63cRecord(TX_GOODS_NO_RATE, []);

    it('Field 5: taxableAmountAdjustment = NOT_CAPTURED when no corrections', () => {
      expect(record.taxableAmountAdjustment).toBe(NOT_CAPTURED);
    });

    it('Field 6: vatRateApplied = NOT_CAPTURED when vatRate absent', () => {
      expect(record.vatRateApplied).toBe(NOT_CAPTURED);
    });

    it('Field 7: vatAmountPayable = NOT_CAPTURED when vatRate absent', () => {
      expect(record.vatAmountPayable).toBe(NOT_CAPTURED);
    });

    it('Field 10: invoiceInformation = NOT_CAPTURED when invoiceNumber absent', () => {
      expect(record.invoiceInformation).toBe(NOT_CAPTURED);
    });
  });

  describe('partially captured fields (no vatRate)', () => {
    const record = buildArt63cRecord(TX_GOODS_NO_RATE, []);

    it('Field 4: taxableAmountEUR still computed (50.00 EUR)', () => {
      expect(record.taxableAmountEUR).toBe(50);
    });

    it('Field 2b: supplyQuantity = 3 (from TX_GOODS_NO_RATE.quantity)', () => {
      expect(record.supplyQuantity).toBe(3);
    });
  });

  describe('Field 5: correction linking with adjustedAmount', () => {
    it('includes adjustedAmount in EUR, reasonCode, and corrId when linked', () => {
      const record = buildArt63cRecord(TX_SERVICE, [CORRECTION]);
      expect(record.taxableAmountAdjustment).toContain('CORRECTION');
      expect(record.taxableAmountAdjustment).toContain('adjustedAmount:80 EUR'); // 8000 cents / 100
      expect(record.taxableAmountAdjustment).toContain('PRICE-CHANGE');
      expect(record.taxableAmountAdjustment).toContain('corr-001');
    });

    it('does not link corrections for a different transaction', () => {
      const record = buildArt63cRecord(TX_GOODS_NO_RATE, [CORRECTION]);
      expect(record.taxableAmountAdjustment).toBe(NOT_CAPTURED);
    });
  });

  describe('Field 8: payments (Art. 63c(1)(h))', () => {
    it('serialises all payments with date and amount', () => {
      const tx: Art63cInputTransaction = {
        ...TX_SERVICE,
        payments: [
          { id: 'p1', date: '2024-03-01', amount: 4000, currency: 'EUR', isAdvance: false },
          { id: 'p2', date: '2024-03-15', amount: 6000, currency: 'EUR', isAdvance: false },
        ],
      };
      const record = buildArt63cRecord(tx, []);
      expect(record.paymentInformation).toContain('PAYMENT(date:2024-03-01; amount:40 EUR)');
      expect(record.paymentInformation).toContain('PAYMENT(date:2024-03-15; amount:60 EUR)');
    });

    it('includes advance payments in paymentInformation (they are still payments)', () => {
      const tx: Art63cInputTransaction = {
        ...TX_SERVICE,
        payments: [
          { id: 'p1', date: '2024-02-01', amount: 3000, currency: 'EUR', isAdvance: true },
        ],
      };
      const record = buildArt63cRecord(tx, []);
      expect(record.paymentInformation).toContain('PAYMENT(date:2024-02-01; amount:30 EUR)');
    });

    it('returns "none" for empty payments array', () => {
      const tx: Art63cInputTransaction = { ...TX_SERVICE, payments: [] };
      expect(buildArt63cRecord(tx, []).paymentInformation).toBe('none');
    });

    it('returns "none" when payments is omitted', () => {
      const { payments: _p, ...txWithout } = TX_SERVICE as Art63cInputTransaction & {
        payments?: Art63cPayment[];
      };
      expect(buildArt63cRecord(txWithout, []).paymentInformation).toBe('none');
    });
  });

  describe('Field 9: advance payments (Art. 63c(1)(i))', () => {
    it('serialises only isAdvance=true payments as ADVANCE entries', () => {
      const tx: Art63cInputTransaction = {
        ...TX_SERVICE,
        payments: [
          { id: 'p1', date: '2024-02-10', amount: 2000, currency: 'EUR', isAdvance: true },
          { id: 'p2', date: '2024-03-15', amount: 8000, currency: 'EUR', isAdvance: false },
        ],
      };
      const record = buildArt63cRecord(tx, []);
      expect(record.advancePaymentInfo).toContain('ADVANCE(date:2024-02-10; amount:20 EUR)');
      expect(record.advancePaymentInfo).not.toContain('2024-03-15');
    });

    it('returns "none" when all payments are non-advance', () => {
      const tx: Art63cInputTransaction = {
        ...TX_SERVICE,
        payments: [
          { id: 'p1', date: '2024-03-15', amount: 10000, currency: 'EUR', isAdvance: false },
        ],
      };
      expect(buildArt63cRecord(tx, []).advancePaymentInfo).toBe('none');
    });

    it('returns "none" when no payments', () => {
      expect(buildArt63cRecord(TX_SERVICE, []).advancePaymentInfo).toBe('none');
    });
  });

  describe('Field 11: customer location evidence (Art. 63c(1)(k))', () => {
    it('serialises evidence items as evidenceType:value pairs', () => {
      const tx: Art63cInputTransaction = {
        ...TX_SERVICE,
        locationEvidence: [
          { evidenceType: 'billing-country', value: 'DE' },
          { evidenceType: 'ip-country', value: 'DE' },
        ],
      };
      const record = buildArt63cRecord(tx, []);
      expect(record.customerLocationEvidence).toContain('billing-country:DE');
      expect(record.customerLocationEvidence).toContain('ip-country:DE');
    });

    it('returns "none" for empty evidence array', () => {
      const tx: Art63cInputTransaction = { ...TX_SERVICE, locationEvidence: [] };
      expect(buildArt63cRecord(tx, []).customerLocationEvidence).toBe('none');
    });

    it('returns "none" when locationEvidence is omitted', () => {
      expect(buildArt63cRecord(TX_SERVICE, []).customerLocationEvidence).toBe('none');
    });
  });

  describe('Field 12: returns of goods (Art. 63c(1)(l))', () => {
    it('serialises returns with date, returnedAmount, and vatRate', () => {
      const tx: Art63cInputTransaction = {
        ...TX_SERVICE,
        returns: [{ id: 'r1', date: '2024-04-10', returnedAmount: 3000, vatRate: 19 }],
      };
      const record = buildArt63cRecord(tx, []);
      expect(record.returnInformation).toContain('RETURN(date:2024-04-10');
      expect(record.returnInformation).toContain('returnedAmount:30 EUR');
      expect(record.returnInformation).toContain('vatRate:19%');
    });

    it('joins multiple returns with "; "', () => {
      const tx: Art63cInputTransaction = {
        ...TX_SERVICE,
        returns: [
          { id: 'r1', date: '2024-04-10', returnedAmount: 2000, vatRate: 19 },
          { id: 'r2', date: '2024-04-20', returnedAmount: 1000, vatRate: 19 },
        ],
      };
      const record = buildArt63cRecord(tx, []);
      expect(record.returnInformation).toContain('RETURN(date:2024-04-10');
      expect(record.returnInformation).toContain('RETURN(date:2024-04-20');
    });

    it('returns "none" for empty returns array', () => {
      const tx: Art63cInputTransaction = { ...TX_SERVICE, returns: [] };
      expect(buildArt63cRecord(tx, []).returnInformation).toBe('none');
    });

    it('returns "none" when returns is omitted', () => {
      expect(buildArt63cRecord(TX_SERVICE, []).returnInformation).toBe('none');
    });
  });

  describe('ALL 12 Art. 63c fields fully populated', () => {
    const record = buildArt63cRecord(TX_FULL, [CORRECTION_FULL]);

    it('Field 1: memberStateOfConsumption populated', () => {
      expect(record.memberStateOfConsumption).toBe('DE');
    });

    it('Field 2: supplyDescription and supplyQuantity populated', () => {
      expect(record.supplyDescription).toContain('Software licence');
      expect(record.supplyQuantity).toBe(2);
    });

    it('Field 3: dateOfSupply populated', () => {
      expect(record.dateOfSupply).toBe('2024-05-01');
    });

    it('Field 4: taxableAmountEUR and currency populated', () => {
      expect(record.taxableAmountEUR).toBe(100);
      expect(record.taxableAmountCurrency).toBe('EUR');
    });

    it('Field 5: taxableAmountAdjustment populated (correction present)', () => {
      expect(record.taxableAmountAdjustment).toContain('CORRECTION');
      expect(record.taxableAmountAdjustment).not.toBe(NOT_CAPTURED);
    });

    it('Field 6: vatRateApplied populated', () => {
      expect(record.vatRateApplied).toBe(19);
    });

    it('Field 7: vatAmountPayable populated', () => {
      expect(record.vatAmountPayable).toBe(19);
    });

    it('Field 8: paymentInformation populated (both payments listed)', () => {
      expect(record.paymentInformation).toContain('PAYMENT(date:2024-04-20; amount:50 EUR)');
      expect(record.paymentInformation).toContain('PAYMENT(date:2024-05-01; amount:50 EUR)');
      expect(record.paymentInformation).not.toBe('none');
      expect(record.paymentInformation).not.toBe(NOT_CAPTURED);
    });

    it('Field 9: advancePaymentInfo populated (advance payment listed)', () => {
      expect(record.advancePaymentInfo).toContain('ADVANCE(date:2024-04-20; amount:50 EUR)');
      expect(record.advancePaymentInfo).not.toBe('none');
      expect(record.advancePaymentInfo).not.toBe(NOT_CAPTURED);
    });

    it('Field 10: invoiceInformation populated', () => {
      expect(record.invoiceInformation).toBe('INV-2024-FULL');
    });

    it('Field 11: customerLocationEvidence populated (both evidence items)', () => {
      expect(record.customerLocationEvidence).toContain('billing-country:DE');
      expect(record.customerLocationEvidence).toContain('ip-country:DE');
      expect(record.customerLocationEvidence).not.toBe('none');
      expect(record.customerLocationEvidence).not.toBe(NOT_CAPTURED);
    });

    it('Field 12: returnInformation populated', () => {
      expect(record.returnInformation).toContain('RETURN(date:2024-06-15');
      expect(record.returnInformation).toContain('returnedAmount:20 EUR');
      expect(record.returnInformation).toContain('vatRate:19%');
      expect(record.returnInformation).not.toBe('none');
      expect(record.returnInformation).not.toBe(NOT_CAPTURED);
    });

    it('no field is NOT_CAPTURED when all data is present', () => {
      const values = Object.values(record);
      expect(values.every((v) => v !== NOT_CAPTURED)).toBe(true);
    });

    it('no field is "none" when all data is present', () => {
      expect(record.paymentInformation).not.toBe('none');
      expect(record.advancePaymentInfo).not.toBe('none');
      expect(record.customerLocationEvidence).not.toBe('none');
      expect(record.returnInformation).not.toBe('none');
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
        quantity: 1,
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

  it('propagates payments/locationEvidence/returns from transactions into records', () => {
    const txWithData: Art63cInputTransaction = {
      ...TX_SERVICE,
      payments: [
        { id: 'p1', date: '2024-03-10', amount: 10000, currency: 'EUR', isAdvance: false },
      ],
      locationEvidence: [{ evidenceType: 'billing-country', value: 'DE' }],
      returns: [{ id: 'r1', date: '2024-04-01', returnedAmount: 1000, vatRate: 19 }],
    };
    const doc = buildArt63cDocument([txWithData], [], 2024);
    const r = doc.records[0];
    expect(r.paymentInformation).toContain('PAYMENT');
    expect(r.customerLocationEvidence).toContain('billing-country:DE');
    expect(r.returnInformation).toContain('RETURN');
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

  it('CSV includes a header row with all 16 column names', () => {
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
    expect(headers[11]).toBe('art63c_1h_payment_information');
    expect(headers[15]).toBe('art63c_1l_return_information');
  });

  it('includes metadata comment rows (prefixed with #)', () => {
    const commentLines = result.csv.split('\n').filter((l) => l.startsWith('#'));
    expect(commentLines.length).toBeGreaterThan(0);
    const combined = commentLines.join('\n');
    expect(combined).toContain('UNION_OSS');
    expect(combined).toContain('2034-12-31');
  });

  it('data row contains NOT_CAPTURED for fields where data is absent', () => {
    const lines = result.csv.split('\n').filter((l) => !l.startsWith('#'));
    const dataRow1 = lines[1]; // TX_SERVICE with vatRate — only field 5 and 10 may vary
    // vatRate IS present on TX_SERVICE so field 5/6/7 are NOT NOT_CAPTURED
    // No corrections → field 5 is NOT_CAPTURED
    expect(dataRow1).toContain('NOT_CAPTURED');
  });

  it('data row contains "none" for empty subcollection fields (not NOT_CAPTURED)', () => {
    const lines = result.csv.split('\n').filter((l) => !l.startsWith('#'));
    const dataRow1 = lines[1];
    expect(dataRow1).toContain('none'); // payments/evidence/returns are absent → 'none'
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
      quantity: 1,
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

  it('parsed JSON has records array with populated Art. 63c fields', () => {
    const parsed = JSON.parse(result.json) as { records: Array<Record<string, unknown>> };
    expect(parsed.records).toHaveLength(1);
    const rec = parsed.records[0];
    expect(rec['memberStateOfConsumption']).toBe('DE');
    expect(rec['dateOfSupply']).toBe('2024-03-15');
    expect(rec['taxableAmountEUR']).toBe(100);
    expect(rec['supplyQuantity']).toBe(1);
    expect(rec['invoiceInformation']).toBe('INV-2024-001');
    // new fields: 'none' when no data (not NOT_CAPTURED)
    expect(rec['paymentInformation']).toBe('none');
    expect(rec['advancePaymentInfo']).toBe('none');
    expect(rec['customerLocationEvidence']).toBe('none');
    expect(rec['returnInformation']).toBe('none');
  });

  it('parsed JSON includes fully populated fields when TX_FULL is used', () => {
    const fullDoc = buildArt63cDocument([TX_FULL], [CORRECTION_FULL], 2024);
    const fullResult = exportArt63cJSON(fullDoc);
    const parsed = JSON.parse(fullResult.json) as { records: Array<Record<string, unknown>> };
    const rec = parsed.records[0];
    expect(typeof rec['paymentInformation']).toBe('string');
    expect(rec['paymentInformation']).toContain('PAYMENT');
    expect(rec['advancePaymentInfo']).toContain('ADVANCE');
    expect(rec['customerLocationEvidence']).toContain('billing-country:DE');
    expect(rec['returnInformation']).toContain('RETURN');
    // no NOT_CAPTURED anywhere
    const jsonStr = fullResult.json;
    expect(jsonStr).not.toContain(NOT_CAPTURED);
  });
});
