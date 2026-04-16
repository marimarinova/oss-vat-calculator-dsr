/**
 * Core type definitions for OSS VAT Calculator
 * Implements the system-wide type contracts per Design Principle 1
 */

/**
 * Represents a VAT transaction in the system
 */
export interface Transaction {
  id: string;
  invoiceId: string;
  timestamp: number;
  sellerId: string;
  buyerId: string;
  buyerCountry: MemberState;
  amount: number; // in cents to avoid floating-point issues
  vatRate: VatRate;
  description?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Represents invoice data for filing
 */
export interface InvoiceData {
  invoiceId: string;
  invoiceDate: string; // ISO 8601
  sellerId: string;
  sellerName: string;
  buyerId: string;
  buyerName: string;
  buyerCountry: MemberState;
  lineItems: LineItem[];
  totalAmount: number;
  totalVat: number;
  vatRate: VatRate;
  metadata?: Record<string, unknown>;
}

/**
 * Line item in an invoice
 */
export interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  vatRate: VatRate;
}

/**
 * OSS Return filing
 */
export interface OssReturn {
  id: string;
  period: string; // YYYY-MM format
  sellerId: string;
  filingDate: string; // ISO 8601
  countries: OssReturnCountry[];
  totalTaxDue: number;
  status: 'draft' | 'submitted' | 'accepted' | 'rejected';
  metadata?: Record<string, unknown>;
}

/**
 * Per-country summary in an OSS return
 */
export interface OssReturnCountry {
  country: MemberState;
  totalTaxableAmount: number;
  totalTaxAmount: number;
  transactions: string[]; // transaction IDs
}

/**
 * VAT rate definition
 */
export interface VatRate {
  rate: number; // percentage, e.g., 19 for 19%
  type: 'standard' | 'reduced' | 'super-reduced' | 'zero';
  country: MemberState;
}

/**
 * All 27 EU member states with ISO 3166-1 alpha-2 codes
 */
export enum MemberState {
  AT = 'AT', // Austria
  BE = 'BE', // Belgium
  BG = 'BG', // Bulgaria
  HR = 'HR', // Croatia
  CY = 'CY', // Cyprus
  CZ = 'CZ', // Czech Republic
  DK = 'DK', // Denmark
  EE = 'EE', // Estonia
  FI = 'FI', // Finland
  FR = 'FR', // France
  DE = 'DE', // Germany
  GR = 'GR', // Greece
  HU = 'HU', // Hungary
  IE = 'IE', // Ireland
  IT = 'IT', // Italy
  LV = 'LV', // Latvia
  LT = 'LT', // Lithuania
  LU = 'LU', // Luxembourg
  MT = 'MT', // Malta
  NL = 'NL', // Netherlands
  PL = 'PL', // Poland
  PT = 'PT', // Portugal
  RO = 'RO', // Romania
  SK = 'SK', // Slovakia
  SI = 'SI', // Slovenia
  ES = 'ES', // Spain
  SE = 'SE', // Sweden
}

/**
 * Get all member states as an array
 */
export function getAllMemberStates(): MemberState[] {
  return Object.values(MemberState);
}

/**
 * Get member state name from code
 */
export function getMemberStateName(code: MemberState): string {
  const names: Record<MemberState, string> = {
    [MemberState.AT]: 'Austria',
    [MemberState.BE]: 'Belgium',
    [MemberState.BG]: 'Bulgaria',
    [MemberState.HR]: 'Croatia',
    [MemberState.CY]: 'Cyprus',
    [MemberState.CZ]: 'Czech Republic',
    [MemberState.DK]: 'Denmark',
    [MemberState.EE]: 'Estonia',
    [MemberState.FI]: 'Finland',
    [MemberState.FR]: 'France',
    [MemberState.DE]: 'Germany',
    [MemberState.GR]: 'Greece',
    [MemberState.HU]: 'Hungary',
    [MemberState.IE]: 'Ireland',
    [MemberState.IT]: 'Italy',
    [MemberState.LV]: 'Latvia',
    [MemberState.LT]: 'Lithuania',
    [MemberState.LU]: 'Luxembourg',
    [MemberState.MT]: 'Malta',
    [MemberState.NL]: 'Netherlands',
    [MemberState.PL]: 'Poland',
    [MemberState.PT]: 'Portugal',
    [MemberState.RO]: 'Romania',
    [MemberState.SK]: 'Slovakia',
    [MemberState.SI]: 'Slovenia',
    [MemberState.ES]: 'Spain',
    [MemberState.SE]: 'Sweden',
  };
  return names[code];
}
