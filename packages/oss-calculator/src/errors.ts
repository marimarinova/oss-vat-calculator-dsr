/**
 * Error Handling for VAT Calculation Engine
 *
 * Addresses three critical error scenarios:
 * 1. Missing country codes in buyer addresses
 * 2. Rate mismatches from stale table versions
 * 3. Currency conversion rounding divergence from ECB convention
 */

export class VATCalculationError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly context?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'VATCalculationError';
  }
}

/**
 * Scenario 1: Missing or invalid country code in buyer address
 * Raised when a transaction references a country not in the EU MS table
 */
export class MissingCountryCodeError extends VATCalculationError {
  constructor(countryCode: string | undefined, transactionId: string) {
    const code = countryCode || 'UNDEFINED';
    super(
      `Missing or invalid country code: "${code}" for transaction "${transactionId}". ` +
        `Country code must be a valid 2-letter ISO 3166-1 alpha-2 code for an EU Member State.`,
      'MISSING_COUNTRY_CODE',
      { countryCode, transactionId },
    );
  }
}

/**
 * Scenario 2: Rate mismatch from stale table versions
 * Raised when VAT rates in the rate table do not match the effective date
 * or when historical rate lookups fail due to incomplete effective date tracking
 */
export class RateMismatchError extends VATCalculationError {
  constructor(
    countryCode: string,
    rateType: 'standard' | 'reduced' | 'super-reduced',
    expectedRate: number,
    actualRate: number,
    effectiveDate: Date,
  ) {
    super(
      `VAT rate mismatch for ${countryCode} (${rateType}): ` +
        `expected ${expectedRate}% but found ${actualRate}% as of ${effectiveDate.toISOString()}. ` +
        `Rate table may be stale or effective date is outside valid range.`,
      'RATE_MISMATCH',
      { countryCode, rateType, expectedRate, actualRate, effectiveDate },
    );
  }
}

/**
 * Scenario 3: Currency conversion rounding divergence from ECB convention
 * Raised when computed conversion amounts diverge from ECB rounding rules
 * (EUR amounts to 2 decimal places, other currencies per ECB convention)
 */
export class CurrencyRoundingError extends VATCalculationError {
  constructor(
    originalAmount: number,
    sourceDecimalPlaces: number,
    targetDecimalPlaces: number,
    ecbConventionPlaces: number,
    currency: string,
  ) {
    super(
      `Currency rounding divergence for ${currency}: ` +
        `source had ${sourceDecimalPlaces} decimal places, target has ${targetDecimalPlaces}, ` +
        `but ECB convention specifies ${ecbConventionPlaces} for this currency. ` +
        `Original amount: ${originalAmount}. Conversion may have lost precision.`,
      'CURRENCY_ROUNDING_DIVERGENCE',
      {
        originalAmount,
        sourceDecimalPlaces,
        targetDecimalPlaces,
        ecbConventionPlaces,
        currency,
      },
    );
  }
}

/**
 * Raised when an invalid VAT rate is provided or derived
 */
export class InvalidVATRateError extends VATCalculationError {
  constructor(rate: number) {
    super(
      `Invalid VAT rate: ${rate}%. Rate must be a non-negative number and typically between 0% and 30%.`,
      'INVALID_VAT_RATE',
      { rate },
    );
  }
}

/**
 * Raised when currency conversion infrastructure is misconfigured
 */
export class ECBRateNotFoundError extends VATCalculationError {
  constructor(sourceCurrency: string, targetCurrency: string, date: Date) {
    super(
      `ECB exchange rate not found: ${sourceCurrency}/${targetCurrency} as of ${date.toISOString()}. ` +
        `Ensure ECB rate tables are loaded for the requested date.`,
      'ECB_RATE_NOT_FOUND',
      { sourceCurrency, targetCurrency, date },
    );
  }
}
