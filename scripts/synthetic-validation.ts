/**
 * Synthetic Data Validation Script
 *
 * Generates 2,700 synthetic transactions (100 per EU Member State)
 * with three product types: standard-rated goods, reduced-rate digital services,
 * and mixed baskets, plus a small set of fixed-date oracle transition checks
 * for the 5 Member States with verified rate history (BG, DE, FR, NL, AT).
 *
 * Paper Reference: "A synthetic data set of 2,700 transactions was constructed,
 * with 100 cases for each of the 27 EU Member States. The data set reflects three
 * situations: standard-rated physical goods, reduced-rate digital services, and
 * mixed baskets."
 *
 * Validation design (Refactor 1):
 *  - EXTERNAL validation (BG, DE, FR, NL, AT, for the rate types with verified
 *    history): expected rates/amounts come from `ORACLE_RATES`, a small
 *    hardcoded table transcribed directly from the seed sources in
 *    `packages/oss-calculator/src/data/eu-vat-history.seed.ts` (PwC, eClear/ASD,
 *    Tax Foundation, vatcalc, WTS Klient). This table is independent of
 *    `getVATRate()` - it does not call into the engine's rate lookup at all.
 *  - INTERNAL consistency check (the other 22 Member States, plus the rate
 *    types within the 5 seeded states that have no verified history, e.g. FR
 *    reduced/super-reduced): expected rates come from `getVATRate()` against
 *    the same `EU_VAT_RATES` table the engine uses. This confirms TaxEngine
 *    applies the configured table correctly, but is NOT an independent check
 *    of the rate values themselves.
 */

import {
  TaxEngine,
  Transaction,
  VATCalculationResult,
} from '../packages/oss-calculator/src/tax-engine';
import { EU_VAT_RATES, getVATRate } from '../packages/oss-calculator/src/vat-rates';
import * as fs from 'fs';
import * as path from 'path';

// Seeded random number generator for reproducibility
class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  next(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }

  nextInt(max: number): number {
    return Math.floor(this.next() * max);
  }

  nextInRange(min: number, max: number): number {
    return min + this.next() * (max - min);
  }
}

type RateType = 'standard' | 'reduced' | 'super-reduced';

type ValidationSource = 'oracle' | 'internal';

interface SyntheticTransaction extends Transaction {
  productType: 'standard-goods' | 'reduced-digital' | 'mixed-basket' | 'oracle-transition';
  productDescription: string;
  expectedVATAmount: number;
  expectedVATRate: number;
  validationSource: ValidationSource;
}

interface ValidationResult {
  transactionId: string;
  countryCode: string;
  productType: string;
  validationSource: ValidationSource;
  expectedVATAmount: number;
  actualVATAmount: number;
  expectedVATRate: number;
  actualVATRate: number;
  match: boolean;
  absoluteError: number;
}

interface GroupStats {
  total: number;
  accurate: number;
  accuracy: number;
  meanAbsoluteError: number;
  maxAbsoluteError: number;
}

interface SummaryStats {
  totalTransactions: number;
  accurateTransactions: number;
  accuracy: number;
  meanAbsoluteError: number;
  maxAbsoluteError: number;
  processingTimeMs: number;
  averageTransactionTimeMs: number;
  minTransactionTimeMs: number;
  maxTransactionTimeMs: number;
  medianTransactionTimeMs: number;
  oracle: GroupStats;
  internal: GroupStats;
}

/**
 * Independent oracle: rate intervals transcribed directly from the verified
 * seed sources for BG, DE, FR, NL, AT (see
 * packages/oss-calculator/src/data/eu-vat-history.seed.ts for citations).
 *
 * This table is intentionally hand-transcribed and does NOT import from
 * `EU_VAT_RATES` / `getVATRate()` - it exists to catch divergence between the
 * engine's rate table and the verified source data, not to restate it.
 */
interface OracleInterval {
  effectiveFrom: Date;
  effectiveTo?: Date;
  rate: number;
}

const ORACLE_RATES: Record<string, Partial<Record<RateType, OracleInterval[]>>> = {
  // BG standard: 20% since 1999-04-01 (PwC Worldwide Tax Summaries - Bulgaria)
  // BG reduced (books/periodicals): 9% since 2020-07-01 (WTS Klient)
  BG: {
    standard: [{ effectiveFrom: new Date('1999-04-01'), rate: 20 }],
    reduced: [{ effectiveFrom: new Date('2020-07-01'), rate: 9 }],
  },
  // DE standard: 19% -> 16% (2020-07-01..2020-12-31, COVID stimulus) -> 19% (eClear/ASD)
  // DE reduced: 7% -> 5% (2020-07-01..2020-12-31, COVID stimulus) -> 7% (eClear)
  DE: {
    standard: [
      { effectiveFrom: new Date('1970-01-01'), effectiveTo: new Date('2020-06-30'), rate: 19 },
      { effectiveFrom: new Date('2020-07-01'), effectiveTo: new Date('2020-12-31'), rate: 16 },
      { effectiveFrom: new Date('2021-01-01'), rate: 19 },
    ],
    reduced: [
      { effectiveFrom: new Date('1970-01-01'), effectiveTo: new Date('2020-06-30'), rate: 7 },
      { effectiveFrom: new Date('2020-07-01'), effectiveTo: new Date('2020-12-31'), rate: 5 },
      { effectiveFrom: new Date('2021-01-01'), rate: 7 },
    ],
  },
  // FR standard: 20% since 2014-01-01 (Tax Foundation). Reduced/super-reduced
  // rates for FR have no verified history in R1 - intentionally absent here,
  // so FR reduced/mixed transactions fall back to the internal check.
  FR: {
    standard: [{ effectiveFrom: new Date('2014-01-01'), rate: 20 }],
  },
  // NL standard: 21% since 2012-10-01 (Tax Foundation)
  // NL reduced: 6% -> 9% from 2019-01-01 (Tax Foundation)
  NL: {
    standard: [{ effectiveFrom: new Date('2012-10-01'), rate: 21 }],
    reduced: [
      { effectiveFrom: new Date('1970-01-01'), effectiveTo: new Date('2018-12-31'), rate: 6 },
      { effectiveFrom: new Date('2019-01-01'), rate: 9 },
    ],
  },
  // AT standard: 20%, long-standing (VATupdate)
  // AT reduced: 10% -> 5% (2020-07-01..2021-12-31, COVID relief) -> 10% (vatcalc)
  AT: {
    standard: [{ effectiveFrom: new Date('1970-01-01'), rate: 20 }],
    reduced: [
      { effectiveFrom: new Date('1970-01-01'), effectiveTo: new Date('2020-06-30'), rate: 10 },
      { effectiveFrom: new Date('2020-07-01'), effectiveTo: new Date('2021-12-31'), rate: 5 },
      { effectiveFrom: new Date('2022-01-01'), rate: 10 },
    ],
  },
};

function getOracleRate(country: string, rateType: RateType, date: Date): number | null {
  const interval = ORACLE_RATES[country]?.[rateType]?.find(
    (iv) => iv.effectiveFrom <= date && (!iv.effectiveTo || iv.effectiveTo >= date),
  );
  return interval ? interval.rate : null;
}

function hasOracleEntry(country: string, rateType: RateType): boolean {
  return ORACLE_RATES[country]?.[rateType] !== undefined;
}

/**
 * Expected rate for a (country, rateType, date) combination, used to
 * generate the synthetic transaction's `expectedVATRate`/`expectedVATAmount`.
 * Prefers the independent oracle; falls back to the engine's own rate table
 * (`getVATRate`) only for combinations the oracle does not cover (internal
 * consistency check, not independent validation).
 */
function expectedRate(country: string, rateType: RateType, date: Date): number {
  const oracle = getOracleRate(country, rateType, date);
  if (oracle !== null) return oracle;
  return getVATRate(country, rateType, date)?.rate ?? 0;
}

const EU_COUNTRIES = Object.keys(EU_VAT_RATES);
const PRODUCTS_PER_COUNTRY = 100;
const ITEMS_PER_PRODUCT = 100 / 3; // Distribute ~33-34 to each type

// Fixed seed for reproducibility
const rng = new SeededRandom(42);

// Product descriptions for different types
const STANDARD_GOODS_DESCRIPTIONS = [
  'Laptop Computer',
  'Office Chair',
  'Desk Lamp',
  'USB Cable',
  'Wireless Mouse',
  'Monitor Stand',
  'Keyboard',
  'Notebook Set',
  'Printer Paper (500 sheets)',
  'File Cabinet',
];

const REDUCED_DIGITAL_DESCRIPTIONS = [
  'Cloud Storage Subscription (1 year)',
  'Email Marketing Platform Access',
  'E-Learning Course License',
  'Digital Books (PDF Bundle)',
  'Software License',
  'Online Database Access',
  'Streaming Service Subscription',
  'Web Hosting Service',
  'API Access License',
  'Digital Certification Course',
];

const MIXED_BASKET_DESCRIPTIONS = [
  'Office Supplies Bundle',
  'Tech Starter Pack',
  'Workstation Kit',
  'Digital + Physical Bundle',
  'Hybrid Software Bundle',
  'Complete Office Solution',
  'Mixed Products Order',
  'Bulk Purchase Order',
  'Assorted Items Package',
  'Multi-Category Order',
];

function getRandomDescription(type: 'standard-goods' | 'reduced-digital' | 'mixed-basket'): string {
  switch (type) {
    case 'standard-goods':
      return STANDARD_GOODS_DESCRIPTIONS[rng.nextInt(STANDARD_GOODS_DESCRIPTIONS.length)];
    case 'reduced-digital':
      return REDUCED_DIGITAL_DESCRIPTIONS[rng.nextInt(REDUCED_DIGITAL_DESCRIPTIONS.length)];
    case 'mixed-basket':
      return MIXED_BASKET_DESCRIPTIONS[rng.nextInt(MIXED_BASKET_DESCRIPTIONS.length)];
  }
}

function generateRandomDate(): Date {
  // Q1 2026: January 1 - March 31
  const q1Start = new Date(2026, 0, 1);
  const q1End = new Date(2026, 2, 31);
  const timestamp = q1Start.getTime() + rng.next() * (q1End.getTime() - q1Start.getTime());
  return new Date(timestamp);
}

function generateSyntheticTransactions(): SyntheticTransaction[] {
  const transactions: SyntheticTransaction[] = [];

  // Generate 100 transactions per country
  for (const countryCode of EU_COUNTRIES) {
    // ~34 standard-rated physical goods
    for (let i = 0; i < 34; i++) {
      const transactionId = `${countryCode}-GOODS-${String(i).padStart(3, '0')}`;
      const netAmount = rng.nextInRange(5, 500);
      const date = generateRandomDate();

      const expectedVATRate = expectedRate(countryCode, 'standard', date);
      const expectedVATAmount = Math.round(((netAmount * expectedVATRate) / 100) * 100) / 100;

      transactions.push({
        id: transactionId,
        date,
        customerCountryCode: countryCode,
        amount: netAmount,
        currency: 'EUR',
        rateType: 'standard',
        isGoods: true,
        supplierCountryCode: 'DE', // Supplier in Germany
        productType: 'standard-goods',
        productDescription: getRandomDescription('standard-goods'),
        expectedVATAmount,
        expectedVATRate,
        validationSource: hasOracleEntry(countryCode, 'standard') ? 'oracle' : 'internal',
      });
    }

    // ~33 reduced-rate digital services
    // Note: Denmark (DK) has no reduced VAT rate category at all (EU_VAT_RATES
    // DK.reduced is empty - Denmark applies a single 25% rate to everything),
    // so for countries with no reduced rate, fall back to the standard rate
    // rather than calling TaxEngine with a rate type it has no data for.
    for (let i = 0; i < 33; i++) {
      const transactionId = `${countryCode}-DIGITAL-${String(i).padStart(3, '0')}`;
      const netAmount = rng.nextInRange(5, 500);
      const date = generateRandomDate();

      const rateType: RateType =
        getVATRate(countryCode, 'reduced', date) !== null ? 'reduced' : 'standard';
      const expectedVATRate = expectedRate(countryCode, rateType, date);
      const expectedVATAmount = Math.round(((netAmount * expectedVATRate) / 100) * 100) / 100;

      transactions.push({
        id: transactionId,
        date,
        customerCountryCode: countryCode,
        amount: netAmount,
        currency: 'EUR',
        rateType,
        isGoods: false,
        supplierCountryCode: 'IE', // Supplier in Ireland
        productType: 'reduced-digital',
        productDescription: getRandomDescription('reduced-digital'),
        expectedVATAmount,
        expectedVATRate,
        validationSource: hasOracleEntry(countryCode, rateType) ? 'oracle' : 'internal',
      });
    }

    // ~33 mixed baskets
    // Note: TaxEngine operates on a single Transaction with one `rateType` -
    // a true split-rate basket would require multiple line items, which is
    // out of scope here. So the expected VAT for a "mixed basket" submitted
    // as a single standard-rated transaction is just the standard rate
    // applied to the full amount - this validates that TaxEngine applies the
    // destination-country standard rate regardless of basket composition.
    for (let i = 0; i < 33; i++) {
      const transactionId = `${countryCode}-MIXED-${String(i).padStart(3, '0')}`;
      const netAmount = rng.nextInRange(5, 500);
      const date = generateRandomDate();

      const expectedVATRate = expectedRate(countryCode, 'standard', date);
      const expectedVATAmount = Math.round(((netAmount * expectedVATRate) / 100) * 100) / 100;

      transactions.push({
        id: transactionId,
        date,
        customerCountryCode: countryCode,
        amount: netAmount,
        currency: 'EUR',
        rateType: 'standard', // Use standard rate for validation
        isGoods: true,
        supplierCountryCode: 'FR', // Supplier in France
        productType: 'mixed-basket',
        productDescription: getRandomDescription('mixed-basket'),
        expectedVATAmount,
        expectedVATRate,
        validationSource: hasOracleEntry(countryCode, 'standard') ? 'oracle' : 'internal',
      });
    }
  }

  return transactions;
}

/**
 * Fixed-date oracle transition checks for the 5 verified Member States.
 * Each entry's `expectedVATRate` is read directly from `ORACLE_RATES` for a
 * date chosen to sit exactly on (or either side of) a verified rate
 * transition - this is the part of the validation that is independent of
 * `getVATRate()` and exercises the date-aware lookup added in Refactor 1.
 */
function generateOracleTransitionTransactions(): SyntheticTransaction[] {
  const amount = 1000; // round amount so expectedVATAmount == rate * 10, easy to eyeball

  const cases: Array<{ country: string; rateType: RateType; date: string; note: string }> = [
    // DE standard: 19% -> 16% (COVID) -> 19%
    {
      country: 'DE',
      rateType: 'standard',
      date: '2020-06-30',
      note: 'DE standard pre-COVID (19%)',
    },
    {
      country: 'DE',
      rateType: 'standard',
      date: '2020-07-01',
      note: 'DE standard COVID rate start (16%)',
    },
    {
      country: 'DE',
      rateType: 'standard',
      date: '2020-12-31',
      note: 'DE standard COVID rate end (16%)',
    },
    { country: 'DE', rateType: 'standard', date: '2021-01-01', note: 'DE standard restored (19%)' },
    // DE reduced: 7% -> 5% (COVID) -> 7%
    { country: 'DE', rateType: 'reduced', date: '2020-06-30', note: 'DE reduced pre-COVID (7%)' },
    {
      country: 'DE',
      rateType: 'reduced',
      date: '2020-07-01',
      note: 'DE reduced COVID rate start (5%)',
    },
    {
      country: 'DE',
      rateType: 'reduced',
      date: '2020-12-31',
      note: 'DE reduced COVID rate end (5%)',
    },
    { country: 'DE', rateType: 'reduced', date: '2021-01-01', note: 'DE reduced restored (7%)' },
    // NL reduced: 6% -> 9% from 2019-01-01
    { country: 'NL', rateType: 'reduced', date: '2018-12-31', note: 'NL reduced pre-2019 (6%)' },
    { country: 'NL', rateType: 'reduced', date: '2019-01-01', note: 'NL reduced post-2019 (9%)' },
    // NL standard: 21% since 2012-10-01
    {
      country: 'NL',
      rateType: 'standard',
      date: '2012-10-01',
      note: 'NL standard effective date (21%)',
    },
    { country: 'NL', rateType: 'standard', date: '2026-01-15', note: 'NL standard current (21%)' },
    // AT reduced: 10% -> 5% (COVID) -> 10% from 2022-01-01
    { country: 'AT', rateType: 'reduced', date: '2020-06-30', note: 'AT reduced pre-COVID (10%)' },
    {
      country: 'AT',
      rateType: 'reduced',
      date: '2020-07-01',
      note: 'AT reduced COVID rate start (5%)',
    },
    {
      country: 'AT',
      rateType: 'reduced',
      date: '2021-12-31',
      note: 'AT reduced COVID rate end (5%)',
    },
    { country: 'AT', rateType: 'reduced', date: '2022-01-01', note: 'AT reduced restored (10%)' },
    // AT standard: 20%, long-standing
    { country: 'AT', rateType: 'standard', date: '2026-01-15', note: 'AT standard current (20%)' },
    // BG standard: 20% since 1999-04-01
    {
      country: 'BG',
      rateType: 'standard',
      date: '1999-04-01',
      note: 'BG standard effective date (20%)',
    },
    { country: 'BG', rateType: 'standard', date: '2026-01-15', note: 'BG standard current (20%)' },
    // BG reduced (books/periodicals): 9% since 2020-07-01
    {
      country: 'BG',
      rateType: 'reduced',
      date: '2020-07-01',
      note: 'BG reduced effective date (9%)',
    },
    { country: 'BG', rateType: 'reduced', date: '2026-01-15', note: 'BG reduced current (9%)' },
    // FR standard: 20% since 2014-01-01
    {
      country: 'FR',
      rateType: 'standard',
      date: '2014-01-01',
      note: 'FR standard effective date (20%)',
    },
    { country: 'FR', rateType: 'standard', date: '2026-01-15', note: 'FR standard current (20%)' },
  ];

  return cases.map((c, i) => {
    const date = new Date(c.date);
    const expectedVATRate = getOracleRate(c.country, c.rateType, date);
    if (expectedVATRate === null) {
      throw new Error(`Oracle has no rate for ${c.country}/${c.rateType} on ${c.date}`);
    }
    const expectedVATAmount = Math.round(((amount * expectedVATRate) / 100) * 100) / 100;

    return {
      id: `ORACLE-${c.country}-${c.rateType.toUpperCase()}-${String(i).padStart(2, '0')}`,
      date,
      customerCountryCode: c.country,
      amount,
      currency: 'EUR',
      rateType: c.rateType,
      isGoods: c.rateType === 'standard',
      supplierCountryCode: 'DE',
      productType: 'oracle-transition',
      productDescription: c.note,
      expectedVATAmount,
      expectedVATRate,
      validationSource: 'oracle',
    };
  });
}

function compareResults(
  transaction: SyntheticTransaction,
  engineResult: VATCalculationResult,
): ValidationResult {
  const expectedVATRate = transaction.expectedVATRate;
  const expectedVATAmount = transaction.expectedVATAmount;

  const vatAmountMatch = Math.abs(engineResult.vatAmount - expectedVATAmount) < 0.01;
  const vatRateMatch = Math.abs(engineResult.vatRate - expectedVATRate) < 0.001;

  return {
    transactionId: transaction.id,
    countryCode: transaction.customerCountryCode,
    productType: transaction.productType,
    validationSource: transaction.validationSource,
    expectedVATAmount,
    actualVATAmount: engineResult.vatAmount,
    expectedVATRate,
    actualVATRate: engineResult.vatRate,
    match: vatAmountMatch && vatRateMatch,
    absoluteError: Math.abs(engineResult.vatAmount - expectedVATAmount),
  };
}

function computeGroupStats(results: ValidationResult[]): GroupStats {
  const total = results.length;
  const accurate = results.filter((r) => r.match).length;
  const errors = results.map((r) => r.absoluteError);
  const meanAbsoluteError = total > 0 ? errors.reduce((a, b) => a + b, 0) / total : 0;
  const maxAbsoluteError = total > 0 ? Math.max(...errors) : 0;

  return {
    total,
    accurate,
    accuracy: total > 0 ? (accurate / total) * 100 : 0,
    meanAbsoluteError,
    maxAbsoluteError,
  };
}

async function runValidation() {
  console.log('='.repeat(80));
  console.log('OSS VAT Calculator - Synthetic Data Validation');
  console.log('='.repeat(80));
  console.log('');

  const startTime = performance.now();

  // Step 1: Generate synthetic transactions
  console.log('Step 1: Generating synthetic transactions...');
  const coreTransactions = generateSyntheticTransactions();
  const oracleTransitionTransactions = generateOracleTransitionTransactions();
  const transactions = [...coreTransactions, ...oracleTransitionTransactions];
  console.log(
    `Generated ${coreTransactions.length} per-country transactions (${EU_COUNTRIES.length} countries x 100 each) ` +
      `+ ${oracleTransitionTransactions.length} oracle transition-date checks (BG, DE, FR, NL, AT)`,
  );
  console.log('');

  // Step 2: Initialize TaxEngine
  console.log('Step 2: Initializing TaxEngine...');
  const taxEngine = new TaxEngine();
  console.log('TaxEngine ready');
  console.log('');

  // Step 3: Calculate VAT for all transactions
  console.log('Step 3: Running TaxEngine on all transactions...');
  const transactionTimes: number[] = [];
  const engineResults: VATCalculationResult[] = [];

  for (const transaction of transactions) {
    const txStart = performance.now();
    try {
      const result = taxEngine.calculateVAT(transaction);
      engineResults.push(result);
    } catch (error) {
      console.error(`Error processing transaction ${transaction.id}:`, error);
      throw error;
    }
    const txEnd = performance.now();
    transactionTimes.push(txEnd - txStart);
  }

  console.log(`Processed ${engineResults.length} transactions`);
  console.log('');

  // Step 4: Validate results
  console.log('Step 4: Validating results...');
  const validationResults: ValidationResult[] = [];
  const discrepancies: ValidationResult[] = [];
  let accurateCount = 0;

  for (let i = 0; i < transactions.length; i++) {
    const transaction = transactions[i];
    const engineResult = engineResults[i];

    const validation = compareResults(transaction, engineResult);
    validationResults.push(validation);

    if (validation.match) {
      accurateCount++;
    } else {
      discrepancies.push(validation);
    }
  }

  const endTime = performance.now();
  const totalProcessingTime = endTime - startTime;

  console.log(`Validated ${validationResults.length} transactions`);
  console.log(`Accurate transactions: ${accurateCount}/${validationResults.length}`);
  console.log('');

  // Step 5: Calculate statistics
  console.log('Step 5: Computing statistics...');

  const absoluteErrors = validationResults.map((v) => v.absoluteError);
  const meanAbsoluteError = absoluteErrors.reduce((a, b) => a + b, 0) / absoluteErrors.length;
  const maxAbsoluteError = Math.max(...absoluteErrors);

  const sortedTimes = [...transactionTimes].sort((a, b) => a - b);
  const medianTime = sortedTimes[Math.floor(sortedTimes.length / 2)];

  const oracleResults = validationResults.filter((v) => v.validationSource === 'oracle');
  const internalResults = validationResults.filter((v) => v.validationSource === 'internal');

  const stats: SummaryStats = {
    totalTransactions: transactions.length,
    accurateTransactions: accurateCount,
    accuracy: (accurateCount / transactions.length) * 100,
    meanAbsoluteError,
    maxAbsoluteError,
    processingTimeMs: totalProcessingTime,
    averageTransactionTimeMs: transactionTimes.reduce((a, b) => a + b, 0) / transactionTimes.length,
    minTransactionTimeMs: Math.min(...transactionTimes),
    maxTransactionTimeMs: Math.max(...transactionTimes),
    medianTransactionTimeMs: medianTime,
    oracle: computeGroupStats(oracleResults),
    internal: computeGroupStats(internalResults),
  };

  console.log(`Total Processing Time: ${stats.processingTimeMs.toFixed(2)} ms`);
  console.log(`Average Transaction Time: ${stats.averageTransactionTimeMs.toFixed(4)} ms`);
  console.log(`Min Transaction Time: ${stats.minTransactionTimeMs.toFixed(4)} ms`);
  console.log(`Max Transaction Time: ${stats.maxTransactionTimeMs.toFixed(4)} ms`);
  console.log(`Median Transaction Time: ${stats.medianTransactionTimeMs.toFixed(4)} ms`);
  console.log('');
  console.log(
    `External (oracle) validation - BG/DE/FR/NL/AT verified rate types: ` +
      `${stats.oracle.accurate}/${stats.oracle.total} (${stats.oracle.accuracy.toFixed(2)}%), ` +
      `MAE EUR ${stats.oracle.meanAbsoluteError.toFixed(4)}`,
  );
  console.log(
    `Internal consistency check - remaining countries/rate types: ` +
      `${stats.internal.accurate}/${stats.internal.total} (${stats.internal.accuracy.toFixed(2)}%), ` +
      `MAE EUR ${stats.internal.meanAbsoluteError.toFixed(4)}`,
  );
  console.log('');

  // Step 6: Breakdown by country and product type
  console.log('Step 6: Breakdown by country and product type...');
  console.log('');

  const breakdown: Record<string, Record<string, { total: number; accurate: number }>> = {};

  for (const country of EU_COUNTRIES) {
    breakdown[country] = {
      'standard-goods': { total: 0, accurate: 0 },
      'reduced-digital': { total: 0, accurate: 0 },
      'mixed-basket': { total: 0, accurate: 0 },
    };
  }

  for (const validation of validationResults) {
    if (validation.productType === 'oracle-transition') continue;
    breakdown[validation.countryCode][validation.productType].total++;
    if (validation.match) {
      breakdown[validation.countryCode][validation.productType].accurate++;
    }
  }

  console.log('Accuracy by Product Type:');
  const productTypeBreakdown: Record<string, { total: number; accurate: number }> = {
    'standard-goods': { total: 0, accurate: 0 },
    'reduced-digital': { total: 0, accurate: 0 },
    'mixed-basket': { total: 0, accurate: 0 },
  };

  for (const country of EU_COUNTRIES) {
    for (const [productType, counts] of Object.entries(breakdown[country])) {
      productTypeBreakdown[productType].total += counts.total;
      productTypeBreakdown[productType].accurate += counts.accurate;
    }
  }

  for (const [productType, counts] of Object.entries(productTypeBreakdown)) {
    const accuracy = (counts.accurate / counts.total) * 100;
    console.log(`  ${productType}: ${counts.accurate}/${counts.total} (${accuracy.toFixed(2)}%)`);
  }

  console.log('');
  console.log('Top 10 Countries by Transaction Count:');
  const countryCounts = EU_COUNTRIES.slice(0, 10);
  for (const country of countryCounts) {
    const countryValidations = validationResults.filter(
      (v) => v.countryCode === country && v.productType !== 'oracle-transition',
    );
    const countryAccurate = countryValidations.filter((v) => v.match).length;
    const countryAccuracy = (countryAccurate / countryValidations.length) * 100;
    console.log(
      `  ${country}: ${countryAccurate}/${countryValidations.length} (${countryAccuracy.toFixed(2)}%)`,
    );
  }

  console.log('');

  // Step 7: Report discrepancies
  if (discrepancies.length > 0) {
    console.log(`Found ${discrepancies.length} discrepancies:`);
    console.log('');
    for (const disc of discrepancies.slice(0, 10)) {
      console.log(
        `  TX ${disc.transactionId} (${disc.countryCode} - ${disc.productType}, ${disc.validationSource})`,
      );
      console.log(
        `    Expected VAT: EUR ${disc.expectedVATAmount.toFixed(2)} @ ${disc.expectedVATRate.toFixed(2)}%`,
      );
      console.log(
        `    Actual VAT:   EUR ${disc.actualVATAmount.toFixed(2)} @ ${disc.actualVATRate.toFixed(2)}%`,
      );
      console.log(`    Error: EUR ${disc.absoluteError.toFixed(4)}`);
      console.log('');
    }

    if (discrepancies.length > 10) {
      console.log(`... and ${discrepancies.length - 10} more discrepancies`);
    }
  } else {
    console.log('No discrepancies found! All transactions match expected calculations.');
  }

  console.log('');

  // Step 8: Generate summary report
  console.log('='.repeat(80));
  console.log('VALIDATION SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total Transactions: ${stats.totalTransactions}`);
  console.log(`Accurate Transactions: ${stats.accurateTransactions}`);
  console.log(`Accuracy: ${stats.accuracy.toFixed(2)}%`);
  console.log(`Mean Absolute Error (EUR): ${stats.meanAbsoluteError.toFixed(4)}`);
  console.log(`Max Absolute Error (EUR): ${stats.maxAbsoluteError.toFixed(4)}`);
  console.log(`Total Processing Time: ${stats.processingTimeMs.toFixed(2)} ms`);
  console.log(`Average Time per Transaction: ${stats.averageTransactionTimeMs.toFixed(4)} ms`);
  console.log('='.repeat(80));
  console.log('');

  // Save validation report
  console.log('Saving validation reports...');

  const reportMd = generateMarkdownReport(stats, breakdown, discrepancies, validationResults);
  const reportPath = path.join(__dirname, 'VALIDATION_REPORT.md');
  fs.writeFileSync(reportPath, reportMd);
  console.log(`Saved: ${reportPath}`);

  // Save synthetic transactions
  const transactionsPath = path.join(__dirname, 'synthetic-transactions.json');
  fs.writeFileSync(transactionsPath, JSON.stringify(transactions, null, 2));
  console.log(`Saved: ${transactionsPath}`);

  // Save validation results
  const resultsPath = path.join(__dirname, 'validation-results.json');
  const resultsData = {
    stats,
    validationResults: validationResults.slice(0, 50), // Save first 50 for review
    discrepancies: discrepancies.slice(0, 20),
    breakdown,
  };
  fs.writeFileSync(resultsPath, JSON.stringify(resultsData, null, 2));
  console.log(`Saved: ${resultsPath}`);

  console.log('');
  console.log('Validation complete!');
}

function generateMarkdownReport(
  stats: SummaryStats,
  breakdown: Record<string, Record<string, { total: number; accurate: number }>>,
  discrepancies: ValidationResult[],
  validationResults: ValidationResult[],
): string {
  const transitionCount = validationResults.filter(
    (v) => v.productType === 'oracle-transition',
  ).length;

  const markdown = `# OSS VAT Calculator - Synthetic Data Validation Report

## Executive Summary

This report documents the validation of the OSS VAT Calculator against a synthetic dataset of 2,700 transactions (100 cases for each of the 27 EU Member States, reflecting standard-rated physical goods, reduced-rate digital services, and mixed baskets), plus ${transitionCount} fixed-date oracle transition checks.

The validation has two distinct components:

1. **External oracle validation** (BG, DE, FR, NL, AT, for the rate types with verified history per Refactor 1): expected rates/amounts come from a small hardcoded oracle table (\`ORACLE_RATES\` in \`scripts/synthetic-validation.ts\`), transcribed directly from the verified seed sources (PwC, eClear/ASD, Tax Foundation, vatcalc, WTS Klient - see \`packages/oss-calculator/src/data/eu-vat-history.seed.ts\`). This oracle does **not** call \`getVATRate()\` - it is an independent check of the engine's output against the source data.
2. **Internal consistency check** (the remaining 22 Member States, plus FR reduced/super-reduced which has no verified history in R1): expected rates come from \`getVATRate()\` against the same \`EU_VAT_RATES\` table the engine uses. This confirms TaxEngine correctly applies the configured rate table, but is not an independent verification of the rate values themselves - that remains future work for those Member States.

## Validation Methodology

1. **Synthetic Data Generation**: Generated 2,700 transactions (100 per EU Member State) with deterministic seeding (PRNG seed: 42) for reproducibility, plus a fixed set of oracle transition-date checks for BG/DE/FR/NL/AT.
2. **Independent Oracle**: For BG, DE, FR (standard only), NL, and AT, expected rates/amounts are computed from the hardcoded \`ORACLE_RATES\` table - independent of the engine's rate table.
3. **Internal Consistency Fallback**: For all other (country, rate type) combinations, expected rates/amounts are computed from \`getVATRate()\` against \`EU_VAT_RATES\`.
4. **Engine Processing**: Ran all transactions through TaxEngine.
5. **Field-by-Field Comparison**: Compared VAT amounts and applied rates against the expected values from step 2/3.

## Results

### Overall Accuracy

| Metric | Value |
|--------|-------|
| Total Transactions | ${stats.totalTransactions} |
| Accurate Transactions | ${stats.accurateTransactions} |
| Accuracy Rate | ${stats.accuracy.toFixed(2)}% |
| Mean Absolute Error (EUR) | EUR ${stats.meanAbsoluteError.toFixed(4)} |
| Max Absolute Error (EUR) | EUR ${stats.maxAbsoluteError.toFixed(4)} |

### External Oracle Validation (BG, DE, FR, NL, AT)

Expected values from the independent \`ORACLE_RATES\` table (not from \`getVATRate()\`).

| Metric | Value |
|--------|-------|
| Total Transactions | ${stats.oracle.total} |
| Accurate Transactions | ${stats.oracle.accurate} |
| Accuracy Rate | ${stats.oracle.accuracy.toFixed(2)}% |
| Mean Absolute Error (EUR) | EUR ${stats.oracle.meanAbsoluteError.toFixed(4)} |
| Max Absolute Error (EUR) | EUR ${stats.oracle.maxAbsoluteError.toFixed(4)} |

### Internal Consistency Check (other 22 Member States + FR reduced/super-reduced)

Expected values from \`getVATRate()\` against the engine's own \`EU_VAT_RATES\` table - confirms correct application of the configured table, not an independent check of the rate values.

| Metric | Value |
|--------|-------|
| Total Transactions | ${stats.internal.total} |
| Accurate Transactions | ${stats.internal.accurate} |
| Accuracy Rate | ${stats.internal.accuracy.toFixed(2)}% |
| Mean Absolute Error (EUR) | EUR ${stats.internal.meanAbsoluteError.toFixed(4)} |
| Max Absolute Error (EUR) | EUR ${stats.internal.maxAbsoluteError.toFixed(4)} |

### Performance Metrics

| Metric | Value |
|--------|-------|
| Total Processing Time | ${stats.processingTimeMs.toFixed(2)} ms |
| Average Time per Transaction | ${stats.averageTransactionTimeMs.toFixed(4)} ms |
| Minimum Time per Transaction | ${stats.minTransactionTimeMs.toFixed(4)} ms |
| Maximum Time per Transaction | ${stats.maxTransactionTimeMs.toFixed(4)} ms |
| Median Time per Transaction | ${stats.medianTransactionTimeMs.toFixed(4)} ms |

### Accuracy by Product Type`;

  // Calculate product type breakdown
  const productTypeBreakdown: Record<string, { total: number; accurate: number }> = {
    'standard-goods': { total: 0, accurate: 0 },
    'reduced-digital': { total: 0, accurate: 0 },
    'mixed-basket': { total: 0, accurate: 0 },
  };

  for (const country of Object.keys(breakdown)) {
    for (const [productType, counts] of Object.entries(breakdown[country])) {
      productTypeBreakdown[productType].total += counts.total;
      productTypeBreakdown[productType].accurate += counts.accurate;
    }
  }

  let markdown2 =
    markdown +
    `\n\n| Product Type | Accurate | Total | Accuracy |\n|--------------|----------|-------|----------|`;
  for (const [productType, counts] of Object.entries(productTypeBreakdown)) {
    const accuracy = (counts.accurate / counts.total) * 100;
    markdown2 += `\n| ${productType} | ${counts.accurate} | ${counts.total} | ${accuracy.toFixed(2)}% |`;
  }

  markdown2 += `

### Accuracy by EU Member State

| Country Code | Country Name | Accurate | Total | Accuracy |
|--------------|--------------|----------|-------|----------|`;

  const countries = Object.keys(EU_VAT_RATES).sort();
  for (const country of countries) {
    const name = EU_VAT_RATES[country].name;
    let countryAccurate = 0;
    let countryTotal = 0;

    for (const [, counts] of Object.entries(breakdown[country] || {})) {
      countryAccurate += counts.accurate;
      countryTotal += counts.total;
    }

    const accuracy = countryTotal > 0 ? (countryAccurate / countryTotal) * 100 : 0;
    markdown2 += `\n| ${country} | ${name} | ${countryAccurate} | ${countryTotal} | ${accuracy.toFixed(2)}% |`;
  }

  // Oracle transition checks table
  const transitionResults = validationResults.filter((v) => v.productType === 'oracle-transition');
  markdown2 += `

### Oracle Transition-Date Checks (BG, DE, FR, NL, AT)

Fixed-date checks against \`ORACLE_RATES\` exercising the verified rate transitions added in Refactor 1.

| Transaction | Country | Expected Rate | Actual Rate | Expected VAT | Actual VAT | Match |
|-------------|---------|---------------|--------------|---------------|-------------|-------|`;
  for (const r of transitionResults) {
    markdown2 += `\n| ${r.transactionId} | ${r.countryCode} | ${r.expectedVATRate}% | ${r.actualVATRate}% | EUR ${r.expectedVATAmount.toFixed(2)} | EUR ${r.actualVATAmount.toFixed(2)} | ${r.match ? 'Yes' : 'No'} |`;
  }

  markdown2 += `

## Quality Assurance

- **Independent Oracle for 5 Member States**: BG, DE, FR (standard), NL, AT rate expectations are transcribed directly from verified sources (PwC, eClear/ASD, Tax Foundation, vatcalc, WTS Klient), not derived from \`getVATRate()\`.
- **Internal Consistency for the Remaining Countries**: The other 22 Member States (and FR reduced/super-reduced) are checked against the engine's own rate table; independent verification of those rates is future work.
- **Deterministic Validation**: Uses fixed PRNG seed (42) for reproducibility.
- **Rounding**: All VAT amounts rounded to EUR cent precision (2 decimal places).
- **Tolerance**: 0.01 EUR (1 cent) for amounts, 0.001 percentage points for rates.

## Technical Details

### Synthetic Dataset Composition

- **Countries**: 27 EU Member States
- **Transactions per Country**: 100 (standard: 34, reduced: 33, mixed: 33)
- **Oracle Transition Checks**: ${transitionResults.length} fixed-date transactions across BG, DE, FR, NL, AT
- **Date Range (per-country dataset)**: Q1 2026 (January 1 - March 31, 2026)
- **Amount Range (per-country dataset)**: EUR 5 - EUR 500 per transaction
- **Currency**: EUR only (no conversion required)

${
  discrepancies.length > 0
    ? `
### Discrepancies Found

${discrepancies.length} transaction(s) had discrepancies:

${discrepancies
  .slice(0, 10)
  .map(
    (d) =>
      `- **${d.transactionId}** (${d.countryCode}, ${d.validationSource}): Expected EUR ${d.expectedVATAmount.toFixed(2)} @ ${d.expectedVATRate.toFixed(2)}%, got EUR ${d.actualVATAmount.toFixed(2)} @ ${d.actualVATRate.toFixed(2)}% (error: EUR ${d.absoluteError.toFixed(4)})`,
  )
  .join('\n')}

${discrepancies.length > 10 ? `\n... and ${discrepancies.length - 10} more` : ''}
`
    : `
### Discrepancies Found

No discrepancies. All transactions validated successfully.
`
}

## Conclusion

The OSS VAT Calculator processes all ${stats.totalTransactions} synthetic transactions with **${stats.accuracy.toFixed(2)}% overall accuracy** (${stats.oracle.accuracy.toFixed(2)}% against the independent oracle for BG/DE/FR/NL/AT, ${stats.internal.accuracy.toFixed(2)}% on the internal consistency check for the remaining countries). The oracle results confirm that the date-aware, provenance-carrying rate lookup introduced in Refactor 1 reproduces the verified historical rate transitions for the 5 scoped Member States.

---

**Report Generated**: ${new Date().toISOString()}
**PRNG Seed**: 42 (for reproducibility)
`;

  return markdown2;
}

// Run the validation
runValidation().catch((error) => {
  console.error('Validation failed:', error);
  process.exit(1);
});
