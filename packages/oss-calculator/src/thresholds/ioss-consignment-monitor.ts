/**
 * IOSS Per-Consignment Threshold Monitor (Art. 369l)
 *
 * The Import One-Stop Shop (IOSS) scheme is available only for consignments
 * of goods with an intrinsic value not exceeding EUR 150. The intrinsic
 * value excludes separately-invoiced transport and insurance costs.
 */

/** Per-consignment intrinsic-value cap for IOSS eligibility (Art. 369l) */
export const IOSS_CONSIGNMENT_CAP_EUR = 150;

/**
 * Determines whether a consignment is eligible for the IOSS scheme based on
 * its intrinsic value (Art. 369l).
 */
export class IOSSConsignmentMonitor {
  /**
   * @param intrinsicValueEUR - Intrinsic value of the goods in the
   *   consignment, in EUR, EXCLUDING separately-invoiced transport and
   *   insurance.
   * @returns true if 0 < intrinsicValueEUR <= EUR 150
   */
  isEligible(intrinsicValueEUR: number): boolean {
    return intrinsicValueEUR > 0 && intrinsicValueEUR <= IOSS_CONSIGNMENT_CAP_EUR;
  }
}
