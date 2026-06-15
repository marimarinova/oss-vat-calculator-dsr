/**
 * Cross-Border SME Exemption Monitor (Directive (EU) 2020/285)
 *
 * A micro-enterprise may apply the SME exemption in other Member States
 * only if its EU-wide ("union-wide") annual turnover does not exceed
 * EUR 100,000 in BOTH the current calendar year AND the previous calendar
 * year. Exceeding the cap in either year removes eligibility.
 */

/** Union-wide annual turnover cap for the cross-border SME exemption */
export const SME_UNION_TURNOVER_THRESHOLD_EUR = 100_000;

/**
 * Tracks a supplier's EU-wide annual turnover and determines eligibility
 * for the cross-border SME exemption (Directive (EU) 2020/285).
 */
export class SMECrossBorderMonitor {
  private readonly turnoverByYear = new Map<number, number>();
  private readonly currentYear: number;

  constructor(currentYear: number) {
    this.currentYear = currentYear;
  }

  /**
   * Record a supply towards the union-wide annual turnover for the
   * calendar year of `date`.
   *
   * @param amountEUR - Net amount of the supply, in EUR
   * @param customerCountry - Country of the customer (recorded for future
   *   per-destination breakdowns; all supplies count towards the single
   *   union-wide turnover figure regardless of destination)
   * @param date - Date of the supply, used to determine the calendar year
   */
  recordTransaction(amountEUR: number, customerCountry: string, date: Date): void {
    void customerCountry;
    const year = date.getUTCFullYear();
    this.turnoverByYear.set(year, (this.turnoverByYear.get(year) ?? 0) + amountEUR);
  }

  /**
   * @param year - Calendar year
   * @returns Union-wide turnover recorded for that year, in EUR
   */
  getUnionWideTurnoverEUR(year: number): number {
    return this.turnoverByYear.get(year) ?? 0;
  }

  /**
   * @returns true if union-wide turnover was at or below
   *   EUR 100,000 in BOTH the current and the previous calendar year.
   */
  isEligibleForExemption(): boolean {
    const currentYearTurnover = this.getUnionWideTurnoverEUR(this.currentYear);
    const previousYearTurnover = this.getUnionWideTurnoverEUR(this.currentYear - 1);

    return (
      currentYearTurnover <= SME_UNION_TURNOVER_THRESHOLD_EUR &&
      previousYearTurnover <= SME_UNION_TURNOVER_THRESHOLD_EUR
    );
  }
}
