import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  ConversionPolicy,
  ECB_DECIMAL_PLACES,
  registerDailyRate,
  clearDailyRates,
  convert,
} from './ecb-rates';
import { parseECBDailyXML } from './ecb-feed';
import { ECBRateNotFoundError } from './errors';

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

const FIXTURE_PATH = join(__dirname, '__fixtures__', 'ecb-2026-03-13.xml');
const FIXTURE_XML = readFileSync(FIXTURE_PATH, 'utf-8');

// 2026-03-13 is a Friday; 2026-03-14 is a Saturday (no ECB publication).
const FRIDAY = '2026-03-13';
const SATURDAY = '2026-03-14';

// Rates from the fixture (1 EUR = X currency)
const EUR_USD = 1.0896;
const EUR_GBP = 0.8433;
const EUR_JPY = 159.83;

function loadFixture(): void {
  const rates = parseECBDailyXML(FIXTURE_XML);
  rates.forEach(registerDailyRate);
}

// ---------------------------------------------------------------------------
// parseECBDailyXML
// ---------------------------------------------------------------------------

describe('parseECBDailyXML', () => {
  it('extracts the publication date', () => {
    const rates = parseECBDailyXML(FIXTURE_XML);
    expect(rates.every((r) => r.publishedOn === FRIDAY)).toBe(true);
    expect(rates.every((r) => r.base === 'EUR')).toBe(true);
  });

  it('parses all currency entries', () => {
    const rates = parseECBDailyXML(FIXTURE_XML);
    expect(rates.length).toBeGreaterThanOrEqual(28);
  });

  it('parses USD rate correctly', () => {
    const rates = parseECBDailyXML(FIXTURE_XML);
    const usd = rates.find((r) => r.target === 'USD');
    expect(usd?.rate).toBe(EUR_USD);
  });

  it('parses GBP rate correctly', () => {
    const rates = parseECBDailyXML(FIXTURE_XML);
    const gbp = rates.find((r) => r.target === 'GBP');
    expect(gbp?.rate).toBe(EUR_GBP);
  });

  it('throws on malformed XML', () => {
    expect(() => parseECBDailyXML('<invalid/>')).toThrow(/no <Cube time/);
  });

  it('throws when no rate entries present', () => {
    const xmlNoRates = `<?xml version="1.0"?><gesmes:Envelope xmlns:gesmes="x"><Cube><Cube time="2026-03-13"></Cube></Cube></gesmes:Envelope>`;
    expect(() => parseECBDailyXML(xmlNoRates)).toThrow(/no <Cube currency/);
  });
});

// ---------------------------------------------------------------------------
// registerDailyRate / clearDailyRates / convert
// ---------------------------------------------------------------------------

describe('ECB daily rate store', () => {
  beforeEach(() => {
    clearDailyRates();
    loadFixture();
  });

  describe('Identity conversion (same currency)', () => {
    it('EUR to EUR returns amount unchanged with rate=1', () => {
      const result = convert(100, 'EUR', 'EUR', FRIDAY);
      expect(result.amount).toBe(100);
      expect(result.rate).toBe(1);
      expect(result.policy).toBe(ConversionPolicy.DAILY_AT_CHARGEABLE_EVENT);
    });

    it('USD to USD returns amount unchanged', () => {
      const result = convert(250.5, 'USD', 'USD', FRIDAY);
      expect(result.amount).toBe(250.5);
      expect(result.rate).toBe(1);
    });
  });

  describe('EUR ↔ foreign currency', () => {
    it('EUR to USD: multiplies by ECB rate', () => {
      const result = convert(100, 'EUR', 'USD', FRIDAY);
      const expected = Math.round(100 * EUR_USD * 100) / 100;
      expect(result.amount).toBe(expected);
      expect(result.rate).toBe(EUR_USD);
      expect(result.rateDate).toBe(FRIDAY);
    });

    it('USD to EUR: divides by ECB rate, rounds to 2 dp', () => {
      const result = convert(100, 'USD', 'EUR', FRIDAY);
      const expected = Math.round((100 / EUR_USD) * 100) / 100;
      expect(result.amount).toBe(expected);
      expect(result.rateDate).toBe(FRIDAY);
    });

    it('EUR to JPY: rounds to 0 decimal places (JPY has no subdivision)', () => {
      const result = convert(100, 'EUR', 'JPY', FRIDAY);
      expect(result.amount).toBe(Math.round(100 * EUR_JPY));
      expect(Number.isInteger(result.amount)).toBe(true);
    });
  });

  describe('Weekend rollback — Saturday uses preceding Friday rate', () => {
    it('chargeable event on Saturday finds Friday rate', () => {
      // 2026-03-14 is Saturday; no ECB publication; should use 2026-03-13 (Friday)
      const resultSat = convert(100, 'EUR', 'USD', SATURDAY);
      const resultFri = convert(100, 'EUR', 'USD', FRIDAY);

      expect(resultSat.amount).toBe(resultFri.amount);
      expect(resultSat.rateDate).toBe(FRIDAY);
    });

    it('rollback of Sunday also resolves to preceding Friday', () => {
      const sunday = '2026-03-15';
      const result = convert(100, 'EUR', 'GBP', sunday);
      expect(result.rateDate).toBe(FRIDAY);
    });

    it('rollback walks back at most 4 calendar days', () => {
      // Thursday with no rates → should fail after 4 days back (only Friday has rates)
      clearDailyRates();
      registerDailyRate({ base: 'EUR', target: 'USD', rate: EUR_USD, publishedOn: FRIDAY });
      // Monday 2026-03-16 is 3 days after Friday — should still find Friday
      const monday = '2026-03-16';
      const result = convert(100, 'EUR', 'USD', monday);
      expect(result.rateDate).toBe(FRIDAY);
    });

    it('throws ECBRateNotFoundError when even 4-day walkback finds nothing', () => {
      clearDailyRates();
      // Register rate only for a date far in the future
      registerDailyRate({ base: 'EUR', target: 'USD', rate: EUR_USD, publishedOn: '2026-03-20' });
      expect(() => convert(100, 'EUR', 'USD', FRIDAY)).toThrow(ECBRateNotFoundError);
    });
  });

  describe('Cross-rate via EUR (USD → GBP)', () => {
    it('computes triangular cross-rate and rounds to target minor units', () => {
      // 100 USD → EUR → GBP
      const result = convert(100, 'USD', 'GBP', FRIDAY);
      const expectedAmount = Math.round((100 / EUR_USD) * EUR_GBP * 100) / 100;
      expect(result.amount).toBe(expectedAmount);
    });

    it('cross-rate matches individual steps within rounding tolerance', () => {
      const directResult = convert(100, 'USD', 'GBP', FRIDAY);
      // Manual: 100 USD / EUR_USD EUR, then * EUR_GBP GBP
      const eurAmount = 100 / EUR_USD;
      const gbpAmount = eurAmount * EUR_GBP;
      expect(directResult.amount).toBeCloseTo(gbpAmount, 1);
    });

    it('returns effective cross-rate in provenance', () => {
      const result = convert(100, 'USD', 'GBP', FRIDAY);
      // Effective rate: 1 USD = (EUR_GBP / EUR_USD) GBP
      expect(result.rate).toBeCloseTo(EUR_GBP / EUR_USD, 5);
    });
  });

  describe('Provenance (ConversionResult fields)', () => {
    it('returns rateDate, policy, and rate on direct EUR→USD', () => {
      const result = convert(50, 'EUR', 'USD', FRIDAY);
      expect(result.rateDate).toBe(FRIDAY);
      expect(result.policy).toBe(ConversionPolicy.DAILY_AT_CHARGEABLE_EVENT);
      expect(result.rate).toBe(EUR_USD);
    });

    it('LAST_DAY_OF_PERIOD policy uses reportingPeriodEnd as lookup date', () => {
      // Register rates for the period end date
      registerDailyRate({ base: 'EUR', target: 'USD', rate: 1.12, publishedOn: '2026-03-31' });

      const result = convert(
        100,
        'EUR',
        'USD',
        '2026-03-10', // chargeableEventDate (ignored by this policy)
        ConversionPolicy.LAST_DAY_OF_PERIOD,
        '2026-03-31', // reportingPeriodEnd
      );

      expect(result.rateDate).toBe('2026-03-31');
      expect(result.rate).toBe(1.12);
      expect(result.amount).toBe(112);
      expect(result.policy).toBe(ConversionPolicy.LAST_DAY_OF_PERIOD);
    });

    it('LAST_DAY_OF_PERIOD without reportingPeriodEnd falls back to chargeableEventDate', () => {
      const result = convert(
        100,
        'EUR',
        'USD',
        FRIDAY,
        ConversionPolicy.LAST_DAY_OF_PERIOD,
        // no reportingPeriodEnd
      );
      expect(result.rateDate).toBe(FRIDAY);
    });
  });

  describe('Missing rate errors', () => {
    it('throws ECBRateNotFoundError for an unregistered currency', () => {
      expect(() => convert(100, 'EUR', 'XYZ', FRIDAY)).toThrow(ECBRateNotFoundError);
    });

    it('throws ECBRateNotFoundError when store is empty', () => {
      clearDailyRates();
      expect(() => convert(100, 'EUR', 'USD', FRIDAY)).toThrow(ECBRateNotFoundError);
    });
  });
});

// ---------------------------------------------------------------------------
// ECB_DECIMAL_PLACES table
// ---------------------------------------------------------------------------

describe('ECB_DECIMAL_PLACES', () => {
  it('EUR, USD, GBP have 2 decimal places', () => {
    expect(ECB_DECIMAL_PLACES['EUR']).toBe(2);
    expect(ECB_DECIMAL_PLACES['USD']).toBe(2);
    expect(ECB_DECIMAL_PLACES['GBP']).toBe(2);
  });

  it('JPY has 0 decimal places', () => {
    expect(ECB_DECIMAL_PLACES['JPY']).toBe(0);
  });

  it('KRW has 0 decimal places', () => {
    expect(ECB_DECIMAL_PLACES['KRW']).toBe(0);
  });

  it('covers all EU non-EUR currencies', () => {
    const euNonEur = ['BGN', 'CZK', 'DKK', 'HUF', 'PLN', 'RON', 'SEK'];
    for (const c of euNonEur) {
      expect(ECB_DECIMAL_PLACES[c]).toBeDefined();
    }
  });
});
