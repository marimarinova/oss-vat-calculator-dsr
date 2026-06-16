import { describe, it, expect, beforeEach } from 'vitest';
import { TaxEngine, Transaction, VATCalculationResult } from './tax-engine';
import { MissingCountryCodeError, RateMismatchError, ECBRateNotFoundError } from './errors';
import { registerDailyRate, clearDailyRates } from './ecb-rates';

// EUR/USD = 1.09 → 1 USD = 1/1.09 ≈ 0.9174 EUR
const TEST_EUR_USD = 1.09;
const TEST_DATE = '2026-01-15'; // Wednesday — ECB publishing day

describe('Tax Engine', () => {
  let engine: TaxEngine;

  beforeEach(() => {
    clearDailyRates();
    // Register a USD rate for tests that need currency conversion
    registerDailyRate({ base: 'EUR', target: 'USD', rate: TEST_EUR_USD, publishedOn: TEST_DATE });
    engine = new TaxEngine();
  });

  describe('Single VAT calculation', () => {
    it('should calculate VAT for EUR transaction', () => {
      const transaction: Transaction = {
        id: 'TX001',
        date: new Date('2026-01-15'),
        customerCountryCode: 'DE',
        amount: 100,
        currency: 'EUR',
        rateType: 'standard',
        isGoods: true,
      };

      const result = engine.calculateVAT(transaction);

      expect(result.transactionId).toBe('TX001');
      expect(result.customerCountryCode).toBe('DE');
      expect(result.amountEUR).toBe(100);
      expect(result.vatRate).toBe(19);
      expect(result.vatAmount).toBe(19);
      expect(result.totalAmountEUR).toBe(119);
    });

    it('should apply destination country VAT rate', () => {
      const transaction: Transaction = {
        id: 'TX002',
        date: new Date('2026-01-15'),
        customerCountryCode: 'FR',
        amount: 100,
        currency: 'EUR',
        rateType: 'standard',
        isGoods: false,
      };

      const result = engine.calculateVAT(transaction);

      expect(result.vatRate).toBe(20);
      expect(result.vatAmount).toBe(20);
    });

    it('should use reduced VAT rate when specified', () => {
      const transaction: Transaction = {
        id: 'TX003',
        date: new Date('2026-01-15'),
        customerCountryCode: 'DE',
        amount: 100,
        currency: 'EUR',
        rateType: 'reduced',
        isGoods: true,
      };

      const result = engine.calculateVAT(transaction);

      expect(result.vatRate).toBe(7);
      expect(result.vatAmount).toBe(7);
    });

    it('should use super-reduced VAT rate when specified', () => {
      const transaction: Transaction = {
        id: 'TX004',
        date: new Date('2026-01-15'),
        customerCountryCode: 'FR',
        amount: 100,
        currency: 'EUR',
        rateType: 'super-reduced',
        isGoods: true,
      };

      const result = engine.calculateVAT(transaction);

      expect(result.vatRate).toBe(2.1);
      expect(result.vatAmount).toBeCloseTo(2.1, 2);
    });

    it('should round VAT to EUR cents (2 decimal places)', () => {
      const transaction: Transaction = {
        id: 'TX005',
        date: new Date('2026-01-15'),
        customerCountryCode: 'DE',
        amount: 33.33,
        currency: 'EUR',
        rateType: 'standard',
        isGoods: true,
      };

      const result = engine.calculateVAT(transaction);

      // 33.33 * 19% = 6.3327, rounds to 6.33
      expect(result.vatAmount).toBe(6.33);
    });
  });

  describe('Error handling', () => {
    it('should throw MissingCountryCodeError for invalid country code', () => {
      const transaction: Transaction = {
        id: 'TX006',
        date: new Date('2026-01-15'),
        customerCountryCode: 'XX',
        amount: 100,
        currency: 'EUR',
        rateType: 'standard',
        isGoods: true,
      };

      expect(() => engine.calculateVAT(transaction)).toThrow(MissingCountryCodeError);
    });

    it('should throw MissingCountryCodeError for empty country code', () => {
      const transaction: Transaction = {
        id: 'TX007',
        date: new Date('2026-01-15'),
        customerCountryCode: '',
        amount: 100,
        currency: 'EUR',
        rateType: 'standard',
        isGoods: true,
      };

      expect(() => engine.calculateVAT(transaction)).toThrow(MissingCountryCodeError);
    });

    it('should throw error when rate type does not exist in country', () => {
      const transaction: Transaction = {
        id: 'TX008',
        date: new Date('2026-01-15'),
        customerCountryCode: 'DK',
        amount: 100,
        currency: 'EUR',
        rateType: 'reduced',
        isGoods: true,
      };

      expect(() => engine.calculateVAT(transaction)).toThrow(RateMismatchError);
    });
  });

  describe('Currency conversion', () => {
    it('should convert USD to EUR using daily ECB rate', () => {
      const transaction: Transaction = {
        id: 'TX009',
        date: new Date('2026-01-15'),
        customerCountryCode: 'DE',
        amount: 100,
        currency: 'USD',
        rateType: 'standard',
        isGoods: true,
        supplierCountryCode: 'BG',
      };

      const result = engine.calculateVAT(transaction);

      // 100 USD / 1.09 ≈ 91.74 EUR
      expect(result.amountEUR).toBeCloseTo(91.74, 1);
      expect(result.currency).toBe('USD');
      expect(result.amountLocal).toBe(100);
      expect(result.vatRate).toBe(19);
    });

    it('should throw ECBRateNotFoundError when no rate is registered for the currency', () => {
      clearDailyRates(); // remove all rates including USD

      const transaction: Transaction = {
        id: 'TX010',
        date: new Date('2026-01-15'),
        customerCountryCode: 'DE',
        amount: 100,
        currency: 'USD',
        rateType: 'standard',
        isGoods: true,
      };

      expect(() => engine.calculateVAT(transaction)).toThrow(ECBRateNotFoundError);
    });
  });

  describe('Batch calculations', () => {
    it('should calculate VAT for multiple transactions', () => {
      const transactions: Transaction[] = [
        {
          id: 'TX011',
          date: new Date('2026-01-15'),
          customerCountryCode: 'DE',
          amount: 100,
          currency: 'EUR',
          rateType: 'standard',
          isGoods: true,
        },
        {
          id: 'TX012',
          date: new Date('2026-01-15'),
          customerCountryCode: 'FR',
          amount: 200,
          currency: 'EUR',
          rateType: 'standard',
          isGoods: false,
        },
      ];

      const results = engine.calculateBatch(transactions);

      expect(results).toHaveLength(2);
      expect(results[0].vatAmount).toBe(19);
      expect(results[1].vatAmount).toBe(40);
    });

    it('should maintain transaction order in batch results', () => {
      const transactions: Transaction[] = [
        {
          id: 'TX013',
          date: new Date('2026-01-15'),
          customerCountryCode: 'DE',
          amount: 100,
          currency: 'EUR',
          rateType: 'standard',
          isGoods: true,
        },
        {
          id: 'TX014',
          date: new Date('2026-01-15'),
          customerCountryCode: 'FR',
          amount: 200,
          currency: 'EUR',
          rateType: 'standard',
          isGoods: false,
        },
        {
          id: 'TX015',
          date: new Date('2026-01-15'),
          customerCountryCode: 'IT',
          amount: 300,
          currency: 'EUR',
          rateType: 'standard',
          isGoods: true,
        },
      ];

      const results = engine.calculateBatch(transactions);

      expect(results[0].transactionId).toBe('TX013');
      expect(results[1].transactionId).toBe('TX014');
      expect(results[2].transactionId).toBe('TX015');
    });
  });

  describe('Country rate information', () => {
    it('should provide rate information for a country', () => {
      const info = engine.getCountryRateInfo('DE');

      expect(info).not.toBeNull();
      expect(info?.standard).toBe(19);
      expect(info?.reduced).toContain(7);
      expect(info?.superReduced).toHaveLength(0);
    });

    it('should return null for invalid country', () => {
      const info = engine.getCountryRateInfo('XX');
      expect(info).toBeNull();
    });

    it('should include super-reduced rates where applicable', () => {
      const info = engine.getCountryRateInfo('FR');
      expect(info?.superReduced).toContain(2.1);
    });
  });

  describe('Deterministic calculation', () => {
    it('should produce consistent results for same input', () => {
      const transaction: Transaction = {
        id: 'TX016',
        date: new Date('2026-01-15'),
        customerCountryCode: 'DE',
        amount: 123.45,
        currency: 'EUR',
        rateType: 'standard',
        isGoods: true,
      };

      const result1 = engine.calculateVAT(transaction);
      const result2 = engine.calculateVAT(transaction);

      expect(result1).toEqual(result2);
    });

    it('should be transparent about rate sources', () => {
      const transaction: Transaction = {
        id: 'TX017',
        date: new Date('2026-01-15'),
        customerCountryCode: 'BG',
        amount: 100,
        currency: 'EUR',
        rateType: 'standard',
        isGoods: true,
        supplierCountryCode: 'BG',
      };

      const result = engine.calculateVAT(transaction);

      expect(result.vatRate).toBe(20);
      expect(result.customerCountryCode).toBe('BG');
    });
  });
});
