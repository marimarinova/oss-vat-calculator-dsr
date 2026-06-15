/**
 * EU Distance-Sales / TBE Threshold Monitor (Art. 59c, Directive 2006/112/EC as amended)
 *
 * The EUR 10,000 union-wide threshold covers ONLY cross-border B2C distance
 * sales of goods and TBE (telecommunications, broadcasting & electronic) services.
 * It is tested over the current AND previous calendar year. Once exceeded
 * (in either year), destination-country taxation applies from the transaction
 * that crosses the threshold, and the supplier remains locked into
 * destination taxation for the following calendar year.
 */

/** Union-wide distance-sales / TBE threshold (Art. 59c) */
export const DISTANCE_SALES_THRESHOLD_EUR = 10_000;

const APPROACHING_80_EUR = 8_000;
const APPROACHING_95_EUR = 9_500;

/**
 * Categories of supply relevant to the Art. 59c threshold.
 * Only GOODS_DISTANCE and TBE_SERVICES count towards the threshold;
 * all other categories are ignored by the monitor.
 */
export enum SupplyCategory {
  GOODS_DISTANCE = 'GOODS_DISTANCE',
  TBE_SERVICES = 'TBE_SERVICES',
  OTHER_GOODS = 'OTHER_GOODS',
  OTHER_SERVICES = 'OTHER_SERVICES',
}

/** Status of the union-wide distance-sales/TBE threshold */
export enum DistanceSalesStatus {
  BELOW_THRESHOLD = 'BELOW_THRESHOLD',
  CROSSED = 'CROSSED',
  LOCKED_IN_FROM_PRIOR_YEAR = 'LOCKED_IN_FROM_PRIOR_YEAR',
}

/** Event types emitted by the DistanceSalesMonitor */
export enum DistanceSalesEventType {
  APPROACHING_80 = 'APPROACHING_80',
  APPROACHING_95 = 'APPROACHING_95',
  CROSSED = 'CROSSED',
  LOCKED_IN_FROM_PRIOR_YEAR = 'LOCKED_IN_FROM_PRIOR_YEAR',
}

/** A single threshold-monitor event */
export interface DistanceSalesEvent {
  type: DistanceSalesEventType;
  timestamp: number;
  cumulativeEUR: number;
  transactionId?: string;
  details: string;
}

/**
 * A single supply, as seen by the distance-sales/TBE threshold monitor.
 * Amounts must be net-of-VAT, expressed in EUR.
 */
export interface DistanceSalesTransaction {
  id: string;
  date: Date;
  /** Net-of-VAT amount in EUR */
  netAmountEUR: number;
  customerCountry: string;
  supplierCountry: string;
  /** true for B2C supplies, false for B2B */
  isB2C: boolean;
  category: SupplyCategory;
}

/**
 * Tracks the EUR 10,000 union-wide distance-sales/TBE threshold (Art. 59c)
 * for a single supplier across a calendar year.
 *
 * Only cross-border B2C supplies of goods (distance sales) or TBE services
 * advance the cumulative total. Domestic supplies, B2B supplies, and any
 * other supply category are recorded but do not count towards the threshold.
 */
export class DistanceSalesMonitor {
  private cumulativeEUR = 0;
  private status: DistanceSalesStatus;
  private readonly events: DistanceSalesEvent[] = [];

  private approaching80Emitted = false;
  private approaching95Emitted = false;
  private crossedEmitted = false;

  /**
   * @param exceededPreviousYear - true if the union-wide threshold was
   *   already exceeded in the previous calendar year. If true, this
   *   supplier is immediately locked into destination taxation for the
   *   entire current year (Art. 59c carry-forward rule).
   */
  constructor(exceededPreviousYear = false) {
    if (exceededPreviousYear) {
      this.status = DistanceSalesStatus.LOCKED_IN_FROM_PRIOR_YEAR;
      this.approaching80Emitted = true;
      this.approaching95Emitted = true;
      this.crossedEmitted = true;
      this.events.push({
        type: DistanceSalesEventType.LOCKED_IN_FROM_PRIOR_YEAR,
        timestamp: Date.now(),
        cumulativeEUR: this.cumulativeEUR,
        details:
          'Union-wide distance-sales/TBE threshold was exceeded in the previous calendar ' +
          'year; destination taxation applies for the entire current year (Art. 59c).',
      });
    } else {
      this.status = DistanceSalesStatus.BELOW_THRESHOLD;
    }
  }

  /**
   * Record a supply. Returns the resulting threshold status.
   *
   * Domestic supplies (customerCountry === supplierCountry), B2B supplies
   * (isB2C === false), and supplies outside GOODS_DISTANCE / TBE_SERVICES
   * are recorded but do not advance the cumulative total or change status.
   */
  recordTransaction(transaction: DistanceSalesTransaction): DistanceSalesStatus {
    if (this.status === DistanceSalesStatus.LOCKED_IN_FROM_PRIOR_YEAR) {
      return this.status;
    }

    const isCrossBorder = transaction.customerCountry !== transaction.supplierCountry;
    const isRelevantCategory =
      transaction.category === SupplyCategory.GOODS_DISTANCE ||
      transaction.category === SupplyCategory.TBE_SERVICES;

    if (!transaction.isB2C || !isCrossBorder || !isRelevantCategory) {
      return this.status;
    }

    this.cumulativeEUR += transaction.netAmountEUR;

    if (!this.approaching80Emitted && this.cumulativeEUR >= APPROACHING_80_EUR) {
      this.approaching80Emitted = true;
      this.events.push({
        type: DistanceSalesEventType.APPROACHING_80,
        timestamp: Date.now(),
        cumulativeEUR: this.cumulativeEUR,
        transactionId: transaction.id,
        details: 'Cumulative cross-border B2C distance-sales/TBE supplies reached 80% of the EUR 10,000 threshold.',
      });
    }

    if (!this.approaching95Emitted && this.cumulativeEUR >= APPROACHING_95_EUR) {
      this.approaching95Emitted = true;
      this.events.push({
        type: DistanceSalesEventType.APPROACHING_95,
        timestamp: Date.now(),
        cumulativeEUR: this.cumulativeEUR,
        transactionId: transaction.id,
        details: 'Cumulative cross-border B2C distance-sales/TBE supplies reached 95% of the EUR 10,000 threshold.',
      });
    }

    if (!this.crossedEmitted && this.cumulativeEUR >= DISTANCE_SALES_THRESHOLD_EUR) {
      this.crossedEmitted = true;
      this.status = DistanceSalesStatus.CROSSED;
      this.events.push({
        type: DistanceSalesEventType.CROSSED,
        timestamp: Date.now(),
        cumulativeEUR: this.cumulativeEUR,
        transactionId: transaction.id,
        details: 'EUR 10,000 union-wide distance-sales/TBE threshold (Art. 59c) crossed; destination taxation applies from this transaction.',
      });
    }

    return this.status;
  }

  getStatus(): DistanceSalesStatus {
    return this.status;
  }

  getCumulativeEUR(): number {
    return this.cumulativeEUR;
  }

  getEventLog(): readonly DistanceSalesEvent[] {
    return [...this.events];
  }
}
