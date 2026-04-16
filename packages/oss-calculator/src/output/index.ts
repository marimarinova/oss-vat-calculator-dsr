/**
 * @oss-vat/oss-calculator/output
 *
 * Layer 3 - Output Generation
 * Exports for PDF invoicing, CSV portal submission, and EN 16931 XML adaptation.
 *
 * Design Principle 5: Portal-aligned output with forward compatibility
 *
 * @author Marieta Marinova
 * @license MIT
 */

// Type definitions
export type {
  VATLineItem,
  Party,
  Invoice,
  NAPExportRow,
  NAPExportDocument,
  UBLInvoiceAdapter,
  PDFOptions,
  CSVOptions,
  PDFGenerationResult,
  CSVGenerationResult,
  UBLGenerationResult,
  GenerationError,
} from "./types";

// PDF Invoice Generation (Article 226 compliant)
export { generatePDFInvoice } from "./pdf-invoice";

// CSV NAP Export (Bulgarian portal compatible)
export {
  generateNAPExportCSV,
  aggregateToNAPRows,
  formatNAPDate,
} from "./csv-nap-export";

// EN 16931 / UBL 2.1 Adapter (forward compatibility for ViDA)
export { generateUBLInvoice, convertToUBL } from "./en16931-adapter";
