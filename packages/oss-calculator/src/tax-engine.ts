/**
 * VAT Calculation Engine
 *
 * Design Principle 4: Deterministic calculation with transparent rate sources
 *
 * Core VAT calculation engine:
 * - Apply destination-country rate to each transaction
 * - Currency conversion using ECB quarterly reference rates
 * - Comprehensive error handling for missing codes, rate mismatches, and rounding divergence
 */

import {
  MissingCountryCodeError,
  RateMismatchError,
  InvalidVATRateError,
} from './errors';
import {
  getMemberStateRates,
  getVATRate,
  isValidEUCountry,
} from './vat-rates';
import { CurrencyConverter } from './ecb-rates';

/**
 * Single transaction for VAT calculation
 */
export interface Transaction {
  id: string; // Unique transaction identifier
  date: Date; // Transaction date (used for rate lookup)
  customerCountryCode: string; // 2-letter country code of B2C buyer
  amount: number; // Transaction amount
  currency: string; // ISO 4217 currency code (e.g., 'EUR', 'USD')
  rateType: 'standard' | 'reduced' | 'super-reduced'; // VAT rate category
  isGoods: boolean; // true = goods, false = services
  supplierCountryCode?: string; // 2-letter country code of supplier (for context)
}

/**
 * VAT calculation result for a single transaction
 */
export interface VATCalculationResult {
  transactionId: string;
  customerCountryCode: string;
  supplierCountryCode?: string;
  amountEUR: number; // Amount in EUR after conversion
  amountLocal: number; // Original amount in transaction currency
  currency: string; // Original currency
  vatRate: number; // Applied VAT rate as percentage
  vatAmount: number; // Calculated VAT in EUR
  totalAmountEUR: number; // Amount + VAT in EUR
  rateType: 'standard' | 'reduced' | 'super-reduced';
  isGoods: boolean;
}

/**
 * Configuration for tax engine
 */
export interface TaxEngineConfig {
  defaultCurrency?: string; // Default currency if not specified (default: 'EUR')
  currencyConverter?: CurrencyConverter; // Currency converter (required for non-EUR)
}

/**
 * Main VAT tax calculation engine
 */
export class TaxEngine {
  private config: Required<TaxEngineConfig>;

  constructor(config: TaxEngineConfig = {}) {
    this.config = {
      defaultCurrency: config.defaultCurrency ?? 'EUR',
      currencyConverter: config.currencyConverter,
    };
  }

  /**
   * Calculate VAT for a single transaction
   * Applies destination-country rate and converts currency if needed
   */
  public calculateVAT(transaction: Transaction): VATCalculationResult {
    // Validate country code
    if (
      !transaction.customerCountryCode ||
      !isValidEUCountry(transaction.customerCountryCode)
    ) {
      throw new MissingCountryCodeError(
        transaction.customerCountryCode,
        transaction.id
      );
    }

    // Get VAT rate for destination country
    const vatRate = getVATRate(
      transaction.customerCountryCode,
      transaction.rateType,
      transaction.date
    );

    if (vatRate === null) {
      throw new RateMismatchError(
        transaction.customerCountryCode,
        transaction.rateType,
        0, // We don't have expected value, use 0 as indicator
        0,
        transaction.date
      );
    }

    // Validate VAT rate is reasonable
    if (vatRate < 0 || vatRate > 100) {
      throw new InvalidVATRateError(vatRate);
    }

    // Convert to EUR if needed
    const amountEUR = this.convertToEUR(
      transaction.amount,
      transaction.currency,
      transaction.date
    );

    // Calculate VAT amount
    const vatAmount = (amountEUR * vatRate) / 100;

    return {
      transactionId: transaction.id,
      customerCountryCode: transaction.customerCountryCode,
      supplierCountryCode: transaction.supplierCountryCode,
      amountEUR,
      amountLocal: transaction.amount,
      currency: transaction.currency,
      vatRate,
      vatAmount: this.roundToEURCents(vatAmount),
      totalAmountEUR: this.roundToEURCents(amountEUR + vatAmount),
      rateType: transaction.rateType,
      isGoods: transaction.isGoods,
    };
  }

  /**
   * Calculate VAT for multiple transactions
   * Returns array of results, maintaining transaction order
   */
  public calculateBatch(transactions: Transaction[]): VATCalculationResult[] {
    return transactions.map((t) => this.calculateVAT(t));
  }

  /**
   * Convert amount to EUR using configured currency converter
   */
  private convertToEUR(
    amount: number,
    currency: string,
    asOfDate: Date
  ): number {
    if (currency === 'EUR' || !currency) {
      return amount;
    }

    if (!this.config.currencyConverter) {
      throw new Error(
        `Currency converter not configured. Cannot convert from ${currency} to EUR. ` +
        `Provide a CurrencyConverter instance in TaxEngineConfig.`
      );
    }

    return this.config.currencyConverter.convert(
      amount,
      currency,
      'EUR',
      asOfDate
    );
  }

  /**
   * Round to EUR cent precision (2 decimal places)
   */
  private roundToEURCents(amount: number): number {
    return Math.round(amount * 100) / 100;
  }

  /**
   * Get information about available VAT rates for a country
   */
  public getCountryRateInfo(
    countryCode: string
  ): { standard: number | null; reduced: number[]; superReduced: number[] } | null {
    const rates = getMemberStateRates(countryCode);
    if (!rates) return null;

    const today = new Date();

    const standardRate = getVATRate(countryCode, 'standard', today);
    const reducedRates = rates.reduced
      .map((r) => r.rate)
      .filter((v, i, a) => a.indexOf(v) === i); // deduplicate
    const superReducedRates = rates.superReduced
      .map((r) => r.rate)
      .filter((v, i, a) => a.indexOf(v) === i); // deduplicate

    return {
      standard: standardRate,
      reduced: reducedRates,
      superReduced: superReducedRates,
    };
  }
}
