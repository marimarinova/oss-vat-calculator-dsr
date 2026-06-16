/**
 * ECB Daily Reference Rate Infrastructure
 *
 * Art. 91(2) VAT Directive: currency conversion uses the ECB rate published
 * on the date VAT becomes chargeable (chargeable event date).
 * Art. 61c Implementing Reg. (EU) 282/2011: for OSS quarterly returns the
 * rate is that of the last day of the reporting period.
 *
 * Design: module-level daily-rate store populated via registerDailyRate()
 * (fed by parseECBDailyXML() from ecb-feed.ts). No hardcoded rates.
 */

import { ECBRateNotFoundError } from './errors';

// ---------------------------------------------------------------------------
// Policy & types
// ---------------------------------------------------------------------------

export enum ConversionPolicy {
  /** Art. 91(2): ECB rate on the date VAT becomes chargeable. */
  DAILY_AT_CHARGEABLE_EVENT = 'DAILY_AT_CHARGEABLE_EVENT',
  /** Art. 61c IR 282/2011: ECB rate on the last day of the OSS reporting period. */
  LAST_DAY_OF_PERIOD = 'LAST_DAY_OF_PERIOD',
}

/** A single ECB daily reference rate entry (1 EUR = rate target-units). */
export interface DailyECBRate {
  base: 'EUR';
  target: string; // ISO 4217 currency code
  rate: number; // 1 EUR = this many target-currency units
  publishedOn: string; // YYYY-MM-DD
}

/** Return value of convert() — amount plus provenance. */
export interface ConversionResult {
  amount: number; // Converted amount, rounded to ISO 4217 minor units
  rate: number; // Effective cross-rate: 1 source-unit = rate target-units
  rateDate: string; // YYYY-MM-DD the ECB rate was published
  policy: ConversionPolicy;
}

// ---------------------------------------------------------------------------
// ISO 4217 minor-unit table
// ---------------------------------------------------------------------------

/**
 * ECB-standard decimal places for currency rounding.
 * 0 = no subdivision (JPY, KRW), 2 = cent-style (default).
 */
export const ECB_DECIMAL_PLACES: Record<string, number> = {
  EUR: 2,
  USD: 2,
  GBP: 2,
  JPY: 0,
  CHF: 2,
  SEK: 2,
  DKK: 2,
  NOK: 2,
  BGN: 2,
  CZK: 2,
  HUF: 2,
  PLN: 2,
  RON: 2,
  TRY: 2,
  CNY: 2,
  INR: 2,
  BRL: 2,
  MXN: 2,
  AUD: 2,
  CAD: 2,
  NZD: 2,
  SGD: 2,
  HKD: 2,
  KRW: 0,
  ZAR: 2,
  ISK: 0,
  MYR: 2,
  PHP: 2,
  THB: 2,
};

/** Date the Croatian Kuna (HRK) was retired. Croatia adopted EUR on this date. */
export const HRK_RETIRED_AT = '2023-01-01';

// ---------------------------------------------------------------------------
// Module-level daily-rate store
// ---------------------------------------------------------------------------

// Keyed by publishedOn (YYYY-MM-DD) → Map<ISO4217, rate> where rate = 1 EUR = X currency.
const _store = new Map<string, Map<string, number>>();

/** Register a single ECB daily rate in the module store. */
export function registerDailyRate(rate: DailyECBRate): void {
  let dayMap = _store.get(rate.publishedOn);
  if (!dayMap) {
    dayMap = new Map<string, number>();
    _store.set(rate.publishedOn, dayMap);
  }
  dayMap.set(rate.target, rate.rate);
}

/**
 * Remove all registered rates.
 * Call in test beforeEach to ensure isolation across test files.
 */
export function clearDailyRates(): void {
  _store.clear();
}

// ---------------------------------------------------------------------------
// Conversion
// ---------------------------------------------------------------------------

/**
 * Convert amount from sourceCurrency to targetCurrency.
 *
 * Lookup date is determined by policy:
 *   DAILY_AT_CHARGEABLE_EVENT → chargeableEventDate
 *   LAST_DAY_OF_PERIOD        → reportingPeriodEnd (falls back to chargeableEventDate)
 *
 * The most recent published ECB date ≤ lookup date is used, walking back
 * up to 4 calendar days to skip weekends and public holidays.
 *
 * When neither source nor target is EUR the conversion goes via EUR as a
 * triangular cross-rate (Art. 91(2) basis).
 *
 * The result is rounded to the ISO 4217 minor units of the target currency.
 */
export function convert(
  amount: number,
  sourceCurrency: string,
  targetCurrency: string,
  chargeableEventDate: string,
  policy: ConversionPolicy = ConversionPolicy.DAILY_AT_CHARGEABLE_EVENT,
  reportingPeriodEnd?: string,
): ConversionResult {
  const lookupDate =
    policy === ConversionPolicy.LAST_DAY_OF_PERIOD
      ? (reportingPeriodEnd ?? chargeableEventDate)
      : chargeableEventDate;

  if (sourceCurrency === targetCurrency) {
    return { amount, rate: 1, rateDate: lookupDate, policy };
  }

  const rateDate = findPublishedDate(lookupDate, sourceCurrency, targetCurrency);

  const sourceEurRate = eurRate(sourceCurrency, rateDate); // 1 EUR = sourceEurRate source-units
  const targetEurRate = eurRate(targetCurrency, rateDate); // 1 EUR = targetEurRate target-units

  let converted: number;
  let effectiveRate: number;

  if (sourceCurrency === 'EUR') {
    // EUR → target: multiply by ECB rate
    converted = amount * targetEurRate;
    effectiveRate = targetEurRate;
  } else if (targetCurrency === 'EUR') {
    // source → EUR: divide by ECB rate
    converted = amount / sourceEurRate;
    effectiveRate = 1 / sourceEurRate;
  } else {
    // Cross-rate via EUR: source → EUR → target
    converted = (amount / sourceEurRate) * targetEurRate;
    effectiveRate = targetEurRate / sourceEurRate;
  }

  const decimals = ECB_DECIMAL_PLACES[targetCurrency] ?? 2;
  const factor = Math.pow(10, decimals);
  const rounded = Math.round(converted * factor) / factor;

  return { amount: rounded, rate: effectiveRate, rateDate, policy };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Walk back from fromDate up to 4 calendar days to find a date that has
 * published ECB rates for all required currencies.
 * Throws ECBRateNotFoundError if no suitable date is found.
 */
function findPublishedDate(
  fromDate: string,
  sourceCurrency: string,
  targetCurrency: string,
): string {
  for (let i = 0; i <= 4; i++) {
    const candidate = subtractDays(fromDate, i);
    const dayMap = _store.get(candidate);
    if (!dayMap) continue;
    // EUR is always implicitly available (identity); check non-EUR currencies
    const needSource = sourceCurrency !== 'EUR' && !dayMap.has(sourceCurrency);
    const needTarget = targetCurrency !== 'EUR' && !dayMap.has(targetCurrency);
    if (!needSource && !needTarget) {
      return candidate;
    }
  }
  throw new ECBRateNotFoundError(sourceCurrency, targetCurrency, new Date(fromDate));
}

/** Return the ECB rate for currency on a specific date (1 EUR = X currency). */
function eurRate(currency: string, date: string): number {
  if (currency === 'EUR') return 1;
  const rate = _store.get(date)?.get(currency);
  if (rate === undefined) {
    throw new ECBRateNotFoundError(currency, 'EUR', new Date(date));
  }
  return rate;
}

/** Subtract `days` calendar days from a YYYY-MM-DD string, returning YYYY-MM-DD. */
function subtractDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() - days);
  return dt.toISOString().slice(0, 10);
}
