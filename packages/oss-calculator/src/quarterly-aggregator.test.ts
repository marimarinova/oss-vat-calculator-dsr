import { describe, it, expect, beforeEach } from 'vitest';
import { QuarterlyAggregator } from './quarterly-aggregator';
import { VATCalculationResult } from './tax-engine';

describe('Quarterly Aggregator', () => {
  let aggregator: QuarterlyAggregator;

  beforeEach(() => {
    aggregator = new QuarterlyAggregator(1, 2026, 'BG');
  });

  describe('Initialization', () => {
    it('should initialize with quarter, year, and supplier country', () => {
      expect(aggregator).toBeDefined();
    });

    it('should throw error for invalid quarter', () => {
      expect(() => new QuarterlyAggregator(0, 2026, 'BG')).toThrow();
      expect(() => new QuarterlyAggregator(5, 2026, 'BG')).toThrow();
      expect(() => new QuarterlyAggregator(1.5, 2026, 'BG')).toThrow();
    });

    it('should throw error for invalid supplier country code', () => {
      expect(() => new QuarterlyAggregator(1, 2026, 'BGR')).toThrow();
      expect(() => new QuarterlyAggregator(1, 2026, '')).toThrow();
    });
  });

  describe('Aggregation into sections (2A, 2B, 2C, 2D)', () => {
    it('should aggregate into Section 2A: Services from supplier country', () => {
      const results: VATCalculationResult[] = [
        {
          transactionId: 'TX001',
          customerCountryCode: 'DE',
          supplierCountryCode: 'BG',
          amountEUR: 100,
          amountLocal: 100,
          currency: 'EUR',
          vatRate: 19,
          vatAmount: 19,
          totalAmountEUR: 119,
          rateType: 'standard',
          isGoods: false, // SERVICE
        },
      ];

      const returnData = aggregator.aggregate(results);

      expect(returnData.sections.section2A.items).toHaveLength(1);
      expect(returnData.sections.section2A.items[0].memberState).toBe('DE');
      expect(returnData.sections.section2A.items[0].baseAmount).toBe(100);
      expect(returnData.sections.section2A.items[0].vatAmount).toBe(19);
    });

    it('should aggregate into Section 2B: Goods from supplier country', () => {
      const results: VATCalculationResult[] = [
        {
          transactionId: 'TX002',
          customerCountryCode: 'FR',
          supplierCountryCode: 'BG',
          amountEUR: 200,
          amountLocal: 200,
          currency: 'EUR',
          vatRate: 20,
          vatAmount: 40,
          totalAmountEUR: 240,
          rateType: 'standard',
          isGoods: true, // GOODS
        },
      ];

      const returnData = aggregator.aggregate(results);

      expect(returnData.sections.section2B.items).toHaveLength(1);
      expect(returnData.sections.section2B.items[0].memberState).toBe('FR');
      expect(returnData.sections.section2B.items[0].baseAmount).toBe(200);
      expect(returnData.sections.section2B.items[0].vatAmount).toBe(40);
    });

    it('should aggregate into Section 2C: Services from other MS', () => {
      const results: VATCalculationResult[] = [
        {
          transactionId: 'TX003',
          customerCountryCode: 'IT',
          supplierCountryCode: 'DE', // NOT BG
          amountEUR: 150,
          amountLocal: 150,
          currency: 'EUR',
          vatRate: 22,
          vatAmount: 33,
          totalAmountEUR: 183,
          rateType: 'standard',
          isGoods: false, // SERVICE
        },
      ];

      const returnData = aggregator.aggregate(results);

      expect(returnData.sections.section2C.items).toHaveLength(1);
      expect(returnData.sections.section2C.items[0].memberState).toBe('IT');
    });

    it('should aggregate into Section 2D: Goods from other MS', () => {
      const results: VATCalculationResult[] = [
        {
          transactionId: 'TX004',
          customerCountryCode: 'ES',
          supplierCountryCode: 'DE', // NOT BG
          amountEUR: 300,
          amountLocal: 300,
          currency: 'EUR',
          vatRate: 21,
          vatAmount: 63,
          totalAmountEUR: 363,
          rateType: 'standard',
          isGoods: true, // GOODS
        },
      ];

      const returnData = aggregator.aggregate(results);

      expect(returnData.sections.section2D.items).toHaveLength(1);
      expect(returnData.sections.section2D.items[0].memberState).toBe('ES');
    });
  });

  describe('Aggregation across multiple countries', () => {
    it('should combine transactions to same country', () => {
      const results: VATCalculationResult[] = [
        {
          transactionId: 'TX005',
          customerCountryCode: 'DE',
          supplierCountryCode: 'BG',
          amountEUR: 100,
          amountLocal: 100,
          currency: 'EUR',
          vatRate: 19,
          vatAmount: 19,
          totalAmountEUR: 119,
          rateType: 'standard',
          isGoods: true,
        },
        {
          transactionId: 'TX006',
          customerCountryCode: 'DE', // SAME COUNTRY
          supplierCountryCode: 'BG',
          amountEUR: 200,
          amountLocal: 200,
          currency: 'EUR',
          vatRate: 19,
          vatAmount: 38,
          totalAmountEUR: 238,
          rateType: 'standard',
          isGoods: true,
        },
      ];

      const returnData = aggregator.aggregate(results);

      expect(returnData.sections.section2B.items).toHaveLength(1);
      expect(returnData.sections.section2B.items[0].memberState).toBe('DE');
      expect(returnData.sections.section2B.items[0].baseAmount).toBe(300);
      expect(returnData.sections.section2B.items[0].vatAmount).toBe(57);
      expect(returnData.sections.section2B.items[0].supplyCount).toBe(2);
    });

    it('should handle multiple countries in one section', () => {
      const results: VATCalculationResult[] = [
        {
          transactionId: 'TX007',
          customerCountryCode: 'DE',
          supplierCountryCode: 'BG',
          amountEUR: 100,
          amountLocal: 100,
          currency: 'EUR',
          vatRate: 19,
          vatAmount: 19,
          totalAmountEUR: 119,
          rateType: 'standard',
          isGoods: false,
        },
        {
          transactionId: 'TX008',
          customerCountryCode: 'FR', // DIFFERENT COUNTRY
          supplierCountryCode: 'BG',
          amountEUR: 200,
          amountLocal: 200,
          currency: 'EUR',
          vatRate: 20,
          vatAmount: 40,
          totalAmountEUR: 240,
          rateType: 'standard',
          isGoods: false,
        },
      ];

      const returnData = aggregator.aggregate(results);

      expect(returnData.sections.section2A.items).toHaveLength(2);
      expect(returnData.sections.section2A.totalBase).toBe(300);
      expect(returnData.sections.section2A.totalVAT).toBe(59);
    });
  });

  describe('Return structure', () => {
    it('should include all four sections in return', () => {
      const results: VATCalculationResult[] = [];
      const returnData = aggregator.aggregate(results);

      expect(returnData.sections.section2A).toBeDefined();
      expect(returnData.sections.section2B).toBeDefined();
      expect(returnData.sections.section2C).toBeDefined();
      expect(returnData.sections.section2D).toBeDefined();
    });

    it('should calculate section totals correctly', () => {
      const results: VATCalculationResult[] = [
        {
          transactionId: 'TX009',
          customerCountryCode: 'DE',
          supplierCountryCode: 'BG',
          amountEUR: 100,
          amountLocal: 100,
          currency: 'EUR',
          vatRate: 19,
          vatAmount: 19,
          totalAmountEUR: 119,
          rateType: 'standard',
          isGoods: false,
        },
        {
          transactionId: 'TX010',
          customerCountryCode: 'FR',
          supplierCountryCode: 'BG',
          amountEUR: 200,
          amountLocal: 200,
          currency: 'EUR',
          vatRate: 20,
          vatAmount: 40,
          totalAmountEUR: 240,
          rateType: 'standard',
          isGoods: false,
        },
      ];

      const returnData = aggregator.aggregate(results);

      expect(returnData.sections.section2A.totalBase).toBe(300);
      expect(returnData.sections.section2A.totalVAT).toBe(59);
      expect(returnData.sections.section2A.totalSupplies).toBe(2);
    });

    it('should calculate grand totals correctly', () => {
      const results: VATCalculationResult[] = [
        {
          transactionId: 'TX011',
          customerCountryCode: 'DE',
          supplierCountryCode: 'BG',
          amountEUR: 100,
          amountLocal: 100,
          currency: 'EUR',
          vatRate: 19,
          vatAmount: 19,
          totalAmountEUR: 119,
          rateType: 'standard',
          isGoods: false,
        },
        {
          transactionId: 'TX012',
          customerCountryCode: 'FR',
          supplierCountryCode: 'BG',
          amountEUR: 200,
          amountLocal: 200,
          currency: 'EUR',
          vatRate: 20,
          vatAmount: 40,
          totalAmountEUR: 240,
          rateType: 'standard',
          isGoods: true,
        },
      ];

      const returnData = aggregator.aggregate(results);

      expect(returnData.totalBase).toBe(300);
      expect(returnData.totalVAT).toBe(59);
    });

    it('should sort items by member state code', () => {
      const results: VATCalculationResult[] = [
        {
          transactionId: 'TX013',
          customerCountryCode: 'ES',
          supplierCountryCode: 'BG',
          amountEUR: 100,
          amountLocal: 100,
          currency: 'EUR',
          vatRate: 21,
          vatAmount: 21,
          totalAmountEUR: 121,
          rateType: 'standard',
          isGoods: true,
        },
        {
          transactionId: 'TX014',
          customerCountryCode: 'DE',
          supplierCountryCode: 'BG',
          amountEUR: 100,
          amountLocal: 100,
          currency: 'EUR',
          vatRate: 19,
          vatAmount: 19,
          totalAmountEUR: 119,
          rateType: 'standard',
          isGoods: true,
        },
      ];

      const returnData = aggregator.aggregate(results);

      expect(returnData.sections.section2B.items[0].memberState).toBe('DE');
      expect(returnData.sections.section2B.items[1].memberState).toBe('ES');
    });
  });

  describe('Export formats', () => {
    it('should format return for human-readable submission', () => {
      const results: VATCalculationResult[] = [
        {
          transactionId: 'TX015',
          customerCountryCode: 'DE',
          supplierCountryCode: 'BG',
          amountEUR: 100,
          amountLocal: 100,
          currency: 'EUR',
          vatRate: 19,
          vatAmount: 19,
          totalAmountEUR: 119,
          rateType: 'standard',
          isGoods: false,
        },
      ];

      const returnData = aggregator.aggregate(results);
      const formatted = aggregator.formatForSubmission(returnData);

      expect(formatted).toContain('OSS VAT RETURN');
      expect(formatted).toContain('Q1 2026');
      expect(formatted).toContain('BG');
      expect(formatted).toContain('2A:');
      expect(formatted).toContain('DE');
    });

    it('should export return as JSON', () => {
      const results: VATCalculationResult[] = [
        {
          transactionId: 'TX016',
          customerCountryCode: 'DE',
          supplierCountryCode: 'BG',
          amountEUR: 100,
          amountLocal: 100,
          currency: 'EUR',
          vatRate: 19,
          vatAmount: 19,
          totalAmountEUR: 119,
          rateType: 'standard',
          isGoods: false,
        },
      ];

      const returnData = aggregator.aggregate(results);
      const json = aggregator.exportAsJSON(returnData);
      const parsed = JSON.parse(json);

      expect(parsed.quarter).toBe(1);
      expect(parsed.year).toBe(2026);
      expect(parsed.supplierCountryCode).toBe('BG');
      expect(parsed.sections).toBeDefined();
    });
  });

  describe('Rounding precision', () => {
    it('should round totals to EUR cents', () => {
      const results: VATCalculationResult[] = [
        {
          transactionId: 'TX017',
          customerCountryCode: 'DE',
          supplierCountryCode: 'BG',
          amountEUR: 33.33,
          amountLocal: 33.33,
          currency: 'EUR',
          vatRate: 19,
          vatAmount: 6.33, // Already rounded
          totalAmountEUR: 39.66,
          rateType: 'standard',
          isGoods: true,
        },
      ];

      const returnData = aggregator.aggregate(results);

      expect(returnData.sections.section2B.totalBase).toBe(33.33);
      expect(returnData.sections.section2B.totalVAT).toBe(6.33);
    });
  });
});
