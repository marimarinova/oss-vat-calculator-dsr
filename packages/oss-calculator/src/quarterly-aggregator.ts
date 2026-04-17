/**
 * Quarterly VAT Return Aggregation
 *
 * Aggregates VAT calculation results by Member State
 * Generates OSS return structure matching NAP Bulgaria form
 * Sections 2A-2D: Breakdown by goods/services and supply origin
 */

import { VATCalculationResult } from './tax-engine';

/**
 * Single line item in a VAT return section
 */
export interface ReturnLineItem {
  memberState: string; // Country code
  memberStateName: string;
  vatAmount: number; // VAT amount in EUR
  baseAmount: number; // Taxable amount in EUR
  supplyCount: number; // Number of supplies in this aggregate
}

/**
 * VAT return section (one of 2A, 2B, 2C, 2D)
 */
export interface ReturnSection {
  name: string; // Section identifier (2A, 2B, 2C, 2D)
  description: string; // Human-readable description
  items: ReturnLineItem[];
  totalVAT: number;
  totalBase: number;
  totalSupplies: number;
}

/**
 * Complete OSS VAT return for a quarter
 * Structure matching NAP Bulgaria form
 */
export interface OSSVATReturn {
  quarter: number; // 1-4
  year: number;
  supplierCountryCode: string; // Country of OSS-registered supplier
  returnDate: Date; // When return is filed
  sections: {
    section2A: ReturnSection; // Services supplied from BG
    section2B: ReturnSection; // Goods supplied from BG
    section2C: ReturnSection; // Services supplied from other MS
    section2D: ReturnSection; // Goods supplied from other MS
  };
  totalVAT: number;
  totalBase: number;
}

/**
 * Country metadata for return formatting
 */
const EU_MEMBER_STATES: Record<string, string> = {
  AT: 'Austria',
  BE: 'Belgium',
  BG: 'Bulgaria',
  HR: 'Croatia',
  CY: 'Cyprus',
  CZ: 'Czech Republic',
  DE: 'Germany',
  DK: 'Denmark',
  EE: 'Estonia',
  ES: 'Spain',
  FI: 'Finland',
  FR: 'France',
  GB: 'United Kingdom',
  EL: 'Greece',
  HU: 'Hungary',
  IE: 'Ireland',
  IT: 'Italy',
  LV: 'Latvia',
  LT: 'Lithuania',
  LU: 'Luxembourg',
  MT: 'Malta',
  NL: 'Netherlands',
  PL: 'Poland',
  PT: 'Portugal',
  RO: 'Romania',
  SK: 'Slovakia',
  SI: 'Slovenia',
  SE: 'Sweden',
};

/**
 * Aggregates VAT calculations into quarterly return sections
 * Matches NAP Bulgaria form structure (2A, 2B, 2C, 2D)
 */
export class QuarterlyAggregator {
  private quarter: number;
  private year: number;
  private supplierCountryCode: string;

  constructor(quarter: number, year: number, supplierCountryCode: string) {
    this.validateQuarter(quarter);
    if (!supplierCountryCode || supplierCountryCode.length !== 2) {
      throw new Error('Supplier country code must be a valid 2-letter code');
    }
    this.quarter = quarter;
    this.year = year;
    this.supplierCountryCode = supplierCountryCode;
  }

  /**
   * Aggregate VAT calculation results into quarterly return
   * Organizes by country and supply type (goods/services, origin)
   */
  public aggregate(results: VATCalculationResult[]): OSSVATReturn {
    // Initialize section accumulators
    const section2A = new Map<string, ReturnLineItem>(); // Services from supplier country
    const section2B = new Map<string, ReturnLineItem>(); // Goods from supplier country
    const section2C = new Map<string, ReturnLineItem>(); // Services from other MS
    const section2D = new Map<string, ReturnLineItem>(); // Goods from other MS

    // Aggregate results
    for (const result of results) {
      const isFromSupplier = result.supplierCountryCode === this.supplierCountryCode;
      const isGoods = result.isGoods;
      const key = result.customerCountryCode;

      // Determine which section this belongs to
      let section: Map<string, ReturnLineItem>;
      if (isFromSupplier && !isGoods) {
        section = section2A; // Services from supplier country
      } else if (isFromSupplier && isGoods) {
        section = section2B; // Goods from supplier country
      } else if (!isFromSupplier && !isGoods) {
        section = section2C; // Services from other MS
      } else {
        section = section2D; // Goods from other MS
      }

      // Accumulate or create line item
      if (section.has(key)) {
        const item = section.get(key)!;
        item.vatAmount += result.vatAmount;
        item.baseAmount += result.amountEUR;
        item.supplyCount += 1;
      } else {
        section.set(key, {
          memberState: key,
          memberStateName: EU_MEMBER_STATES[key] || key,
          vatAmount: result.vatAmount,
          baseAmount: result.amountEUR,
          supplyCount: 1,
        });
      }
    }

    // Build return sections
    return {
      quarter: this.quarter,
      year: this.year,
      supplierCountryCode: this.supplierCountryCode,
      returnDate: new Date(),
      sections: {
        section2A: this.buildSection(
          '2A',
          'Services supplied from ' + this.supplierCountryCode,
          section2A,
        ),
        section2B: this.buildSection(
          '2B',
          'Goods supplied from ' + this.supplierCountryCode,
          section2B,
        ),
        section2C: this.buildSection('2C', 'Services supplied from other MS', section2C),
        section2D: this.buildSection('2D', 'Goods supplied from other MS', section2D),
      },
      totalVAT: this.calculateTotalVAT([
        ...section2A.values(),
        ...section2B.values(),
        ...section2C.values(),
        ...section2D.values(),
      ]),
      totalBase: this.calculateTotalBase([
        ...section2A.values(),
        ...section2B.values(),
        ...section2C.values(),
        ...section2D.values(),
      ]),
    };
  }

  /**
   * Build a return section from accumulated line items
   */
  private buildSection(
    name: string,
    description: string,
    items: Map<string, ReturnLineItem>,
  ): ReturnSection {
    const itemList = Array.from(items.values()).sort((a, b) =>
      a.memberState.localeCompare(b.memberState),
    );

    return {
      name,
      description,
      items: itemList,
      totalVAT: this.roundToEURCents(itemList.reduce((sum, item) => sum + item.vatAmount, 0)),
      totalBase: this.roundToEURCents(itemList.reduce((sum, item) => sum + item.baseAmount, 0)),
      totalSupplies: itemList.reduce((sum, item) => sum + item.supplyCount, 0),
    };
  }

  /**
   * Format return for export/submission
   * Returns human-readable structure suitable for filing
   */
  public formatForSubmission(returnData: OSSVATReturn): string {
    const sections = [
      returnData.sections.section2A,
      returnData.sections.section2B,
      returnData.sections.section2C,
      returnData.sections.section2D,
    ];

    let output = `OSS VAT RETURN - Q${returnData.quarter} ${returnData.year}\n`;
    output += `Supplier Country: ${returnData.supplierCountryCode}\n`;
    output += `Filing Date: ${returnData.returnDate.toISOString().split('T')[0]}\n`;
    output += '='.repeat(80) + '\n\n';

    for (const section of sections) {
      if (section.items.length === 0) continue;

      output += `${section.name}: ${section.description}\n`;
      output += '-'.repeat(80) + '\n';
      output += `${'Member State'.padEnd(20)} ${'Base (EUR)'.padStart(15)} ${'VAT (EUR)'.padStart(15)} ${'Count'.padStart(10)}\n`;
      output += '-'.repeat(80) + '\n';

      for (const item of section.items) {
        output += `${item.memberState.padEnd(20)} ${item.baseAmount.toFixed(2).padStart(15)} ${item.vatAmount.toFixed(2).padStart(15)} ${item.supplyCount.toString().padStart(10)}\n`;
      }

      output += '-'.repeat(80) + '\n';
      output += `${'SECTION TOTAL'.padEnd(20)} ${section.totalBase.toFixed(2).padStart(15)} ${section.totalVAT.toFixed(2).padStart(15)} ${section.totalSupplies.toString().padStart(10)}\n`;
      output += '\n';
    }

    output += '='.repeat(80) + '\n';
    output += `${'GRAND TOTAL'.padEnd(20)} ${returnData.totalBase.toFixed(2).padStart(15)} ${returnData.totalVAT.toFixed(2).padStart(15)}\n`;

    return output;
  }

  /**
   * Export return as structured JSON for data interchange
   */
  public exportAsJSON(returnData: OSSVATReturn): string {
    return JSON.stringify(returnData, null, 2);
  }

  private calculateTotalVAT(items: ReturnLineItem[]): number {
    return this.roundToEURCents(items.reduce((sum, item) => sum + item.vatAmount, 0));
  }

  private calculateTotalBase(items: ReturnLineItem[]): number {
    return this.roundToEURCents(items.reduce((sum, item) => sum + item.baseAmount, 0));
  }

  private roundToEURCents(amount: number): number {
    return Math.round(amount * 100) / 100;
  }

  private validateQuarter(quarter: number): void {
    if (quarter < 1 || quarter > 4 || !Number.isInteger(quarter)) {
      throw new Error('Quarter must be an integer between 1 and 4');
    }
  }
}
