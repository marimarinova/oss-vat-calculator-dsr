/**
 * CSV Exporter for Bulgarian NAP OSS Portal
 *
 * Generates CSV formatted for Bulgaria's National Revenue Agency (NAP)
 * OSS reporting requirements with proper column structure, decimal separators,
 * and date formatting per NAP specifications.
 *
 * Format sections: 2A (services BG), 2B (goods BG), 2C (services other MS), 2D (goods other MS)
 *
 * @author Marieta Marinova
 * @license MIT
 */

import {
  NAPExportDocument,
  NAPExportRow,
  CSVOptions,
  CSVGenerationResult,
  GenerationError,
} from './types';

/**
 * Generates a CSV export compatible with Bulgarian NAP OSS portal
 *
 * NAP Specifications:
 * - Sections: 2A, 2B, 2C, 2D (by goods/services and by MS)
 * - Decimal separator: period (.)
 * - Date format: dd.mm.yyyy
 * - Encoding: UTF-8
 * - No BOM required
 */
export function generateNAPExportCSV(
  document: NAPExportDocument,
  options?: CSVOptions,
): CSVGenerationResult | GenerationError {
  try {
    // Validate document
    const validationError = validateNAPDocument(document);
    if (validationError) {
      return validationError;
    }

    const delimiter = options?.delimiter || ',';
    const decimalSeparator = options?.decimalSeparator || '.';
    const dateFormat = options?.dateFormat || 'dd.mm.yyyy';
    const includeHeader = options?.includeHeader !== false;

    // Build CSV content
    const csvLines: string[] = [];

    // Add header row
    if (includeHeader) {
      csvLines.push(
        ['section', 'member_state', 'vat_rate', 'taxable_amount', 'vat_amount'].join(delimiter),
      );
    }

    // Sort rows by section for better readability
    const sortedRows = [...document.rows].sort((a, b) => a.section.localeCompare(b.section));

    // Add data rows
    for (const row of sortedRows) {
      const formattedRow = formatNAPRow(row, delimiter, decimalSeparator);
      csvLines.push(formattedRow);
    }

    const csv = csvLines.join('\n');

    return {
      success: true,
      csv,
      filename: `NAP-OSS-Q${document.reportPeriod.quarter}-${document.reportPeriod.year}.csv`,
      mimeType: 'text/csv',
      generatedAt: new Date(),
      rowCount: sortedRows.length,
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      error: 'CSV generation failed',
      details: errorMessage,
    };
  }
}

/**
 * Format a single NAP export row as CSV
 * Applies proper decimal formatting and escaping
 */
function formatNAPRow(row: NAPExportRow, delimiter: string, decimalSeparator: string): string {
  const formatNumber = (num: number, decimals = 2): string => {
    const formatted = num.toFixed(decimals);
    if (decimalSeparator === ',') {
      return formatted.replace('.', ',');
    }
    return formatted;
  };

  const csvEscape = (value: string): string => {
    if (value.includes(delimiter) || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  };

  const fields = [
    csvEscape(row.section),
    csvEscape(row.memberState),
    formatNumber(row.vatRate, 2),
    formatNumber(row.taxableAmount, 2),
    formatNumber(row.vatAmount, 2),
  ];

  return fields.join(delimiter);
}

/**
 * Aggregate invoice line items into NAP export rows
 *
 * Takes raw line items and groups them by section and member state
 * to create NAP-compatible export rows with aggregated amounts.
 */
export function aggregateToNAPRows(
  items: Array<{
    description: string;
    netAmount: number;
    vatRate: number;
    vatAmount: number;
    section: '2A' | '2B' | '2C' | '2D';
    memberState: string;
  }>,
): NAPExportRow[] {
  // Group by section and member state
  const grouped = new Map<string, NAPExportRow>();

  for (const item of items) {
    const key = `${item.section}|${item.memberState}`;

    if (!grouped.has(key)) {
      grouped.set(key, {
        section: item.section,
        memberState: item.memberState,
        vatRate: item.vatRate,
        taxableAmount: item.netAmount,
        vatAmount: item.vatAmount,
      });
    } else {
      const existing = grouped.get(key)!;
      existing.taxableAmount += item.netAmount;
      existing.vatAmount += item.vatAmount;

      // Validate VAT rates match within same section/MS combination
      if (existing.vatRate !== item.vatRate) {
        console.warn(
          `Warning: Different VAT rates for section ${item.section}, ${item.memberState}: ` +
            `${existing.vatRate}% vs ${item.vatRate}%`,
        );
      }
    }
  }

  return Array.from(grouped.values());
}

/**
 * Format date according to NAP specification
 */
export function formatNAPDate(date: Date, format: string = 'dd.mm.yyyy'): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();

  if (format === 'yyyy-mm-dd') {
    return `${year}-${month}-${day}`;
  }

  // Default dd.mm.yyyy
  return `${day}.${month}.${year}`;
}

/**
 * Validate NAP export document
 */
function validateNAPDocument(document: NAPExportDocument): GenerationError | null {
  const errors: string[] = [];

  // Check basic structure
  if (
    !document.reportPeriod ||
    document.reportPeriod.quarter < 1 ||
    document.reportPeriod.quarter > 4
  ) {
    errors.push('Invalid report period: quarter must be 1-4');
  }

  if (!document.reportPeriod.year || document.reportPeriod.year < 2015) {
    errors.push('Invalid report period: year must be 2015 or later');
  }

  // Check submitting entity
  if (!document.submittingEntity.bulgarianVATNumber) {
    errors.push('Bulgarian VAT number is required');
  }

  if (!document.submittingEntity.companyName) {
    errors.push('Company name is required');
  }

  // Check row validity
  if (document.rows.length === 0) {
    errors.push('At least one export row is required');
  }

  for (let i = 0; i < document.rows.length; i++) {
    const row = document.rows[i];

    if (!['2A', '2B', '2C', '2D'].includes(row.section)) {
      errors.push(`Row ${i + 1}: Invalid section "${row.section}"`);
    }

    if (!row.memberState || !/^[A-Z]{2}$/.test(row.memberState)) {
      errors.push(
        `Row ${i + 1}: Invalid member state "${row.memberState}" (must be 2-letter code)`,
      );
    }

    if (row.vatRate < 0 || row.vatRate > 100) {
      errors.push(`Row ${i + 1}: VAT rate must be between 0-100%`);
    }

    if (row.taxableAmount < 0) {
      errors.push(`Row ${i + 1}: Taxable amount cannot be negative`);
    }

    if (row.vatAmount < 0) {
      errors.push(`Row ${i + 1}: VAT amount cannot be negative`);
    }

    // Validate VAT calculation (allow small rounding errors)
    const expectedVAT = (row.taxableAmount * row.vatRate) / 100;
    const difference = Math.abs(expectedVAT - row.vatAmount);
    if (difference > 0.01) {
      errors.push(
        `Row ${i + 1}: VAT calculation mismatch. Expected ${expectedVAT.toFixed(2)}, ` +
          `got ${row.vatAmount.toFixed(2)}`,
      );
    }
  }

  // Check totals
  const sumNetAmount = document.rows.reduce((sum, row) => sum + row.taxableAmount, 0);
  const sumVATAmount = document.rows.reduce((sum, row) => sum + row.vatAmount, 0);

  const netDiff = Math.abs(sumNetAmount - document.totalNetAmount);
  const vatDiff = Math.abs(sumVATAmount - document.totalVATAmount);

  if (netDiff > 0.01) {
    errors.push(
      `Total net amount mismatch: sum of rows is ${sumNetAmount.toFixed(2)}, ` +
        `document declares ${document.totalNetAmount.toFixed(2)}`,
    );
  }

  if (vatDiff > 0.01) {
    errors.push(
      `Total VAT amount mismatch: sum of rows is ${sumVATAmount.toFixed(2)}, ` +
        `document declares ${document.totalVATAmount.toFixed(2)}`,
    );
  }

  if (errors.length > 0) {
    return {
      success: false,
      error: 'NAP document validation failed',
      details: errors.join('; '),
    };
  }

  return null;
}
