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
} from './vat-rates';

// ECB currency conversion
export {
  ExchangeRate,
  ECB_DECIMAL_PLACES,
  ECBRateProvider,
  CurrencyConverter,
  createDefaultECBProvider,
} from './ecb-rates';

// Tax calculation engine
export {
  Transaction,
  VATCalculationResult,
  TaxEngineConfig,
  TaxEngine,
} from './tax-engine';

// Threshold monitoring
export {
  ThresholdStatus,
  MonthlySupply,
  ThresholdMonitorState,
  ThresholdMonitor,
  YearlyThresholdMonitor,
} from './threshold-monitor';

// Quarterly aggregation
export {
  ReturnLineItem,
  ReturnSection,
  OSSVATReturn,
  QuarterlyAggregator,
} from './quarterly-aggregator';

// Layer 3 - Output Generation
export * from './output';
