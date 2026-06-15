/**
 * VAT Rate Tables for All 27 EU Member States
 *
 * Source: European Commission TAXUD rate tables (as of Q1 2026), extended
 * in Refactor 1 with verified historical rate transitions and provenance
 * for 5 Member States (BG, DE, FR, NL, AT), and in Refactor 1b with an
 * EC-verified pass over all 27 current standard rates plus 2025-2026
 * transitions for RO, FI, EE (and category-specific caveats for NL, DE,
 * LT) - see ./data/eu-vat-history.seed.ts for the full table and sourcing
 * notes.
 *
 * Design Principle 4: Deterministic calculation with transparent rate sources
 */

import { EU_VAT_RATE_HISTORY } from './data/eu-vat-history.seed';

export interface VATRate {
  rate: number; // percentage
  effectiveFrom: Date;
  effectiveTo?: Date; // undefined means currently active with no end date
  sourceUrl: string; // provenance: source citation for this rate/interval
  legalBasis: string; // provenance: human-readable description of the rate and its legal/source basis
}

export interface MemberStateRates {
  name: string;
  code: string;
  standard: VATRate[];
  reduced: VATRate[];
  superReduced: VATRate[];
}

/**
 * Comprehensive VAT rate table for all 27 EU Member States.
 * See ./data/eu-vat-history.seed.ts for the underlying data and provenance.
 */
export const EU_VAT_RATES: Record<string, MemberStateRates> = EU_VAT_RATE_HISTORY;

/**
 * Get VAT rates for a specific Member State by country code
 * Returns null if country code is invalid
 */
export function getMemberStateRates(countryCode: string): MemberStateRates | null {
  const normalized = (countryCode || '').toUpperCase();
  return EU_VAT_RATES[normalized] ?? null;
}

/**
 * Get a specific VAT rate (with provenance) by country code and rate type as
 * of a given date.
 *
 * Returns the `VATRate` whose `[effectiveFrom, effectiveTo)` interval
 * contains `asOfDate`, or `null` if the country code is invalid, the rate
 * type has no entries, or no interval covers `asOfDate` (no silent
 * fallback to an unrelated period).
 *
 * @param countryCode - 2-letter ISO 3166-1 alpha-2 country code
 * @param rateType - 'standard', 'reduced', or 'super-reduced'
 * @param asOfDate - Date to look up the rate for (for historical tracking)
 */
export function getVATRate(
  countryCode: string,
  rateType: 'standard' | 'reduced' | 'super-reduced',
  asOfDate: Date,
): VATRate | null {
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

  // Find the interval whose [effectiveFrom, effectiveTo) range contains asOfDate
  const effectiveRate = rateArray.find(
    (r) => r.effectiveFrom <= asOfDate && (!r.effectiveTo || r.effectiveTo >= asOfDate),
  );

  return effectiveRate ?? null;
}

/**
 * Verify that a given rate matches the expected rate for a country code and rate type
 * Used for error detection when rate tables may be stale
 */
export function verifyVATRate(
  countryCode: string,
  rateType: 'standard' | 'reduced' | 'super-reduced',
  expectedRate: number,
  asOfDate: Date,
): boolean {
  const actualRate = getVATRate(countryCode, rateType, asOfDate);
  return actualRate?.rate === expectedRate;
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
