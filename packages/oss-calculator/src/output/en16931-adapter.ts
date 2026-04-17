/**
 * EN 16931 Adapter - UBL 2.1 Invoice
 *
 * Forward compatibility placeholder for EU ViDA compliance (2035).
 * Provides basic UBL 2.1 XML structure as per EN 16931 standard.
 *
 * This is a skeleton implementation for future expansion.
 * Full implementation deferred until ViDA requirements clarify.
 *
 * References:
 * - EN 16931-1:2017 (Semantic data model)
 * - UBL 2.1 Standard (XML Schema)
 * - EU ViDA Directive 2024 (implementation deadline 2035)
 *
 * @author Marieta Marinova
 * @license MIT
 */

import { UBLInvoiceAdapter, UBLGenerationResult, GenerationError } from './types';

/**
 * Generates a basic EN 16931 / UBL 2.1 XML invoice
 *
 * Current implementation provides:
 * - Proper XML structure and namespaces
 * - Mandatory EN 16931 elements
 * - VAT calculation and reporting
 * - Party information
 * - Line items with tax details
 *
 * Not included (forward compatibility):
 * - Electronic signature support
 * - Advanced compliance certifications
 * - ViDA-specific audit trail
 * - Time-stamping service integration
 */
export function generateUBLInvoice(
  invoice: UBLInvoiceAdapter,
): UBLGenerationResult | GenerationError {
  try {
    // Validate invoice structure
    const validationError = validateUBLInvoice(invoice);
    if (validationError) {
      return validationError;
    }

    // Generate XML
    const xml = buildUBLXML(invoice);

    return {
      success: true,
      xml,
      filename: `invoice-${invoice.id}.xml`,
      mimeType: 'application/xml',
      generatedAt: new Date(),
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      error: 'UBL generation failed',
      details: errorMessage,
    };
  }
}

/**
 * Build complete UBL 2.1 XML structure
 */
function buildUBLXML(invoice: UBLInvoiceAdapter): string {
  const escapeXML = (text: string): string => {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  };

  const formatDate = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  const formatAmount = (amount: number): string => {
    return amount.toFixed(2);
  };

  // Build line items XML
  const lineItemsXML = invoice.lineItems
    .map(
      (item, index) => `
    <cac:InvoiceLine>
      <cbc:ID>${index + 1}</cbc:ID>
      <cbc:InvoicedQuantity unitCode="C62">${item.quantity}</cbc:InvoicedQuantity>
      <cbc:LineExtensionAmount currencyID="${escapeXML(invoice.documentCurrencyCode)}">${formatAmount(item.netAmount)}</cbc:LineExtensionAmount>
      <cac:Item>
        <cbc:Description>${escapeXML(item.description)}</cbc:Description>
      </cac:Item>
      <cac:Price>
        <cbc:PriceAmount currencyID="${escapeXML(invoice.documentCurrencyCode)}">${formatAmount(item.unitPrice)}</cbc:PriceAmount>
      </cac:Price>
      <cac:TaxTotal>
        <cbc:TaxAmount currencyID="${escapeXML(invoice.documentCurrencyCode)}">${formatAmount(item.vatAmount)}</cbc:TaxAmount>
        <cac:TaxSubtotal>
          <cbc:TaxableAmount currencyID="${escapeXML(invoice.documentCurrencyCode)}">${formatAmount(item.netAmount)}</cbc:TaxableAmount>
          <cbc:TaxAmount currencyID="${escapeXML(invoice.documentCurrencyCode)}">${formatAmount(item.vatAmount)}</cbc:TaxAmount>
          <cac:TaxCategory>
            <cbc:ID>S</cbc:ID>
            <cbc:Percent>${formatAmount(item.vatRate)}</cbc:Percent>
            <cac:TaxScheme>
              <cbc:ID>VAT</cbc:ID>
            </cac:TaxScheme>
          </cac:TaxCategory>
        </cac:TaxSubtotal>
      </cac:TaxTotal>
    </cac:InvoiceLine>
  `,
    )
    .join('');

  // Build seller party XML
  const sellerXML = buildPartyXML(invoice.seller, 'Seller');

  // Build buyer party XML
  const buyerXML = buildPartyXML(invoice.buyer, 'Buyer');

  // Assemble complete invoice XML
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
         xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2">
  <ext:UBLExtensions>
    <ext:UBLExtension>
      <ext:ExtensionContent/>
    </ext:UBLExtension>
  </ext:UBLExtensions>
  <cbc:UBLVersionID>2.1</cbc:UBLVersionID>
  <cbc:CustomizationID>${escapeXML(invoice.customizationID)}</cbc:CustomizationID>
  <cbc:ProfileID>${escapeXML(invoice.profileID)}</cbc:ProfileID>
  <cbc:ID>${escapeXML(invoice.id)}</cbc:ID>
  <cbc:IssueDate>${formatDate(invoice.issueDate)}</cbc:IssueDate>
  ${invoice.dueDate ? `<cbc:DueDate>${formatDate(invoice.dueDate)}</cbc:DueDate>` : ''}
  <cbc:InvoiceTypeCode>380</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>${escapeXML(invoice.documentCurrencyCode)}</cbc:DocumentCurrencyCode>

  ${sellerXML}

  ${buyerXML}

  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="${escapeXML(invoice.documentCurrencyCode)}">${formatAmount(invoice.totalVATAmount)}</cbc:TaxAmount>
    <cac:TaxSubtotal>
      <cbc:TaxableAmount currencyID="${escapeXML(invoice.documentCurrencyCode)}">${formatAmount(invoice.totalNetAmount)}</cbc:TaxableAmount>
      <cbc:TaxAmount currencyID="${escapeXML(invoice.documentCurrencyCode)}">${formatAmount(invoice.totalVATAmount)}</cbc:TaxAmount>
      <cac:TaxCategory>
        <cbc:ID>S</cbc:ID>
        <cac:TaxScheme>
          <cbc:ID>VAT</cbc:ID>
        </cac:TaxScheme>
      </cac:TaxCategory>
    </cac:TaxSubtotal>
  </cac:TaxTotal>

  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="${escapeXML(invoice.documentCurrencyCode)}">${formatAmount(invoice.totalNetAmount)}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="${escapeXML(invoice.documentCurrencyCode)}">${formatAmount(invoice.totalNetAmount)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="${escapeXML(invoice.documentCurrencyCode)}">${formatAmount(invoice.totalGrossAmount)}</cbc:TaxInclusiveAmount>
    <cbc:PrepaidAmount currencyID="${escapeXML(invoice.documentCurrencyCode)}">0.00</cbc:PrepaidAmount>
    <cbc:PayableAmount currencyID="${escapeXML(invoice.documentCurrencyCode)}">${formatAmount(invoice.totalGrossAmount)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>

${lineItemsXML}

</Invoice>`;

  return xml;
}

/**
 * Build Party (Seller/Buyer) XML block
 */
function buildPartyXML(
  party: {
    name: string;
    address: string;
    city: string;
    postalCode: string;
    country: string;
    vatNumber?: string;
  },
  role: 'Seller' | 'Buyer',
): string {
  const escapeXML = (text: string): string => {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  };

  const elementName = role === 'Seller' ? 'AccountingSupplierParty' : 'AccountingCustomerParty';

  let partyXML = `  <cac:${elementName}>
    <cac:Party>
      <cbc:WebsiteURI/>
      <cac:PartyIdentification>
        <cbc:ID>${party.vatNumber ? escapeXML(party.vatNumber) : 'N/A'}</cbc:ID>
      </cac:PartyIdentification>
      <cac:PartyName>
        <cbc:Name>${escapeXML(party.name)}</cbc:Name>
      </cac:PartyName>
      <cac:PostalAddress>
        <cbc:StreetName>${escapeXML(party.address)}</cbc:StreetName>
        <cbc:CityName>${escapeXML(party.city)}</cbc:CityName>
        <cbc:PostalZone>${escapeXML(party.postalCode)}</cbc:PostalZone>
        <cac:Country>
          <cbc:IdentificationCode>${escapeXML(party.country)}</cbc:IdentificationCode>
        </cac:Country>
      </cac:PostalAddress>
    </cac:Party>`;

  if (role === 'Seller') {
    partyXML += `
    <cac:DespatchContact>
      <cbc:Telephone/>
      <cbc:ElectronicMail/>
    </cac:DespatchContact>
  </cac:${elementName}>`;
  } else {
    partyXML += `
  </cac:${elementName}>`;
  }

  return partyXML;
}

/**
 * Validate UBL invoice structure
 */
function validateUBLInvoice(invoice: UBLInvoiceAdapter): GenerationError | null {
  const errors: string[] = [];

  if (!invoice.id || invoice.id.trim() === '') {
    errors.push('Invoice ID is required');
  }

  if (!invoice.issueDate) {
    errors.push('Issue date is required');
  }

  if (!invoice.documentCurrencyCode || invoice.documentCurrencyCode.trim() === '') {
    errors.push('Document currency code is required');
  }

  if (!invoice.customizationID || invoice.customizationID.trim() === '') {
    errors.push('Customization ID is required');
  }

  if (!invoice.profileID || invoice.profileID.trim() === '') {
    errors.push('Profile ID is required');
  }

  if (invoice.lineItems.length === 0) {
    errors.push('At least one line item is required');
  }

  if (errors.length > 0) {
    return {
      success: false,
      error: 'UBL validation failed',
      details: errors.join('; '),
    };
  }

  return null;
}

/**
 * Convert Invoice type to UBLInvoiceAdapter for XML generation
 * Helper function for easy adaptation from standard Invoice type
 */
export function convertToUBL(invoice: {
  invoiceNumber: string;
  invoiceDate: Date;
  seller: {
    name: string;
    address: string;
    city: string;
    postalCode: string;
    country: string;
    vatNumber?: string;
  };
  buyer: {
    name: string;
    address: string;
    city: string;
    postalCode: string;
    country: string;
    vatNumber?: string;
  };
  lineItems: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    netAmount: number;
    vatRate: number;
    vatAmount: number;
    grossAmount: number;
  }>;
  totalNetAmount: number;
  totalVATAmount: number;
  totalGrossAmount: number;
  currency: string;
}): UBLInvoiceAdapter {
  return {
    customizationID: 'urn:cen.eu:en16931:2017#compliance#T0',
    profileID: 'urn:fdc:peppol.eu:2017:poacc:billing:01:1.0',
    id: invoice.invoiceNumber,
    issueDate: invoice.invoiceDate,
    documentCurrencyCode: invoice.currency,
    seller: invoice.seller,
    buyer: invoice.buyer,
    lineItems: invoice.lineItems,
    totalNetAmount: invoice.totalNetAmount,
    totalVATAmount: invoice.totalVATAmount,
    totalGrossAmount: invoice.totalGrossAmount,
  };
}
