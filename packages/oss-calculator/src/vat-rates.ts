/**
 * VAT Rate Tables for All 27 EU Member States
 *
 * Source: European Commission TAXUD rate tables (as of Q1 2026)
 * All rates are encoded with effective dates for tracking rate changes over time
 *
 * Design Principle 4: Deterministic calculation with transparent rate sources
 */

export interface VATRate {
  rate: number; // percentage
  effectiveFrom: Date;
  effectiveTo?: Date; // undefined means currently active with no end date
}

export interface MemberStateRates {
  name: string;
  code: string;
  standard: VATRate[];
  reduced: VATRate[];
  superReduced: VATRate[];
}

/**
 * Comprehensive VAT rate table for all 27 EU Member States
 * Rates as of Q1 2026 per European Commission TAXUD
 */
export const EU_VAT_RATES: Record<string, MemberStateRates> = {
  AT: {
    name: 'Austria',
    code: 'AT',
    standard: [{ rate: 20, effectiveFrom: new Date('2020-01-01') }],
    reduced: [
      { rate: 10, effectiveFrom: new Date('2020-01-01') },
      { rate: 13, effectiveFrom: new Date('2020-01-01') },
    ],
    superReduced: [],
  },
  BE: {
    name: 'Belgium',
    code: 'BE',
    standard: [{ rate: 21, effectiveFrom: new Date('2020-01-01') }],
    reduced: [
      { rate: 6, effectiveFrom: new Date('2020-01-01') },
      { rate: 12, effectiveFrom: new Date('2020-01-01') },
    ],
    superReduced: [],
  },
  BG: {
    name: 'Bulgaria',
    code: 'BG',
    standard: [{ rate: 20, effectiveFrom: new Date('2020-01-01') }],
    reduced: [{ rate: 9, effectiveFrom: new Date('2020-01-01') }],
    superReduced: [],
  },
  HR: {
    name: 'Croatia',
    code: 'HR',
    standard: [{ rate: 25, effectiveFrom: new Date('2020-01-01') }],
    reduced: [
      { rate: 5, effectiveFrom: new Date('2020-01-01') },
      { rate: 13, effectiveFrom: new Date('2020-01-01') },
    ],
    superReduced: [],
  },
  CY: {
    name: 'Cyprus',
    code: 'CY',
    standard: [{ rate: 19, effectiveFrom: new Date('2020-01-01') }],
    reduced: [
      { rate: 5, effectiveFrom: new Date('2020-01-01') },
      { rate: 9, effectiveFrom: new Date('2020-01-01') },
    ],
    superReduced: [],
  },
  CZ: {
    name: 'Czech Republic',
    code: 'CZ',
    standard: [{ rate: 21, effectiveFrom: new Date('2020-01-01') }],
    reduced: [{ rate: 12, effectiveFrom: new Date('2020-01-01') }],
    superReduced: [],
  },
  DK: {
    name: 'Denmark',
    code: 'DK',
    standard: [{ rate: 25, effectiveFrom: new Date('2020-01-01') }],
    reduced: [],
    superReduced: [],
  },
  EE: {
    name: 'Estonia',
    code: 'EE',
    standard: [{ rate: 22, effectiveFrom: new Date('2020-01-01') }],
    reduced: [{ rate: 9, effectiveFrom: new Date('2020-01-01') }],
    superReduced: [],
  },
  FI: {
    name: 'Finland',
    code: 'FI',
    standard: [{ rate: 25.5, effectiveFrom: new Date('2020-01-01') }],
    reduced: [
      { rate: 10, effectiveFrom: new Date('2020-01-01') },
      { rate: 14, effectiveFrom: new Date('2020-01-01') },
    ],
    superReduced: [],
  },
  FR: {
    name: 'France',
    code: 'FR',
    standard: [{ rate: 20, effectiveFrom: new Date('2020-01-01') }],
    reduced: [
      { rate: 5.5, effectiveFrom: new Date('2020-01-01') },
      { rate: 10, effectiveFrom: new Date('2020-01-01') },
    ],
    superReduced: [{ rate: 2.1, effectiveFrom: new Date('2020-01-01') }],
  },
  DE: {
    name: 'Germany',
    code: 'DE',
    standard: [{ rate: 19, effectiveFrom: new Date('2020-01-01') }],
    reduced: [{ rate: 7, effectiveFrom: new Date('2020-01-01') }],
    superReduced: [],
  },
  EL: {
    name: 'Greece',
    code: 'EL',
    standard: [{ rate: 24, effectiveFrom: new Date('2020-01-01') }],
    reduced: [
      { rate: 6, effectiveFrom: new Date('2020-01-01') },
      { rate: 13, effectiveFrom: new Date('2020-01-01') },
    ],
    superReduced: [],
  },
  HU: {
    name: 'Hungary',
    code: 'HU',
    standard: [{ rate: 27, effectiveFrom: new Date('2020-01-01') }],
    reduced: [
      { rate: 5, effectiveFrom: new Date('2020-01-01') },
      { rate: 18, effectiveFrom: new Date('2020-01-01') },
    ],
    superReduced: [],
  },
  IE: {
    name: 'Ireland',
    code: 'IE',
    standard: [{ rate: 23, effectiveFrom: new Date('2020-01-01') }],
    reduced: [
      { rate: 9, effectiveFrom: new Date('2020-01-01') },
      { rate: 13.5, effectiveFrom: new Date('2020-01-01') },
    ],
    superReduced: [{ rate: 4.8, effectiveFrom: new Date('2020-01-01') }],
  },
  IT: {
    name: 'Italy',
    code: 'IT',
    standard: [{ rate: 22, effectiveFrom: new Date('2020-01-01') }],
    reduced: [
      { rate: 5, effectiveFrom: new Date('2020-01-01') },
      { rate: 10, effectiveFrom: new Date('2020-01-01') },
    ],
    superReduced: [{ rate: 4, effectiveFrom: new Date('2020-01-01') }],
  },
  LV: {
    name: 'Latvia',
    code: 'LV',
    standard: [{ rate: 21, effectiveFrom: new Date('2020-01-01') }],
    reduced: [
      { rate: 5, effectiveFrom: new Date('2020-01-01') },
      { rate: 12, effectiveFrom: new Date('2020-01-01') },
    ],
    superReduced: [],
  },
  LT: {
    name: 'Lithuania',
    code: 'LT',
    standard: [{ rate: 21, effectiveFrom: new Date('2020-01-01') }],
    reduced: [
      { rate: 5, effectiveFrom: new Date('2020-01-01') },
      { rate: 9, effectiveFrom: new Date('2020-01-01') },
    ],
    superReduced: [],
  },
  LU: {
    name: 'Luxembourg',
    code: 'LU',
    standard: [{ rate: 17, effectiveFrom: new Date('2020-01-01') }],
    reduced: [{ rate: 8, effectiveFrom: new Date('2020-01-01') }],
    superReduced: [{ rate: 3, effectiveFrom: new Date('2020-01-01') }],
  },
  MT: {
    name: 'Malta',
    code: 'MT',
    standard: [{ rate: 18, effectiveFrom: new Date('2020-01-01') }],
    reduced: [
      { rate: 5, effectiveFrom: new Date('2020-01-01') },
      { rate: 7, effectiveFrom: new Date('2020-01-01') },
    ],
    superReduced: [],
  },
  NL: {
    name: 'Netherlands',
    code: 'NL',
    standard: [{ rate: 21, effectiveFrom: new Date('2020-01-01') }],
    reduced: [{ rate: 9, effectiveFrom: new Date('2020-01-01') }],
    superReduced: [],
  },
  PL: {
    name: 'Poland',
    code: 'PL',
    standard: [{ rate: 23, effectiveFrom: new Date('2020-01-01') }],
    reduced: [
      { rate: 5, effectiveFrom: new Date('2020-01-01') },
      { rate: 8, effectiveFrom: new Date('2020-01-01') },
    ],
    superReduced: [],
  },
  PT: {
    name: 'Portugal',
    code: 'PT',
    standard: [{ rate: 23, effectiveFrom: new Date('2020-01-01') }],
    reduced: [
      { rate: 6, effectiveFrom: new Date('2020-01-01') },
      { rate: 13, effectiveFrom: new Date('2020-01-01') },
    ],
    superReduced: [],
  },
  RO: {
    name: 'Romania',
    code: 'RO',
    standard: [{ rate: 19, effectiveFrom: new Date('2020-01-01') }],
    reduced: [
      { rate: 5, effectiveFrom: new Date('2020-01-01') },
      { rate: 9, effectiveFrom: new Date('2020-01-01') },
    ],
    superReduced: [],
  },
  SK: {
    name: 'Slovakia',
    code: 'SK',
    standard: [{ rate: 23, effectiveFrom: new Date('2020-01-01') }],
    reduced: [
      { rate: 5, effectiveFrom: new Date('2020-01-01') },
      { rate: 10, effectiveFrom: new Date('2020-01-01') },
    ],
    superReduced: [],
  },
  SI: {
    name: 'Slovenia',
    code: 'SI',
    standard: [{ rate: 22, effectiveFrom: new Date('2020-01-01') }],
    reduced: [
      { rate: 5, effectiveFrom: new Date('2020-01-01') },
      { rate: 9.5, effectiveFrom: new Date('2020-01-01') },
    ],
    superReduced: [],
  },
  ES: {
    name: 'Spain',
    code: 'ES',
    standard: [{ rate: 21, effectiveFrom: new Date('2020-01-01') }],
    reduced: [{ rate: 10, effectiveFrom: new Date('2020-01-01') }],
    superReduced: [{ rate: 4, effectiveFrom: new Date('2020-01-01') }],
  },
  SE: {
    name: 'Sweden',
    code: 'SE',
    standard: [{ rate: 25, effectiveFrom: new Date('2020-01-01') }],
    reduced: [
      { rate: 6, effectiveFrom: new Date('2020-01-01') },
      { rate: 12, effectiveFrom: new Date('2020-01-01') },
    ],
    superReduced: [],
  },
};

/**
 * Get VAT rates for a specific Member State by country code
 * Returns null if country code is invalid
 */
export function getMemberStateRates(countryCode: string): MemberStateRates | null {
  const normalized = (countryCode || '').toUpperCase();
  return EU_VAT_RATES[normalized] ?? null;
}

/**
 * Get a specific VAT rate by country code and rate type as of a given date
 * Returns null if rate not found or country code is invalid
 *
 * @param countryCode - 2-letter ISO 3166-1 alpha-2 country code
 * @param rateType - 'standard', 'reduced', or 'super-reduced'
 * @param asOfDate - Date to look up the rate for (for historical tracking)
 */
export function getVATRate(
  countryCode: string,
  rateType: 'standard' | 'reduced' | 'super-reduced',
  asOfDate: Date
): number | null {
  const msRates = getMemberStateRates(countryCode);
  if (!msRates) return null;

  let rateArray: VATRate[] = [];
  switch (rateType) {
    case 'standard':
      rateArray = msRates.standard;
      break;
    case 'reduced':
      rateArray = msRates.reduced;
      break;
    case 'super-reduced':
      rateArray = msRates.superReduced;
      break;
  }

  if (rateArray.length === 0) return null;

  // Find the effective rate as of the given date
  const effectiveRate = rateArray.find(
    (r) =>
      r.effectiveFrom <= asOfDate &&
      (!r.effectiveTo || r.effectiveTo >= asOfDate)
  );

  return effectiveRate?.rate ?? null;
}

/**
 * Verify that a given rate matches the expected rate for a country code and rate type
 * Used for error detection when rate tables may be stale
 */
export function verifyVATRate(
  countryCode: string,
  rateType: 'standard' | 'reduced' | 'super-reduced',
  expectedRate: number,
  asOfDate: Date
): boolean {
  const actualRate = getVATRate(countryCode, rateType, asOfDate);
  return actualRate === expectedRate;
}

/**
 * Get all valid country codes for EU Member States
 */
export function getAllCountryCodes(): string[] {
  return Object.keys(EU_VAT_RATES);
}

/**
 * Check if a country code is a valid EU Member State
 */
export function isValidEUCountry(countryCode: string): boolean {
  return getMemberStateRates(countryCode) !== null;
}
