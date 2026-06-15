import { describe, it, expect } from 'vitest';
import {
  EU_VAT_RATES,
  getMemberStateRates,
  getVATRate,
  verifyVATRate,
  getAllCountryCodes,
  isValidEUCountry,
} from './vat-rates';

describe('VAT Rates Module', () => {
  describe('EU_VAT_RATES table', () => {
    it('should contain all 27 EU Member States', () => {
      const codes = Object.keys(EU_VAT_RATES);
      expect(codes).toHaveLength(27);
    });

    it('should include Bulgaria (BG) as primary context', () => {
      expect(EU_VAT_RATES['BG']).toBeDefined();
      expect(EU_VAT_RATES['BG'].name).toBe('Bulgaria');
      expect(EU_VAT_RATES['BG'].standard[0].rate).toBe(20);
    });

    it('should have standard rate for every Member State', () => {
      for (const [code, ms] of Object.entries(EU_VAT_RATES)) {
        expect(ms.standard.length).toBeGreaterThan(0);
        expect(ms.standard[0].rate).toBeGreaterThan(0);
        expect(ms.standard[0].rate).toBeLessThanOrEqual(30);
      }
    });

    it('should include super-reduced rates for France, Ireland, Italy, Luxembourg, Spain', () => {
      const frSuperReduced = EU_VAT_RATES['FR'].superReduced;
      expect(frSuperReduced).toHaveLength(1);
      expect(frSuperReduced[0].rate).toBe(2.1);

      const ieSuperReduced = EU_VAT_RATES['IE'].superReduced;
      expect(ieSuperReduced[0].rate).toBe(4.8);

      const itSuperReduced = EU_VAT_RATES['IT'].superReduced;
      expect(itSuperReduced[0].rate).toBe(4);

      const luSuperReduced = EU_VAT_RATES['LU'].superReduced;
      expect(luSuperReduced[0].rate).toBe(3);

      const esSuperReduced = EU_VAT_RATES['ES'].superReduced;
      expect(esSuperReduced[0].rate).toBe(4);
    });

    it('should have no super-reduced rates for Denmark', () => {
      expect(EU_VAT_RATES['DK'].superReduced).toHaveLength(0);
    });
  });

  describe('getMemberStateRates()', () => {
    it('should return rates for valid country codes', () => {
      const at = getMemberStateRates('AT');
      expect(at).not.toBeNull();
      expect(at?.name).toBe('Austria');
      expect(at?.standard[0].rate).toBe(20);
    });

    it('should be case-insensitive', () => {
      const upper = getMemberStateRates('DE');
      const lower = getMemberStateRates('de');
      const mixed = getMemberStateRates('De');
      expect(upper).toEqual(lower);
      expect(lower).toEqual(mixed);
    });

    it('should return null for invalid country codes', () => {
      expect(getMemberStateRates('XX')).toBeNull();
      expect(getMemberStateRates('USA')).toBeNull();
      expect(getMemberStateRates('')).toBeNull();
    });

    it('should return null for undefined', () => {
      expect(getMemberStateRates(undefined as any)).toBeNull();
    });
  });

  describe('getVATRate()', () => {
    it('should return standard rate for Germany', () => {
      const rate = getVATRate('DE', 'standard', new Date());
      expect(rate?.rate).toBe(19);
    });

    it('should return reduced rate for Austria (10%)', () => {
      const rate = getVATRate('AT', 'reduced', new Date());
      expect(rate?.rate).toBe(10);
    });

    it('should return null for reduced rate that does not exist in country', () => {
      const rate = getVATRate('DK', 'reduced', new Date());
      expect(rate).toBeNull();
    });

    it('should return null for invalid country code', () => {
      const rate = getVATRate('XX', 'standard', new Date());
      expect(rate).toBeNull();
    });

    it('should return super-reduced rate for France', () => {
      const rate = getVATRate('FR', 'super-reduced', new Date());
      expect(rate?.rate).toBe(2.1);
    });

    it('should handle historical date lookups', () => {
      const pastDate = new Date('2020-01-15');
      const rate = getVATRate('BG', 'standard', pastDate);
      expect(rate?.rate).toBe(20); // Should still be effective
    });

    it('should include provenance (sourceUrl, legalBasis) on returned rates', () => {
      const rate = getVATRate('DE', 'standard', new Date());
      expect(rate).not.toBeNull();
      expect(typeof rate?.sourceUrl).toBe('string');
      expect(rate?.sourceUrl.length).toBeGreaterThan(0);
      expect(typeof rate?.legalBasis).toBe('string');
      expect(rate?.legalBasis.length).toBeGreaterThan(0);
    });

    describe('historical rate transitions (Refactor 1 verified seed)', () => {
      it('DE standard: 19% until 2020-06-30, 16% during COVID reduction, 19% from 2021-01-01', () => {
        expect(getVATRate('DE', 'standard', new Date('2020-06-30'))?.rate).toBe(19);
        expect(getVATRate('DE', 'standard', new Date('2020-07-01'))?.rate).toBe(16);
        expect(getVATRate('DE', 'standard', new Date('2020-12-31'))?.rate).toBe(16);
        expect(getVATRate('DE', 'standard', new Date('2021-01-01'))?.rate).toBe(19);
      });

      it('DE reduced: 7% until 2020-06-30, 5% during COVID reduction, 7% from 2021-01-01', () => {
        expect(getVATRate('DE', 'reduced', new Date('2020-06-30'))?.rate).toBe(7);
        expect(getVATRate('DE', 'reduced', new Date('2020-07-01'))?.rate).toBe(5);
        expect(getVATRate('DE', 'reduced', new Date('2020-12-31'))?.rate).toBe(5);
        expect(getVATRate('DE', 'reduced', new Date('2021-01-01'))?.rate).toBe(7);
      });

      it('BG standard: 20% since 1999-04-01, with no interval covering dates before that', () => {
        expect(getVATRate('BG', 'standard', new Date('1999-03-31'))).toBeNull();
        expect(getVATRate('BG', 'standard', new Date('1999-04-01'))?.rate).toBe(20);
        expect(getVATRate('BG', 'standard', new Date('2026-01-01'))?.rate).toBe(20);
      });

      it('BG reduced (books/periodicals): null before 2020-07-01, 9% from 2020-07-01', () => {
        expect(getVATRate('BG', 'reduced', new Date('2020-06-30'))).toBeNull();
        expect(getVATRate('BG', 'reduced', new Date('2020-07-01'))?.rate).toBe(9);
        expect(getVATRate('BG', 'reduced', new Date('2026-01-01'))?.rate).toBe(9);
      });

      it('FR standard: 20% since 2014-01-01, with no interval covering dates before that', () => {
        expect(getVATRate('FR', 'standard', new Date('2013-12-31'))).toBeNull();
        expect(getVATRate('FR', 'standard', new Date('2014-01-01'))?.rate).toBe(20);
      });

      it('NL standard: 21% since 2012-10-01, with no interval covering dates before that', () => {
        expect(getVATRate('NL', 'standard', new Date('2012-09-30'))).toBeNull();
        expect(getVATRate('NL', 'standard', new Date('2012-10-01'))?.rate).toBe(21);
      });

      it('NL reduced: 6% until 2018-12-31, 9% from 2019-01-01', () => {
        expect(getVATRate('NL', 'reduced', new Date('2018-12-31'))?.rate).toBe(6);
        expect(getVATRate('NL', 'reduced', new Date('2019-01-01'))?.rate).toBe(9);
      });

      it('AT reduced: 10%/13% pre-COVID, 5% temporary rate 2020-07-01..2021-12-31, 10%/13% restored from 2022-01-01', () => {
        const preCovid = getVATRate('AT', 'reduced', new Date('2020-06-30'));
        expect(preCovid?.rate).toBe(10);

        expect(getVATRate('AT', 'reduced', new Date('2020-07-01'))?.rate).toBe(5);
        expect(getVATRate('AT', 'reduced', new Date('2021-12-31'))?.rate).toBe(5);

        const restored = getVATRate('AT', 'reduced', new Date('2022-01-01'));
        expect(restored?.rate).toBe(10);
      });

      it('AT standard: 20% (long-standing, no end date)', () => {
        expect(getVATRate('AT', 'standard', new Date('2020-07-01'))?.rate).toBe(20);
        expect(getVATRate('AT', 'standard', new Date('2026-01-01'))?.rate).toBe(20);
      });
    });

    describe('historical rate transitions (Refactor 1b verified seed)', () => {
      it('RO standard: 19% until 2025-07-31, 21% from 2025-08-01', () => {
        expect(getVATRate('RO', 'standard', new Date('2025-07-31'))?.rate).toBe(19);
        expect(getVATRate('RO', 'standard', new Date('2025-08-01'))?.rate).toBe(21);
        expect(getVATRate('RO', 'standard', new Date('2026-01-01'))?.rate).toBe(21);
      });

      it('RO reduced: 5%/9% bands until 2025-07-31, consolidated to 11% from 2025-08-01', () => {
        expect(getVATRate('RO', 'reduced', new Date('2025-07-31'))?.rate).toBe(5);
        expect(getVATRate('RO', 'reduced', new Date('2025-08-01'))?.rate).toBe(11);
        expect(getVATRate('RO', 'reduced', new Date('2026-01-01'))?.rate).toBe(11);
      });

      it('FI reduced: 14% until 2025-12-31, 13.5% from 2026-01-01', () => {
        expect(getVATRate('FI', 'reduced', new Date('2025-12-31'))?.rate).toBe(14);
        expect(getVATRate('FI', 'reduced', new Date('2026-01-01'))?.rate).toBe(13.5);
      });

      it('EE standard: corrected to the EC-verified current rate of 24%', () => {
        expect(getVATRate('EE', 'standard', new Date('2026-01-01'))?.rate).toBe(24);
      });
    });
  });

  describe('verifyVATRate()', () => {
    it('should return true for correct rate', () => {
      const valid = verifyVATRate('DE', 'standard', 19, new Date());
      expect(valid).toBe(true);
    });

    it('should return false for incorrect rate', () => {
      const invalid = verifyVATRate('DE', 'standard', 20, new Date());
      expect(invalid).toBe(false);
    });

    it('should return false for non-existent rate type in country', () => {
      const invalid = verifyVATRate('DK', 'reduced', 0, new Date());
      expect(invalid).toBe(false);
    });
  });

  describe('getAllCountryCodes()', () => {
    it('should return 27 country codes', () => {
      const codes = getAllCountryCodes();
      expect(codes).toHaveLength(27);
    });

    it('should include all EU Member State codes', () => {
      const codes = getAllCountryCodes();
      const expected = [
        'AT',
        'BE',
        'BG',
        'HR',
        'CY',
        'CZ',
        'DE',
        'DK',
        'EE',
        'FI',
        'FR',
        'EL',
        'HU',
        'IE',
        'IT',
        'LV',
        'LT',
        'LU',
        'MT',
        'NL',
        'PL',
        'PT',
        'RO',
        'SK',
        'SI',
        'ES',
        'SE',
      ];
      for (const code of expected) {
        expect(codes).toContain(code);
      }
    });
  });

  describe('isValidEUCountry()', () => {
    it('should return true for valid EU country codes', () => {
      expect(isValidEUCountry('DE')).toBe(true);
      expect(isValidEUCountry('FR')).toBe(true);
      expect(isValidEUCountry('BG')).toBe(true);
    });

    it('should return false for invalid codes', () => {
      expect(isValidEUCountry('XX')).toBe(false);
      expect(isValidEUCountry('USA')).toBe(false);
      expect(isValidEUCountry('')).toBe(false);
    });

    it('should be case-insensitive', () => {
      expect(isValidEUCountry('de')).toBe(true);
      expect(isValidEUCountry('De')).toBe(true);
    });
  });

  describe('Rate accuracy per paper specification', () => {
    it('should match all rates from the provided table', () => {
      const testCases: Array<[string, 'standard' | 'reduced' | 'super-reduced', number]> = [
        ['AT', 'standard', 20],
        ['BE', 'standard', 21],
        ['BG', 'standard', 20],
        ['HR', 'standard', 25],
        ['CY', 'standard', 19],
        ['CZ', 'standard', 21],
        ['DK', 'standard', 25],
        ['EE', 'standard', 24],
        ['FI', 'standard', 25.5],
        ['FR', 'standard', 20],
        ['DE', 'standard', 19],
        ['EL', 'standard', 24],
        ['HU', 'standard', 27],
        ['IE', 'standard', 23],
        ['IT', 'standard', 22],
        ['LV', 'standard', 21],
        ['LT', 'standard', 21],
        ['LU', 'standard', 17],
        ['MT', 'standard', 18],
        ['NL', 'standard', 21],
        ['PL', 'standard', 23],
        ['PT', 'standard', 23],
        ['RO', 'standard', 21],
        ['SK', 'standard', 23],
        ['SI', 'standard', 22],
        ['ES', 'standard', 21],
        ['SE', 'standard', 25],
      ];

      const today = new Date();
      for (const [code, rateType, expectedRate] of testCases) {
        const rate = getVATRate(code, rateType, today);
        expect(rate?.rate).toBe(expectedRate);
      }
    });
  });
});
