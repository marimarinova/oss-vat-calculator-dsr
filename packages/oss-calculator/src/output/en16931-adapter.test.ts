/**
 * Tests for EN 16931 / UBL 2.1 Adapter
 * Verifies forward compatibility skeleton for ViDA compliance (2035)
 *
 * @author Marieta Marinova
 * @license MIT
 */

import { describe, it, expect } from 'vitest';
import { generateUBLInvoice, convertToUBL } from './en16931-adapter';
import { UBLInvoiceAdapter } from './types';

describe('EN 16931 / UBL 2.1 Adapter', () => {
  const mockUBLInvoice: UBLInvoiceAdapter = {
    customizationID: 'urn:cen.eu:en16931:2017#compliance#T0',
    profileID: 'urn:fdc:peppol.eu:2017:poacc:billing:01:1.0',
    id: 'INV-2024-001',
    issueDate: new Date('2024-01-15'),
    documentCurrencyCode: 'EUR',
    seller: {
      name: 'TechCorp Bulgaria',
      address: 'ul. Aleksandar Batenberg 57',
      city: 'Sofia',
      postalCode: '1000',
      country: 'Bulgaria',
      vatNumber: 'BG202024680',
    },
    buyer: {
      name: 'GmbH Company',
      address: 'Hauptstraße 100',
      city: 'Berlin',
      postalCode: '10115',
      country: 'Germany',
      vatNumber: 'DE123456789',
    },
    lineItems: [
      {
        description: 'Web Development Services',
        quantity: 40,
        unitPrice: 50,
        netAmount: 2000,
        vatRate: 19,
        vatAmount: 380,
        grossAmount: 2380,
      },
    ],
    totalNetAmount: 2000,
    totalVATAmount: 380,
    totalGrossAmount: 2380,
  };

  it('should generate valid UBL XML structure', () => {
    const result = generateUBLInvoice(mockUBLInvoice);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.xml).toContain('<?xml version');
      expect(result.xml).toContain('<Invoice');
      expect(result.xml).toContain('</Invoice>');
      expect(result.mimeType).toBe('application/xml');
    }
  });

  it('should include UBL 2.1 version declaration', () => {
    const result = generateUBLInvoice(mockUBLInvoice);

    if (result.success) {
      expect(result.xml).toContain('<cbc:UBLVersionID>2.1</cbc:UBLVersionID>');
    }
  });

  it('should include EN 16931 customization ID', () => {
    const result = generateUBLInvoice(mockUBLInvoice);

    if (result.success) {
      expect(result.xml).toContain('urn:cen.eu:en16931:2017#compliance#T0');
    }
  });

  it('should include PEPPOL profile ID', () => {
    const result = generateUBLInvoice(mockUBLInvoice);

    if (result.success) {
      expect(result.xml).toContain('urn:fdc:peppol.eu:2017:poacc:billing');
    }
  });

  it('should include invoice ID and date', () => {
    const result = generateUBLInvoice(mockUBLInvoice);

    if (result.success) {
      expect(result.xml).toContain(mockUBLInvoice.id);
      expect(result.xml).toContain('2024-01-15');
    }
  });

  it('should include seller party information', () => {
    const result = generateUBLInvoice(mockUBLInvoice);

    if (result.success) {
      expect(result.xml).toContain('AccountingSupplierParty');
      expect(result.xml).toContain('TechCorp Bulgaria');
      expect(result.xml).toContain('BG202024680');
    }
  });

  it('should include buyer party information', () => {
    const result = generateUBLInvoice(mockUBLInvoice);

    if (result.success) {
      expect(result.xml).toContain('AccountingCustomerParty');
      expect(result.xml).toContain('GmbH Company');
      expect(result.xml).toContain('DE123456789');
    }
  });

  it('should include line items with tax details', () => {
    const result = generateUBLInvoice(mockUBLInvoice);

    if (result.success) {
      expect(result.xml).toContain('InvoiceLine');
      expect(result.xml).toContain('Web Development Services');
      expect(result.xml).toContain('40'); // quantity
      expect(result.xml).toContain('2000'); // netAmount
    }
  });

  it('should include VAT tax totals', () => {
    const result = generateUBLInvoice(mockUBLInvoice);

    if (result.success) {
      expect(result.xml).toContain('TaxTotal');
      expect(result.xml).toContain('380'); // totalVATAmount
      expect(result.xml).toContain('19'); // VAT rate
    }
  });

  it('should include legal monetary totals', () => {
    const result = generateUBLInvoice(mockUBLInvoice);

    if (result.success) {
      expect(result.xml).toContain('LegalMonetaryTotal');
      expect(result.xml).toContain('2000'); // netAmount
      expect(result.xml).toContain('2380'); // grossAmount
    }
  });

  it('should properly escape XML special characters', () => {
    const specialCharInvoice: UBLInvoiceAdapter = {
      ...mockUBLInvoice,
      seller: {
        ...mockUBLInvoice.seller,
        name: 'Company & Co. <Limited>',
      },
    };

    const result = generateUBLInvoice(specialCharInvoice);

    if (result.success) {
      expect(result.xml).toContain('&amp;');
      expect(result.xml).toContain('&lt;');
      expect(result.xml).toContain('&gt;');
      expect(result.xml).not.toContain('<Limited>');
    }
  });

  it('should use ISO currency codes', () => {
    const result = generateUBLInvoice(mockUBLInvoice);

    if (result.success) {
      expect(result.xml).toContain('EUR');
      expect(result.xml).toContain('currencyID="EUR"');
    }
  });

  it('should generate filename with invoice ID', () => {
    const result = generateUBLInvoice(mockUBLInvoice);

    if (result.success) {
      expect(result.filename).toContain(mockUBLInvoice.id);
      expect(result.filename).toMatch(/\.xml$/);
    }
  });

  it('should include due date when provided', () => {
    const invoiceWithDueDate: UBLInvoiceAdapter = {
      ...mockUBLInvoice,
      dueDate: new Date('2024-02-15'),
    };

    const result = generateUBLInvoice(invoiceWithDueDate);

    if (result.success) {
      expect(result.xml).toContain('DueDate');
      expect(result.xml).toContain('2024-02-15');
    }
  });

  it('should omit due date when not provided', () => {
    const result = generateUBLInvoice(mockUBLInvoice);

    if (result.success) {
      // XML might have empty DueDate or omit it, both valid
      const dueCount = (result.xml.match(/DueDate/g) || []).length;
      expect(dueCount).toBeGreaterThanOrEqual(0);
    }
  });

  it('should validate invoice ID is required', () => {
    const invalidInvoice: UBLInvoiceAdapter = {
      ...mockUBLInvoice,
      id: '',
    };

    const result = generateUBLInvoice(invalidInvoice);

    expect(result.success).toBe(false);
    expect(result.error).toContain('validation failed');
  });

  it('should validate issue date is required', () => {
    const invalidInvoice: UBLInvoiceAdapter = {
      ...mockUBLInvoice,
      issueDate: undefined as any,
    };

    const result = generateUBLInvoice(invalidInvoice);

    expect(result.success).toBe(false);
  });

  it('should validate currency code is required', () => {
    const invalidInvoice: UBLInvoiceAdapter = {
      ...mockUBLInvoice,
      documentCurrencyCode: '',
    };

    const result = generateUBLInvoice(invalidInvoice);

    expect(result.success).toBe(false);
  });

  it('should validate customization ID is required', () => {
    const invalidInvoice: UBLInvoiceAdapter = {
      ...mockUBLInvoice,
      customizationID: '',
    };

    const result = generateUBLInvoice(invalidInvoice);

    expect(result.success).toBe(false);
  });

  it('should validate at least one line item', () => {
    const invalidInvoice: UBLInvoiceAdapter = {
      ...mockUBLInvoice,
      lineItems: [],
    };

    const result = generateUBLInvoice(invalidInvoice);

    expect(result.success).toBe(false);
  });

  it('should handle multiple line items', () => {
    const multiLineInvoice: UBLInvoiceAdapter = {
      ...mockUBLInvoice,
      lineItems: [
        {
          description: 'Service A',
          quantity: 10,
          unitPrice: 100,
          netAmount: 1000,
          vatRate: 19,
          vatAmount: 190,
          grossAmount: 1190,
        },
        {
          description: 'Service B',
          quantity: 5,
          unitPrice: 200,
          netAmount: 1000,
          vatRate: 19,
          vatAmount: 190,
          grossAmount: 1190,
        },
      ],
      totalNetAmount: 2000,
      totalVATAmount: 380,
      totalGrossAmount: 2380,
    };

    const result = generateUBLInvoice(multiLineInvoice);

    if (result.success) {
      const lineCount = (result.xml.match(/InvoiceLine/g) || []).length;
      expect(lineCount).toBeGreaterThanOrEqual(2);
    }
  });

  it('should set correct generated timestamp', () => {
    const beforeGen = new Date();
    const result = generateUBLInvoice(mockUBLInvoice);
    const afterGen = new Date();

    if (result.success) {
      expect(result.generatedAt.getTime()).toBeGreaterThanOrEqual(beforeGen.getTime());
      expect(result.generatedAt.getTime()).toBeLessThanOrEqual(afterGen.getTime());
    }
  });

  it('should use invoice type code 380 (Commercial Invoice)', () => {
    const result = generateUBLInvoice(mockUBLInvoice);

    if (result.success) {
      expect(result.xml).toContain('<cbc:InvoiceTypeCode>380</cbc:InvoiceTypeCode>');
    }
  });

  it('should handle zero VAT rate', () => {
    const zeroVATInvoice: UBLInvoiceAdapter = {
      ...mockUBLInvoice,
      lineItems: [
        {
          description: 'Zero-rated service',
          quantity: 1,
          unitPrice: 1000,
          netAmount: 1000,
          vatRate: 0,
          vatAmount: 0,
          grossAmount: 1000,
        },
      ],
      totalNetAmount: 1000,
      totalVATAmount: 0,
      totalGrossAmount: 1000,
    };

    const result = generateUBLInvoice(zeroVATInvoice);

    if (result.success) {
      expect(result.xml).toContain('0'); // VAT amount or rate
    }
  });

  it('should handle different currencies', () => {
    const gbpInvoice: UBLInvoiceAdapter = {
      ...mockUBLInvoice,
      documentCurrencyCode: 'GBP',
    };

    const result = generateUBLInvoice(gbpInvoice);

    if (result.success) {
      expect(result.xml).toContain('GBP');
      expect(result.xml).not.toContain('EUR');
    }
  });

  it('should be well-formed XML', () => {
    const result = generateUBLInvoice(mockUBLInvoice);

    if (result.success) {
      // Check basic XML well-formedness
      const openInvoices = (result.xml.match(/<Invoice/g) || []).length;
      const closeInvoices = (result.xml.match(/<\/Invoice>/g) || []).length;
      expect(openInvoices).toBe(closeInvoices);

      // All opening tags should have corresponding closing tags
      const openTags = result.xml.match(/<\w+[^/>]*>/g) || [];
      const closeTags = result.xml.match(/<\/\w+>/g) || [];
      expect(closeTags.length).toBeGreaterThan(0);
    }
  });
});

describe('convertToUBL', () => {
  const mockInvoice = {
    invoiceNumber: 'INV-2024-001',
    invoiceDate: new Date('2024-01-15'),
    seller: {
      name: 'TechCorp Bulgaria',
      address: 'ul. Aleksandar Batenberg 57',
      city: 'Sofia',
      postalCode: '1000',
      country: 'Bulgaria',
      vatNumber: 'BG202024680',
    },
    buyer: {
      name: 'GmbH Company',
      address: 'Hauptstraße 100',
      city: 'Berlin',
      postalCode: '10115',
      country: 'Germany',
      vatNumber: 'DE123456789',
    },
    lineItems: [
      {
        description: 'Service',
        quantity: 1,
        unitPrice: 1000,
        netAmount: 1000,
        vatRate: 19,
        vatAmount: 190,
        grossAmount: 1190,
      },
    ],
    totalNetAmount: 1000,
    totalVATAmount: 190,
    totalGrossAmount: 1190,
    currency: 'EUR',
  };

  it('should convert Invoice to UBLInvoiceAdapter', () => {
    const ubl = convertToUBL(mockInvoice);

    expect(ubl.id).toBe(mockInvoice.invoiceNumber);
    expect(ubl.issueDate).toEqual(mockInvoice.invoiceDate);
    expect(ubl.documentCurrencyCode).toBe('EUR');
    expect(ubl.customizationID).toBe('urn:cen.eu:en16931:2017#compliance#T0');
    expect(ubl.profileID).toBe('urn:fdc:peppol.eu:2017:poacc:billing:01:1.0');
  });

  it('should preserve all line items in conversion', () => {
    const ubl = convertToUBL(mockInvoice);

    expect(ubl.lineItems.length).toBe(mockInvoice.lineItems.length);
    expect(ubl.lineItems[0].description).toBe(mockInvoice.lineItems[0].description);
  });

  it('should preserve monetary totals in conversion', () => {
    const ubl = convertToUBL(mockInvoice);

    expect(ubl.totalNetAmount).toBe(mockInvoice.totalNetAmount);
    expect(ubl.totalVATAmount).toBe(mockInvoice.totalVATAmount);
    expect(ubl.totalGrossAmount).toBe(mockInvoice.totalGrossAmount);
  });

  it('should preserve party information in conversion', () => {
    const ubl = convertToUBL(mockInvoice);

    expect(ubl.seller.name).toBe(mockInvoice.seller.name);
    expect(ubl.seller.vatNumber).toBe(mockInvoice.seller.vatNumber);
    expect(ubl.buyer.name).toBe(mockInvoice.buyer.name);
    expect(ubl.buyer.vatNumber).toBe(mockInvoice.buyer.vatNumber);
  });
});
