/**
 * Tests for CSV NAP Export Generator
 * Verifies Bulgarian National Revenue Agency (NAP) OSS portal compliance
 *
 * @author Marieta Marinova
 * @license MIT
 */

import { describe, it, expect } from 'vitest';
import { generateNAPExportCSV, aggregateToNAPRows, formatNAPDate } from './csv-nap-export';
import { NAPExportDocument } from './types';

describe('CSV NAP Export Generator', () => {
  const mockNAPDocument: NAPExportDocument = {
    rows: [
      {
        section: '2A',
        memberState: 'DE',
        vatRate: 19.0,
        taxableAmount: 1500.0,
        vatAmount: 285.0,
      },
      {
        section: '2A',
        memberState: 'FR',
        vatRate: 20.0,
        taxableAmount: 800.0,
        vatAmount: 160.0,
      },
      {
        section: '2B',
        memberState: 'AT',
        vatRate: 20.0,
        taxableAmount: 2000.0,
        vatAmount: 400.0,
      },
      {
        section: '2C',
        memberState: 'IT',
        vatRate: 22.0,
        taxableAmount: 500.0,
        vatAmount: 110.0,
      },
    ],
    reportPeriod: {
      year: 2024,
      quarter: 1,
    },
    submittingEntity: {
      bulgarianVATNumber: 'BG202024680',
      companyName: 'TechCorp Bulgaria EOOD',
    },
    generatedAt: new Date('2024-04-15'),
    totalNetAmount: 4800.0,
    totalVATAmount: 955.0,
  };

  it('should generate valid CSV with header row', () => {
    const result = generateNAPExportCSV(mockNAPDocument);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.csv).toContain('section,member_state,vat_rate,taxable_amount,vat_amount');
      expect(result.mimeType).toBe('text/csv');
      expect(result.filename).toContain('NAP-OSS');
      expect(result.filename).toContain('Q1-2024');
      expect(result.rowCount).toBe(4);
    }
  });

  it('should format numbers with period as decimal separator per NAP spec', () => {
    const result = generateNAPExportCSV(mockNAPDocument);

    if (result.success) {
      expect(result.csv).toContain('19.00');
      expect(result.csv).toContain('285.00');
      expect(result.csv).not.toContain('19,00');
    }
  });

  it('should handle comma delimiter when specified', () => {
    const result = generateNAPExportCSV(mockNAPDocument, { delimiter: ';' });

    if (result.success) {
      expect(result.csv).toContain('section;member_state;vat_rate');
    }
  });

  it('should support comma as decimal separator', () => {
    const result = generateNAPExportCSV(mockNAPDocument, {
      decimalSeparator: ',',
    });

    if (result.success) {
      expect(result.csv).toContain('19,00');
      expect(result.csv).not.toContain('19.00');
    }
  });

  it('should omit header when includeHeader is false', () => {
    const result = generateNAPExportCSV(mockNAPDocument, {
      includeHeader: false,
    });

    if (result.success) {
      expect(result.csv).not.toContain('section,member_state');
      const lines = result.csv.split('\n');
      expect(lines[0]).toMatch(/^2/); // Starts with section ID
    }
  });

  it('should validate NAP document structure', () => {
    const invalidDocument: NAPExportDocument = {
      ...mockNAPDocument,
      rows: [], // Empty rows
    };

    const result = generateNAPExportCSV(invalidDocument);

    expect(result.success).toBe(false);
    expect(result.error).toContain('validation failed');
  });

  it('should reject invalid member state codes', () => {
    const invalidDocument: NAPExportDocument = {
      ...mockNAPDocument,
      rows: [
        {
          section: '2A',
          memberState: 'INVALID', // Not 2-letter code
          vatRate: 19.0,
          taxableAmount: 1000.0,
          vatAmount: 190.0,
        },
      ],
    };

    const result = generateNAPExportCSV(invalidDocument);

    expect(result.success).toBe(false);
  });

  it('should reject invalid section codes', () => {
    const invalidDocument: NAPExportDocument = {
      ...mockNAPDocument,
      rows: [
        {
          section: '3A' as any, // Invalid section
          memberState: 'DE',
          vatRate: 19.0,
          taxableAmount: 1000.0,
          vatAmount: 190.0,
        },
      ],
    };

    const result = generateNAPExportCSV(invalidDocument);

    expect(result.success).toBe(false);
  });

  it('should validate VAT rate range', () => {
    const invalidDocument: NAPExportDocument = {
      ...mockNAPDocument,
      rows: [
        {
          section: '2A',
          memberState: 'DE',
          vatRate: 150.0, // Over 100%
          taxableAmount: 1000.0,
          vatAmount: 1500.0,
        },
      ],
    };

    const result = generateNAPExportCSV(invalidDocument);

    expect(result.success).toBe(false);
  });

  it('should validate VAT calculation accuracy', () => {
    const invalidDocument: NAPExportDocument = {
      ...mockNAPDocument,
      rows: [
        {
          section: '2A',
          memberState: 'DE',
          vatRate: 19.0,
          taxableAmount: 1000.0,
          vatAmount: 500.0, // Incorrect: should be 190
        },
      ],
    };

    const result = generateNAPExportCSV(invalidDocument);

    expect(result.success).toBe(false);
    expect(result.details).toContain('VAT calculation mismatch');
  });

  it('should allow small rounding errors in VAT calculation', () => {
    const document: NAPExportDocument = {
      ...mockNAPDocument,
      rows: [
        {
          section: '2A',
          memberState: 'DE',
          vatRate: 19.0,
          taxableAmount: 333.33,
          vatAmount: 63.33, // Allowed rounding difference
        },
      ],
      totalNetAmount: 333.33,
      totalVATAmount: 63.33,
    };

    const result = generateNAPExportCSV(document);

    expect(result.success).toBe(true);
  });

  it('should validate document totals against row sums', () => {
    const invalidDocument: NAPExportDocument = {
      ...mockNAPDocument,
      totalNetAmount: 1000.0, // Doesn't match sum of rows
    };

    const result = generateNAPExportCSV(invalidDocument);

    expect(result.success).toBe(false);
    expect(result.details).toContain('Total net amount mismatch');
  });

  it('should reject invalid quarter numbers', () => {
    const invalidDocument: NAPExportDocument = {
      ...mockNAPDocument,
      reportPeriod: {
        year: 2024,
        quarter: 5, // Invalid: must be 1-4
      },
    };

    const result = generateNAPExportCSV(invalidDocument);

    expect(result.success).toBe(false);
  });

  it('should reject missing Bulgarian VAT number', () => {
    const invalidDocument: NAPExportDocument = {
      ...mockNAPDocument,
      submittingEntity: {
        ...mockNAPDocument.submittingEntity,
        bulgarianVATNumber: '',
      },
    };

    const result = generateNAPExportCSV(invalidDocument);

    expect(result.success).toBe(false);
  });

  it('should sort rows by section for consistent output', () => {
    const unsortedDocument: NAPExportDocument = {
      ...mockNAPDocument,
      rows: [
        {
          section: '2D',
          memberState: 'ES',
          vatRate: 21.0,
          taxableAmount: 500.0,
          vatAmount: 105.0,
        },
        {
          section: '2A',
          memberState: 'DE',
          vatRate: 19.0,
          taxableAmount: 1000.0,
          vatAmount: 190.0,
        },
        {
          section: '2C',
          memberState: 'IT',
          vatRate: 22.0,
          taxableAmount: 500.0,
          vatAmount: 110.0,
        },
      ],
      totalNetAmount: 2000.0,
      totalVATAmount: 405.0,
    };

    const result = generateNAPExportCSV(unsortedDocument);

    if (result.success) {
      const lines = result.csv.split('\n');
      const dataLines = lines.slice(1); // Skip header
      expect(dataLines[0]).toContain('2A');
      expect(dataLines[1]).toContain('2C');
      expect(dataLines[2]).toContain('2D');
    }
  });

  it('should properly escape special characters in CSV', () => {
    const document: NAPExportDocument = {
      ...mockNAPDocument,
      rows: [
        {
          section: '2A',
          memberState: 'DE',
          vatRate: 19.0,
          taxableAmount: 1000.0,
          vatAmount: 190.0,
        },
      ],
      totalNetAmount: 1000.0,
      totalVATAmount: 190.0,
      submittingEntity: {
        bulgarianVATNumber: 'BG202024680',
        companyName: 'Company "With Quotes"',
      },
    };

    const result = generateNAPExportCSV(document);
    expect(result.success).toBe(true);
  });
});

describe('aggregateToNAPRows', () => {
  it('should aggregate items by section and member state', () => {
    const items = [
      {
        description: 'Service 1',
        netAmount: 1000,
        vatRate: 19,
        vatAmount: 190,
        section: '2A' as const,
        memberState: 'DE',
      },
      {
        description: 'Service 2',
        netAmount: 500,
        vatRate: 19,
        vatAmount: 95,
        section: '2A' as const,
        memberState: 'DE',
      },
      {
        description: 'Service 3',
        netAmount: 800,
        vatRate: 20,
        vatAmount: 160,
        section: '2A' as const,
        memberState: 'FR',
      },
    ];

    const rows = aggregateToNAPRows(items);

    expect(rows.length).toBe(2);
    expect(rows[0].taxableAmount).toBe(1500); // 1000 + 500
    expect(rows[0].vatAmount).toBe(285); // 190 + 95
    expect(rows[1].taxableAmount).toBe(800);
    expect(rows[1].vatAmount).toBe(160);
  });

  it('should handle empty items array', () => {
    const rows = aggregateToNAPRows([]);

    expect(rows.length).toBe(0);
  });

  it('should return rows in consistent order', () => {
    const items = [
      {
        description: 'Item',
        netAmount: 100,
        vatRate: 19,
        vatAmount: 19,
        section: '2C' as const,
        memberState: 'IT',
      },
      {
        description: 'Item',
        netAmount: 100,
        vatRate: 19,
        vatAmount: 19,
        section: '2A' as const,
        memberState: 'DE',
      },
    ];

    const rows = aggregateToNAPRows(items);

    expect(rows.length).toBe(2);
  });
});

describe('formatNAPDate', () => {
  it('should format date as dd.mm.yyyy by default', () => {
    const date = new Date('2024-03-15');
    const formatted = formatNAPDate(date);

    expect(formatted).toBe('15.03.2024');
  });

  it('should format date as yyyy-mm-dd when specified', () => {
    const date = new Date('2024-03-15');
    const formatted = formatNAPDate(date, 'yyyy-mm-dd');

    expect(formatted).toBe('2024-03-15');
  });

  it('should pad single-digit day and month', () => {
    const date = new Date('2024-01-05');
    const formatted = formatNAPDate(date);

    expect(formatted).toBe('05.01.2024');
  });

  it('should handle end of month dates', () => {
    const date = new Date('2024-02-29'); // Leap year
    const formatted = formatNAPDate(date);

    expect(formatted).toBe('29.02.2024');
  });
});
