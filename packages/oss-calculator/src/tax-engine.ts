/**
 * VAT Calculation Engine
 *
 * Design Principle 4: Deterministic calculation with transparent rate sources
 *
 * Core VAT calculation engine:
 * - Apply destination-country rate to each transaction
 * - Currency conversion using ECB daily reference rates (Art. 91(2) VAT Directive)
 * - Comprehensive error handling for missing codes, rate mismatches
 */

import { MissingCountryCodeError, RateMismatchError, InvalidVATRateError } from './errors';
import { getMemberStateRates, getVATRate, isValidEUCountry } from './vat-rates';
import { convert, ConversionPolicy } from './ecb-rates';

/**
 * Single transaction for VAT calculation
 */
export interface Transaction {
  id: string; // Unique transaction identifier
  supplyDate: string; // YYYY-MM-DD — customer's local date in the Member State of consumption (chargeable-event date, Art. 63 VAT Directive)
  customerCountryCode: string; // 2-letter country code of B2C buyer
  amount: number; // Transaction amount
  currency: string; // ISO 4217 currency code (e.g., 'EUR', 'USD')
  rateType: 'standard' | 'reduced' | 'super-reduced'; // VAT rate category
  isGoods: boolean; // true = goods, false = services
  supplierCountryCode?: string; // 2-letter country code of supplier (for context)
}

/**
 * A corrective entry referencing an earlier supply.
 * calculateCorrectionVAT() applies the ORIGINAL rate directly
 * (Art. 91(2): credit notes use the rate in effect at the original chargeable-event date).
 */
export interface Correction {
  id: string;
  originalTransactionId: string;
  originalSupplyDate: string; // YYYY-MM-DD — date of the original supply
  originalVATRate: number; // VAT percentage that applied to the original supply (e.g. 19)
  originalDatasetVersion: string; // rate-dataset version that was active for the original supply
  reasonCode: string; // e.g. 'UI-ERROR' | 'PRICE-CHANGE' | 'CUSTOMER-REFUND' | 'WRONG-MS' | 'WRONG-TAXCODE'
  adjustedAmount: number; // corrected taxable amount (positive = additional charge, negative = credit)
  currency: string; // ISO 4217
  customerCountryCode: string;
  rateType: 'standard' | 'reduced' | 'super-reduced';
  isGoods: boolean;
  supplierCountryCode?: string;
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
}

/**
 * Main VAT tax calculation engine.
 * Currency conversion uses the module-level ECB daily rate store from ecb-rates.ts.
 * Load rates via registerDailyRate() / parseECBDailyXML() before converting non-EUR
 * transactions. The conversion policy is Art. 91(2) DAILY_AT_CHARGEABLE_EVENT.
 */
export class TaxEngine {
  private readonly defaultCurrency: string;

  constructor(config: TaxEngineConfig = {}) {
    this.defaultCurrency = config.defaultCurrency ?? 'EUR';
  }

  /**
   * Calculate VAT for a single transaction.
   * Applies destination-country rate and converts currency if needed.
   */
  public calculateVAT(transaction: Transaction): VATCalculationResult {
    if (!transaction.customerCountryCode || !isValidEUCountry(transaction.customerCountryCode)) {
      throw new MissingCountryCodeError(transaction.customerCountryCode, transaction.id);
    }

    const vatRate = getVATRate(
      transaction.customerCountryCode,
      transaction.rateType,
      new Date(transaction.supplyDate),
    );

    if (vatRate === null) {
      throw new RateMismatchError(
        transaction.customerCountryCode,
        transaction.rateType,
        0,
        0,
        new Date(transaction.supplyDate),
      );
    }

    if (vatRate.rate < 0 || vatRate.rate > 100) {
      throw new InvalidVATRateError(vatRate.rate);
    }

    // Art. 91(2): use the ECB rate on the date VAT becomes chargeable
    const chargeableEventDate = transaction.supplyDate;
    const amountEUR = this.convertToEUR(
      transaction.amount,
      transaction.currency,
      chargeableEventDate,
    );

    const vatAmount = (amountEUR * vatRate.rate) / 100;

    return {
      transactionId: transaction.id,
      customerCountryCode: transaction.customerCountryCode,
      supplierCountryCode: transaction.supplierCountryCode,
      amountEUR,
      amountLocal: transaction.amount,
      currency: transaction.currency,
      vatRate: vatRate.rate,
      vatAmount: this.roundToEURCents(vatAmount),
      totalAmountEUR: this.roundToEURCents(amountEUR + vatAmount),
      rateType: transaction.rateType,
      isGoods: transaction.isGoods,
    };
  }

  /**
   * Calculate VAT for multiple transactions.
   */
  public calculateBatch(transactions: Transaction[]): VATCalculationResult[] {
    return transactions.map((t) => this.calculateVAT(t));
  }

  /**
   * Convert amount to EUR using the module-level ECB daily rate store.
   * Throws ECBRateNotFoundError if no rate is available for the given date.
   */
  private convertToEUR(amount: number, currency: string, chargeableEventDate: string): number {
    if (!currency || currency === 'EUR') {
      return amount;
    }
    return convert(
      amount,
      currency,
      'EUR',
      chargeableEventDate,
      ConversionPolicy.DAILY_AT_CHARGEABLE_EVENT,
    ).amount;
  }

  private roundToEURCents(amount: number): number {
    return Math.round(amount * 100) / 100;
  }

  /**
   * Calculate VAT for a correction / credit note.
   * Applies the ORIGINAL VAT rate directly without re-looking up the current rate.
   * Art. 91(2): the exchange rate used is that of the ORIGINAL supply date.
   */
  public calculateCorrectionVAT(correction: Correction): VATCalculationResult {
    if (!correction.customerCountryCode || !isValidEUCountry(correction.customerCountryCode)) {
      throw new MissingCountryCodeError(correction.customerCountryCode, correction.id);
    }

    const vatRate = correction.originalVATRate;

    if (vatRate < 0 || vatRate > 100) {
      throw new InvalidVATRateError(vatRate);
    }

    // Art. 91(2): use the ECB rate on the ORIGINAL chargeable-event date
    const amountEUR = this.convertToEUR(
      correction.adjustedAmount,
      correction.currency,
      correction.originalSupplyDate,
    );

    const vatAmount = (amountEUR * vatRate) / 100;

    return {
      transactionId: correction.id,
      customerCountryCode: correction.customerCountryCode,
      supplierCountryCode: correction.supplierCountryCode,
      amountEUR,
      amountLocal: correction.adjustedAmount,
      currency: correction.currency,
      vatRate,
      vatAmount: this.roundToEURCents(vatAmount),
      totalAmountEUR: this.roundToEURCents(amountEUR + vatAmount),
      rateType: correction.rateType,
      isGoods: correction.isGoods,
    };
  }

  /**
   * Get information about available VAT rates for a country.
   */
  public getCountryRateInfo(
    countryCode: string,
  ): { standard: number | null; reduced: number[]; superReduced: number[] } | null {
    const rates = getMemberStateRates(countryCode);
    if (!rates) return null;

    const today = new Date();

    const standardRate = getVATRate(countryCode, 'standard', today);
    const reducedRates = rates.reduced.map((r) => r.rate).filter((v, i, a) => a.indexOf(v) === i);
    const superReducedRates = rates.superReduced
      .map((r) => r.rate)
      .filter((v, i, a) => a.indexOf(v) === i);

    return {
      standard: standardRate?.rate ?? null,
      reduced: reducedRates,
      superReduced: superReducedRates,
    };
  }
}
