/**
 * OSS Registration Threshold Monitor
 *
 * Monitors EUR 10,000 registration threshold in real time
 * Tracks cumulative VAT-taxable supplies across the EU in the current quarter
 * Used to determine when a supplier must register for OSS
 */

/**
 * Threshold status indicating whether supplier has crossed EUR 10,000 limit
 */
export enum ThresholdStatus {
  BELOW_THRESHOLD = 'BELOW_THRESHOLD',
  AT_OR_ABOVE_THRESHOLD = 'AT_OR_ABOVE_THRESHOLD',
}

/**
 * Monthly aggregation of supplies
 */
export interface MonthlySupply {
  month: number; // 1-12
  year: number;
  totalEUR: number; // Total VAT-taxable supplies in EUR
  transactionCount: number;
}

/**
 * Threshold monitoring state for a single quarter
 */
export interface ThresholdMonitorState {
  quarter: number; // 1-4
  year: number;
  cumulativeEUR: number;
  status: ThresholdStatus;
  crossedAt?: Date; // Date when threshold was first exceeded
  monthlyBreakdown: MonthlySupply[];
}

const OSS_REGISTRATION_THRESHOLD_EUR = 10000;

/**
 * Monitor OSS registration threshold in real time
 * Tracks cumulative VAT-taxable supplies across quarters
 */
export class ThresholdMonitor {
  private state: ThresholdMonitorState;

  constructor(quarter: number, year: number) {
    this.validateQuarter(quarter);
    this.state = {
      quarter,
      year,
      cumulativeEUR: 0,
      status: ThresholdStatus.BELOW_THRESHOLD,
      monthlyBreakdown: [],
    };
  }

  /**
   * Record a transaction amount in EUR
   * Returns updated threshold status
   */
  public recordTransaction(amountEUR: number, month: number, year: number): ThresholdStatus {
    if (amountEUR < 0) {
      throw new Error('Transaction amount must be non-negative');
    }

    // Validate month and year match quarter context
    this.validateMonthInQuarter(month, year);

    // Update monthly breakdown
    this.updateMonthlyBreakdown(amountEUR, month, year);

    // Update cumulative
    const previousCumulative = this.state.cumulativeEUR;
    this.state.cumulativeEUR += amountEUR;

    // Check threshold crossing
    if (
      previousCumulative < OSS_REGISTRATION_THRESHOLD_EUR &&
      this.state.cumulativeEUR >= OSS_REGISTRATION_THRESHOLD_EUR
    ) {
      this.state.status = ThresholdStatus.AT_OR_ABOVE_THRESHOLD;
      this.state.crossedAt = new Date();
    } else if (this.state.cumulativeEUR >= OSS_REGISTRATION_THRESHOLD_EUR) {
      this.state.status = ThresholdStatus.AT_OR_ABOVE_THRESHOLD;
    }

    return this.state.status;
  }

  /**
   * Get current threshold status
   */
  public getStatus(): ThresholdStatus {
    return this.state.status;
  }

  /**
   * Get cumulative amount in EUR
   */
  public getCumulativeAmount(): number {
    return this.state.cumulativeEUR;
  }

  /**
   * Get amount remaining until threshold
   */
  public getAmountUntilThreshold(): number {
    const remaining = OSS_REGISTRATION_THRESHOLD_EUR - this.state.cumulativeEUR;
    return Math.max(0, remaining);
  }

  /**
   * Check if threshold has been exceeded
   */
  public hasExceededThreshold(): boolean {
    return this.state.status === ThresholdStatus.AT_OR_ABOVE_THRESHOLD;
  }

  /**
   * Get the date when threshold was crossed (if applicable)
   */
  public getThresholdCrossedDate(): Date | undefined {
    return this.state.crossedAt;
  }

  /**
   * Get monthly breakdown of supplies
   */
  public getMonthlyBreakdown(): MonthlySupply[] {
    return [...this.state.monthlyBreakdown];
  }

  /**
   * Get full monitoring state (snapshot)
   */
  public getState(): ThresholdMonitorState {
    return { ...this.state };
  }

  /**
   * Reset monitor to initial state (useful for new quarter)
   */
  public reset(quarter: number, year: number): void {
    this.validateQuarter(quarter);
    this.state = {
      quarter,
      year,
      cumulativeEUR: 0,
      status: ThresholdStatus.BELOW_THRESHOLD,
      monthlyBreakdown: [],
    };
  }

  /**
   * Get OSS registration threshold constant
   */
  public static getThresholdAmount(): number {
    return OSS_REGISTRATION_THRESHOLD_EUR;
  }

  private updateMonthlyBreakdown(amountEUR: number, month: number, year: number): void {
    const existing = this.state.monthlyBreakdown.find((m) => m.month === month && m.year === year);

    if (existing) {
      existing.totalEUR += amountEUR;
      existing.transactionCount += 1;
    } else {
      this.state.monthlyBreakdown.push({
        month,
        year,
        totalEUR: amountEUR,
        transactionCount: 1,
      });
    }

    // Keep sorted by month
    this.state.monthlyBreakdown.sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.month - b.month;
    });
  }

  private validateQuarter(quarter: number): void {
    if (quarter < 1 || quarter > 4 || !Number.isInteger(quarter)) {
      throw new Error('Quarter must be an integer between 1 and 4');
    }
  }

  private validateMonthInQuarter(month: number, year: number): void {
    if (month < 1 || month > 12 || !Number.isInteger(month)) {
      throw new Error('Month must be an integer between 1 and 12');
    }

    const quarterMonths = {
      1: [1, 2, 3],
      2: [4, 5, 6],
      3: [7, 8, 9],
      4: [10, 11, 12],
    };

    // If year matches state year, validate month is in correct quarter
    if (year === this.state.year) {
      const validMonths = quarterMonths[this.state.quarter as keyof typeof quarterMonths];
      if (!validMonths.includes(month)) {
        throw new Error(`Month ${month} is not in Q${this.state.quarter} of ${year}`);
      }
    }
  }
}

/**
 * Multi-quarter threshold monitor for year-over-year tracking
 */
export class YearlyThresholdMonitor {
  private quarters: Map<string, ThresholdMonitor> = new Map();

  /**
   * Get or create monitor for a specific quarter
   */
  public getOrCreateQuarter(quarter: number, year: number): ThresholdMonitor {
    this.validateQuarter(quarter);
    const key = `Q${quarter}-${year}`;

    if (!this.quarters.has(key)) {
      this.quarters.set(key, new ThresholdMonitor(quarter, year));
    }

    return this.quarters.get(key)!;
  }

  /**
   * Record transaction for a specific quarter
   */
  public recordTransaction(amountEUR: number, month: number, year: number): ThresholdStatus {
    const quarter = this.getQuarterForMonth(month);
    const monitor = this.getOrCreateQuarter(quarter, year);
    return monitor.recordTransaction(amountEUR, month, year);
  }

  /**
   * Get all quarterly states
   */
  public getAllStates(): ThresholdMonitorState[] {
    return Array.from(this.quarters.values()).map((m) => m.getState());
  }

  /**
   * Check if threshold exceeded in any quarter of a year
   */
  public hasExceededThresholdInYear(year: number): boolean {
    return Array.from(this.quarters.values()).some((m) => {
      const state = m.getState();
      return state.year === year && m.hasExceededThreshold();
    });
  }

  private validateQuarter(quarter: number): void {
    if (quarter < 1 || quarter > 4 || !Number.isInteger(quarter)) {
      throw new Error('Quarter must be an integer between 1 and 4');
    }
  }

  private getQuarterForMonth(month: number): number {
    if (month >= 1 && month <= 3) return 1;
    if (month >= 4 && month <= 6) return 2;
    if (month >= 7 && month <= 9) return 3;
    return 4; // months 10-12
  }
}
