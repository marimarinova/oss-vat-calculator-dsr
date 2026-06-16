/**
 * @oss-vat/oss-calculator/output
 *
 * Layer 3 - Output Generation
 * Exports for PDF invoicing, CSV portal submission, EN 16931 XML adaptation,
 * and Art. 63c OSS record export (IR (EU) 282/2011).
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
} from './types';

// PDF Invoice Generation (Article 226 compliant)
export { generatePDFInvoice } from './pdf-invoice';

// CSV NAP Export (Bulgarian portal compatible)
export { generateNAPExportCSV, aggregateToNAPRows, formatNAPDate } from './csv-nap-export';

// EN 16931 / UBL 2.1 Adapter (forward compatibility for ViDA)
export { generateUBLInvoice, convertToUBL } from './en16931-adapter';

// Art. 63c OSS Record Export (Article 63c IR (EU) 282/2011, 10-year retention)
export {
  NOT_CAPTURED,
  ART63C_CSV_HEADERS,
  retentionUntil,
  buildArt63cRecord,
  buildArt63cDocument,
  exportArt63cCSV,
  exportArt63cJSON,
} from './art63c-record';
export type {
  NotCaptured,
  Art63cInputTransaction,
  Art63cInputCorrection,
  Art63cRecord,
  Art63cMetadata,
  Art63cDocument,
  Art63cCSVResult,
  Art63cJSONResult,
} from './art63c-record';
