/**
 * @oss-vat/oss-calculator
 *
 * Primary DSR artefact for automated cross-border VAT OSS compliance.
 * EU micro-enterprise focused, NAP Bulgaria primary adapter.
 *
 * Layer 2 - VAT Calculation Engine
 * Design Principle 4: Deterministic calculation with transparent rate sources
 *
 * @author Marieta Marinova
 * @license MIT
 */

// Error types
export {
  VATCalculationError,
  MissingCountryCodeError,
  RateMismatchError,
  CurrencyRoundingError,
  InvalidVATRateError,
  ECBRateNotFoundError,
} from './errors';

// VAT rates module
export {
  VATRate,
  MemberStateRates,
  EU_VAT_RATES,
  getMemberStateRates,
  getVATRate,
  verifyVATRate,
  getAllCountryCodes,
  isValidEUCountry,
  assertNoOverlappingIntervals,
} from './vat-rates';

// ECB daily currency conversion (Art. 91(2) VAT Directive)
export {
  ConversionPolicy,
  DailyECBRate,
  ConversionResult,
  ECB_DECIMAL_PLACES,
  HRK_RETIRED_AT,
  registerDailyRate,
  clearDailyRates,
  convert,
} from './ecb-rates';

// ECB XML feed parser
export { parseECBDailyXML } from './ecb-feed';

// Tax calculation engine
export {
  Transaction,
  Correction,
  VATCalculationResult,
  TaxEngineConfig,
  TaxEngine,
} from './tax-engine';

// Threshold monitoring
export {
  DISTANCE_SALES_THRESHOLD_EUR,
  SupplyCategory,
  DistanceSalesStatus,
  DistanceSalesEventType,
  DistanceSalesEvent,
  DistanceSalesTransaction,
  DistanceSalesMonitor,
  IOSS_CONSIGNMENT_CAP_EUR,
  IOSSConsignmentMonitor,
} from './thresholds';

// Quarterly aggregation
export {
  ReturnLineItem,
  ReturnSection,
  OSSVATReturn,
  QuarterlyAggregator,
} from './quarterly-aggregator';

// Layer 3 - Output Generation
export * from './output';
