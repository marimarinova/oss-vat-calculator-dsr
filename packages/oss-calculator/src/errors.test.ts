import { describe, it, expect } from 'vitest';
import {
  VATCalculationError,
  MissingCountryCodeError,
  RateMismatchError,
  CurrencyRoundingError,
  InvalidVATRateError,
  ECBRateNotFoundError,
} from './errors';

describe('Error Classes', () => {
  describe('VATCalculationError', () => {
    it('should create error with message, code, and context', () => {
      const error = new VATCalculationError('Test error', 'TEST_CODE', { detail: 'test' });

      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_CODE');
      expect(error.context).toEqual({ detail: 'test' });
      expect(error.name).toBe('VATCalculationError');
    });

    it('should be instanceof Error', () => {
      const error = new VATCalculationError('Test', 'TEST', {});
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('MissingCountryCodeError', () => {
    it('should create error for invalid country code', () => {
      const error = new MissingCountryCodeError('XX', 'TX001');

      expect(error.code).toBe('MISSING_COUNTRY_CODE');
      expect(error.message).toContain('Missing or invalid country code');
      expect(error.message).toContain('XX');
      expect(error.message).toContain('TX001');
      expect(error.context).toEqual({ countryCode: 'XX', transactionId: 'TX001' });
    });

    it('should handle undefined country code', () => {
      const error = new MissingCountryCodeError(undefined, 'TX002');

      expect(error.code).toBe('MISSING_COUNTRY_CODE');
      expect(error.message).toContain('UNDEFINED');
    });
  });

  describe('RateMismatchError', () => {
    it('should create error for rate mismatch', () => {
      const date = new Date('2026-01-15');
      const error = new RateMismatchError('DE', 'standard', 19, 20, date);

      expect(error.code).toBe('RATE_MISMATCH');
      expect(error.message).toContain('DE');
      expect(error.message).toContain('standard');
      expect(error.message).toContain('19');
      expect(error.message).toContain('20');
      expect(error.context).toEqual({
        countryCode: 'DE',
        rateType: 'standard',
        expectedRate: 19,
        actualRate: 20,
        effectiveDate: date,
      });
    });
  });

  describe('CurrencyRoundingError', () => {
    it('should create error for rounding divergence', () => {
      const error = new CurrencyRoundingError(100, 2, 3, 2, 'EUR');

      expect(error.code).toBe('CURRENCY_ROUNDING_DIVERGENCE');
      expect(error.message).toContain('EUR');
      expect(error.message).toContain('decimal place');
      expect(error.context).toEqual({
        originalAmount: 100,
        sourceDecimalPlaces: 2,
        targetDecimalPlaces: 3,
        ecbConventionPlaces: 2,
        currency: 'EUR',
      });
    });
  });

  describe('InvalidVATRateError', () => {
    it('should create error for invalid rate', () => {
      const error = new InvalidVATRateError(-5);

      expect(error.code).toBe('INVALID_VAT_RATE');
      expect(error.message).toContain('-5');
      expect(error.context).toEqual({ rate: -5 });
    });

    it('should handle excessive rate', () => {
      const error = new InvalidVATRateError(150);

      expect(error.code).toBe('INVALID_VAT_RATE');
      expect(error.message).toContain('150');
    });
  });

  describe('ECBRateNotFoundError', () => {
    it('should create error for missing exchange rate', () => {
      const date = new Date('2026-01-15');
      const error = new ECBRateNotFoundError('EUR', 'USD', date);

      expect(error.code).toBe('ECB_RATE_NOT_FOUND');
      expect(error.message).toContain('EUR');
      expect(error.message).toContain('USD');
      expect(error.context).toEqual({
        sourceCurrency: 'EUR',
        targetCurrency: 'USD',
        date,
      });
    });
  });

  describe('Three error scenarios from design specification', () => {
    it('Scenario 1: Missing country codes in buyer addresses', () => {
      const error = new MissingCountryCodeError('', 'TXID123');

      expect(error.code).toBe('MISSING_COUNTRY_CODE');
      expect(error instanceof VATCalculationError).toBe(true);
    });

    it('Scenario 2: Rate mismatches from stale table versions', () => {
      const error = new RateMismatchError(
        'DE',
        'standard',
        19,
        18, // Outdated rate
        new Date('2026-01-15'),
      );

      expect(error.code).toBe('RATE_MISMATCH');
      expect(error.context?.expectedRate).toBe(19);
      expect(error.context?.actualRate).toBe(18);
    });

    it('Scenario 3: Currency conversion rounding divergence', () => {
      const error = new CurrencyRoundingError(
        100.456,
        3, // Source has 3 decimal places
        2, // Target has 2 decimal places
        2, // ECB convention is 2
        'EUR',
      );

      expect(error.code).toBe('CURRENCY_ROUNDING_DIVERGENCE');
      expect(error.context?.targetDecimalPlaces).toBe(2);
      expect(error.context?.ecbConventionPlaces).toBe(2);
    });
  });
});
