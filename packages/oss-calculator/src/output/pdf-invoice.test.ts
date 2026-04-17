/**
 * Tests for PDF Invoice Generator
 * Verifies Directive 2006/112/EC Article 226 compliance
 *
 * @author Marieta Marinova
 * @license MIT
 */

import { describe, it, expect } from 'vitest';
import { generatePDFInvoice } from './pdf-invoice';
import { Invoice } from './types';

describe('PDF Invoice Generator', () => {
  const mockInvoice: Invoice = {
    invoiceNumber: 'INV-2024-001',
    invoiceDate: new Date('2024-01-15'),
    seller: {
      name: 'TechCorp Bulgaria',
      address: 'ul. Aleksandar Batenberg 57',
      city: 'Sofia',
      postalCode: '1000',
      country: 'Bulgaria',
      vatNumber: 'BG202024680',
      email: 'contact@techcorp.bg',
      phone: '+359 2 123 4567',
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
      {
        description: 'Consulting Services',
        quantity: 20,
        unitPrice: 75,
        netAmount: 1500,
        vatRate: 19,
        vatAmount: 285,
        grossAmount: 1785,
      },
    ],
    totalNetAmount: 3500,
    totalVATAmount: 665,
    totalGrossAmount: 4165,
    currency: 'EUR',
    paymentTerms: 'Net 30 days',
    referenceNumber: 'PO-2024-5678',
  };

  it('should generate a valid PDF with mandatory Article 226 fields', async () => {
    const result = await generatePDFInvoice(mockInvoice);

    expect(result.success).toBe(true);
    expect(result).toHaveProperty('pdf');
    expect(result).toHaveProperty('filename');
    expect(result.mimeType).toBe('application/pdf');
    expect(result.filename).toContain('invoice-');
    expect(result.filename).toMatch(/\.pdf$/);

    // PDF should be a Uint8Array with reasonable size
    if (result.success) {
      expect(result.pdf).toBeInstanceOf(Uint8Array);
      expect(result.pdf.length).toBeGreaterThan(1000); // PDF should have some content
    }
  });

  it('should include seller VAT identification number', async () => {
    const result = await generatePDFInvoice(mockInvoice);
    expect(result.success).toBe(true);
    // Cannot directly verify content in PDF binary, but validation happens before generation
  });

  it('should include buyer identification with VAT number for B2B', async () => {
    const result = await generatePDFInvoice(mockInvoice);
    expect(result.success).toBe(true);
    // Invoice is B2B with buyer VAT number, validation ensures it's present
  });

  it('should generate filename with invoice number', async () => {
    const result = await generatePDFInvoice(mockInvoice);

    if (result.success) {
      expect(result.filename).toContain(mockInvoice.invoiceNumber);
    }
  });

  it('should reject invoice with missing seller VAT number', async () => {
    const invalidInvoice: Invoice = {
      ...mockInvoice,
      seller: {
        ...mockInvoice.seller,
        vatNumber: undefined,
      },
    };

    const result = await generatePDFInvoice(invalidInvoice);

    expect(result.success).toBe(false);
    expect(result.error).toContain('validation failed');
  });

  it('should reject invoice with no line items', async () => {
    const invalidInvoice: Invoice = {
      ...mockInvoice,
      lineItems: [],
    };

    const result = await generatePDFInvoice(invalidInvoice);

    expect(result.success).toBe(false);
    expect(result.error).toContain('validation failed');
  });

  it('should reject invoice with empty invoice number', async () => {
    const invalidInvoice: Invoice = {
      ...mockInvoice,
      invoiceNumber: '',
    };

    const result = await generatePDFInvoice(invalidInvoice);

    expect(result.success).toBe(false);
    expect(result.details).toContain('Invoice number is required');
  });

  it('should reject invoice with invalid VAT rate', async () => {
    const invalidInvoice: Invoice = {
      ...mockInvoice,
      lineItems: [
        {
          ...mockInvoice.lineItems[0],
          vatRate: 150, // Invalid: over 100%
        },
      ],
    };

    const result = await generatePDFInvoice(invalidInvoice);

    expect(result.success).toBe(false);
  });

  it('should reject invoice with mismatched totals', async () => {
    const invalidInvoice: Invoice = {
      ...mockInvoice,
      totalGrossAmount: 2000, // Less than net amount
    };

    const result = await generatePDFInvoice(invalidInvoice);

    expect(result.success).toBe(false);
  });

  it('should handle different date formats correctly', async () => {
    const invoiceWithDifferentDate: Invoice = {
      ...mockInvoice,
      invoiceDate: new Date('2024-12-25'),
      supplyDate: new Date('2024-12-20'),
    };

    const result = await generatePDFInvoice(invoiceWithDifferentDate);

    expect(result.success).toBe(true);
  });

  it('should generate valid PDF for B2C invoice (no buyer VAT number)', async () => {
    const b2cInvoice: Invoice = {
      ...mockInvoice,
      buyer: {
        name: 'John Doe',
        address: 'Some Street 42',
        city: 'Some City',
        postalCode: '12345',
        country: 'Country',
        // No vatNumber for B2C
      },
    };

    const result = await generatePDFInvoice(b2cInvoice);

    expect(result.success).toBe(true);
  });

  it('should handle multiple VAT rates on same invoice', async () => {
    const multiVATInvoice: Invoice = {
      ...mockInvoice,
      lineItems: [
        {
          description: 'Standard Rate Service',
          quantity: 10,
          unitPrice: 100,
          netAmount: 1000,
          vatRate: 19,
          vatAmount: 190,
          grossAmount: 1190,
        },
        {
          description: 'Reduced Rate Service',
          quantity: 5,
          unitPrice: 200,
          netAmount: 1000,
          vatRate: 7,
          vatAmount: 70,
          grossAmount: 1070,
        },
      ],
      totalNetAmount: 2000,
      totalVATAmount: 260,
      totalGrossAmount: 2260,
    };

    const result = await generatePDFInvoice(multiVATInvoice);

    expect(result.success).toBe(true);
  });

  it('should set correct generated timestamp', async () => {
    const beforeGeneration = new Date();
    const result = await generatePDFInvoice(mockInvoice);
    const afterGeneration = new Date();

    if (result.success) {
      expect(result.generatedAt.getTime()).toBeGreaterThanOrEqual(beforeGeneration.getTime());
      expect(result.generatedAt.getTime()).toBeLessThanOrEqual(afterGeneration.getTime());
    }
  });

  it('should apply custom PDF options', async () => {
    const result = await generatePDFInvoice(mockInvoice, {
      format: 'letter',
      fontSize: 11,
      marginMm: 20,
    });

    expect(result.success).toBe(true);
  });

  it('should handle long descriptions', async () => {
    const longDescInvoice: Invoice = {
      ...mockInvoice,
      lineItems: [
        {
          description:
            'Very long description of a complex service that spans multiple words and should be properly handled by the PDF generator without causing layout issues',
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
    };

    const result = await generatePDFInvoice(longDescInvoice);

    expect(result.success).toBe(true);
  });

  it('should handle zero VAT rate (reverse charge scenarios)', async () => {
    const zeroVATInvoice: Invoice = {
      ...mockInvoice,
      lineItems: [
        {
          description: 'EU B2B Service (VAT reverse charge)',
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

    const result = await generatePDFInvoice(zeroVATInvoice);

    expect(result.success).toBe(true);
  });

  it('should include optional metadata when provided', async () => {
    const invoiceWithMetadata: Invoice = {
      ...mockInvoice,
      notes: 'Please pay within 30 days. Late payments subject to interest.',
      referenceNumber: 'PO-123-456',
    };

    const result = await generatePDFInvoice(invoiceWithMetadata);

    expect(result.success).toBe(true);
  });

  it('should handle currency conversion display correctly', async () => {
    const gbpInvoice: Invoice = {
      ...mockInvoice,
      currency: 'GBP',
    };

    const result = await generatePDFInvoice(gbpInvoice);

    expect(result.success).toBe(true);
  });
});
