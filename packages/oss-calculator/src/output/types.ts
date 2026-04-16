/**
 * Type definitions for Layer 3 - Output Generation
 *
 * Covers PDF invoice generation (Article 226 compliance),
 * CSV export for Bulgarian NAP portal, and EN 16931 UBL adapter.
 *
 * @author Marieta Marinova
 * @license MIT
 */

/**
 * VAT line item for invoice or export
 */
export interface VATLineItem {
  description: string;
  quantity: number;
  unitPrice: number; // net amount per unit
  netAmount: number; // quantity × unitPrice
  vatRate: number; // VAT rate as percentage (e.g., 19 for 19%)
  vatAmount: number; // calculated VAT
  grossAmount: number; // netAmount + vatAmount
}

/**
 * Party identification (buyer or seller)
 */
export interface Party {
  name: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
  vatNumber?: string; // B2B VAT ID, optional for B2C
  email?: string;
  phone?: string;
}

/**
 * Complete invoice document for PDF generation
 * Directive 2006/112/EC, Article 226 compliant
 */
export interface Invoice {
  // Invoice identification
  invoiceNumber: string;
  invoiceDate: Date;
  supplyDate?: Date; // different from invoice date if applicable

  // Parties
  seller: Party;
  buyer: Party;

  // Line items
  lineItems: VATLineItem[];

  // Totals (calculated or validated)
  totalNetAmount: number;
  totalVATAmount: number;
  totalGrossAmount: number;

  // Currency (ISO 4217)
  currency: string;

  // Optional metadata
  paymentTerms?: string;
  notes?: string;
  referenceNumber?: string; // purchase order, etc.
}

/**
 * Single row for Bulgarian NAP OSS portal CSV export
 * Maps to one line in sections 2A, 2B, 2C, or 2D
 */
export interface NAPExportRow {
  section: "2A" | "2B" | "2C" | "2D"; // 2A=services BG, 2B=goods BG, 2C=services other MS, 2D=goods other MS
  memberState: string; // ISO 3166-1 alpha-2 code
  vatRate: number; // as percentage
  taxableAmount: number; // net amount
  vatAmount: number; // calculated VAT
}

/**
 * Complete NAP export document
 * Aggregates rows across sections with metadata
 */
export interface NAPExportDocument {
  rows: NAPExportRow[];
  reportPeriod: {
    year: number;
    quarter: number; // 1-4
  };
  submittingEntity: {
    bulgarianVATNumber: string;
    companyName: string;
  };
  generatedAt: Date;
  totalNetAmount: number;
  totalVATAmount: number;
}

/**
 * EN 16931 UBL 2.1 invoice skeleton
 * Forward compatibility placeholder for ViDA compliance (2035)
 */
export interface UBLInvoiceAdapter {
  customizationID: string; // "urn:cen.eu:en16931:2017#compliance#T0"
  profileID: string; // "urn:fdc:peppol.eu:2017:poacc:billing:01:1.0"
  id: string; // Invoice number
  issueDate: Date;
  dueDate?: Date;
  documentCurrencyCode: string;
  seller: Party;
  buyer: Party;
  lineItems: VATLineItem[];
  totalNetAmount: number;
  totalVATAmount: number;
  totalGrossAmount: number;
}

/**
 * PDF output configuration
 */
export interface PDFOptions {
  format?: "a4" | "letter"; // default: a4
  fontSize?: number; // default: 10
  marginMm?: number; // default: 15
  companyLogo?: {
    dataUrl: string; // base64 or URL
    widthMm: number;
    heightMm: number;
  };
}

/**
 * CSV output configuration
 */
export interface CSVOptions {
  delimiter?: "," | ";" | "\t"; // default: ","
  dateFormat?: "dd.mm.yyyy" | "yyyy-mm-dd"; // default: "dd.mm.yyyy" for NAP compatibility
  decimalSeparator?: "." | ","; // default: "." per NAP spec
  encoding?: "utf-8" | "iso-8859-1"; // default: utf-8
  includeHeader?: boolean; // default: true
}

/**
 * Result of PDF generation
 */
export interface PDFGenerationResult {
  success: boolean;
  pdf: Uint8Array; // PDF binary data
  filename: string;
  mimeType: "application/pdf";
  generatedAt: Date;
}

/**
 * Result of CSV generation
 */
export interface CSVGenerationResult {
  success: boolean;
  csv: string; // CSV text content
  filename: string;
  mimeType: "text/csv";
  generatedAt: Date;
  rowCount: number;
}

/**
 * Result of UBL XML generation
 */
export interface UBLGenerationResult {
  success: boolean;
  xml: string; // XML text content
  filename: string;
  mimeType: "application/xml";
  generatedAt: Date;
}

/**
 * Error result for any output generation
 */
export interface GenerationError {
  success: false;
  error: string;
  details?: string;
}
