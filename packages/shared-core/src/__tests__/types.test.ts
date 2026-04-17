/**
 * Tests for Core Type Definitions
 * Verifies Design Principle 1: System-wide type contracts
 */

import { describe, it, expect } from 'vitest';
import {
  Transaction,
  InvoiceData,
  LineItem,
  OssReturn,
  OssReturnCountry,
  VatRate,
  MemberState,
  getAllMemberStates,
  getMemberStateName,
} from '../types';

describe('Core Type Definitions', () => {
  describe('Transaction', () => {
    it('should allow creating a valid transaction', () => {
      const transaction: Transaction = {
        id: 'tx-001',
        invoiceId: 'inv-001',
        timestamp: Date.now(),
        sellerId: 'seller-123',
        buyerId: 'buyer-456',
        buyerCountry: MemberState.DE,
        amount: 10000, // 100.00 EUR in cents
        vatRate: {
          rate: 19,
          type: 'standard',
          country: MemberState.DE,
        },
        description: 'Test transaction',
        metadata: { reference: 'REF-001' },
      };

      expect(transaction.id).toBe('tx-001');
      expect(transaction.amount).toBe(10000);
      expect(transaction.vatRate.rate).toBe(19);
    });
  });

  describe('InvoiceData', () => {
    it('should allow creating a valid invoice', () => {
      const invoice: InvoiceData = {
        invoiceId: 'INV-2024-001',
        invoiceDate: '2024-01-15',
        sellerId: 'seller-abc',
        sellerName: 'Tech Solutions GmbH',
        buyerId: 'buyer-xyz',
        buyerName: 'Client Corp',
        buyerCountry: MemberState.FR,
        lineItems: [
          {
            description: 'Software License',
            quantity: 1,
            unitPrice: 50000,
            totalPrice: 50000,
            vatRate: {
              rate: 20,
              type: 'standard',
              country: MemberState.FR,
            },
          },
        ],
        totalAmount: 50000,
        totalVat: 10000,
        vatRate: {
          rate: 20,
          type: 'standard',
          country: MemberState.FR,
        },
      };

      expect(invoice.invoiceId).toBe('INV-2024-001');
      expect(invoice.buyerCountry).toBe(MemberState.FR);
      expect(invoice.lineItems.length).toBe(1);
    });

    it('should support metadata on invoices', () => {
      const invoice: InvoiceData = {
        invoiceId: 'INV-2024-002',
        invoiceDate: '2024-02-01',
        sellerId: 'seller-123',
        sellerName: 'Example Ltd',
        buyerId: 'buyer-789',
        buyerName: 'Another Client',
        buyerCountry: MemberState.IT,
        lineItems: [],
        totalAmount: 0,
        totalVat: 0,
        vatRate: {
          rate: 22,
          type: 'standard',
          country: MemberState.IT,
        },
        metadata: {
          purchaseOrder: 'PO-12345',
          project: 'Project Alpha',
        },
      };

      expect(invoice.metadata?.purchaseOrder).toBe('PO-12345');
    });
  });

  describe('LineItem', () => {
    it('should define line items for invoices', () => {
      const lineItem: LineItem = {
        description: 'Consulting Services',
        quantity: 8, // hours
        unitPrice: 10000, // 100.00 per hour in cents
        totalPrice: 80000, // 800.00
        vatRate: {
          rate: 19,
          type: 'standard',
          country: MemberState.DE,
        },
      };

      expect(lineItem.quantity).toBe(8);
      expect(lineItem.totalPrice).toBe(80000);
    });
  });

  describe('OssReturn', () => {
    it('should allow creating an OSS return filing', () => {
      const return_: OssReturn = {
        id: 'return-2024-q1',
        period: '2024-01',
        sellerId: 'seller-osm',
        filingDate: '2024-02-15T10:30:00Z',
        countries: [
          {
            country: MemberState.DE,
            totalTaxableAmount: 50000,
            totalTaxAmount: 9500,
            transactions: ['tx-001', 'tx-002'],
          },
          {
            country: MemberState.FR,
            totalTaxableAmount: 30000,
            totalTaxAmount: 6000,
            transactions: ['tx-003'],
          },
        ],
        totalTaxDue: 15500,
        status: 'draft',
      };

      expect(return_.id).toBe('return-2024-q1');
      expect(return_.countries.length).toBe(2);
      expect(return_.totalTaxDue).toBe(15500);
    });

    it('should track return status', () => {
      const return_: OssReturn = {
        id: 'return-2024-q2',
        period: '2024-04',
        sellerId: 'seller-test',
        filingDate: '2024-05-20T14:00:00Z',
        countries: [],
        totalTaxDue: 0,
        status: 'submitted',
        metadata: { submissionReference: 'REF-9999' },
      };

      expect(['draft', 'submitted', 'accepted', 'rejected']).toContain(return_.status);
    });
  });

  describe('OssReturnCountry', () => {
    it('should summarize taxes by country', () => {
      const countrySummary: OssReturnCountry = {
        country: MemberState.NL,
        totalTaxableAmount: 100000,
        totalTaxAmount: 21000, // 21% VAT rate in Netherlands
        transactions: ['tx-001', 'tx-002', 'tx-003'],
      };

      expect(countrySummary.country).toBe(MemberState.NL);
      expect(countrySummary.transactions.length).toBe(3);
    });
  });

  describe('VatRate', () => {
    it('should define standard VAT rates', () => {
      const standardRate: VatRate = {
        rate: 19,
        type: 'standard',
        country: MemberState.DE,
      };

      expect(standardRate.type).toBe('standard');
      expect(standardRate.rate).toBe(19);
    });

    it('should support reduced VAT rates', () => {
      const reducedRate: VatRate = {
        rate: 7,
        type: 'reduced',
        country: MemberState.DE,
      };

      expect(reducedRate.type).toBe('reduced');
      expect(reducedRate.rate).toBe(7);
    });

    it('should support super-reduced VAT rates', () => {
      const superReducedRate: VatRate = {
        rate: 4,
        type: 'super-reduced',
        country: MemberState.IE,
      };

      expect(superReducedRate.type).toBe('super-reduced');
      expect(superReducedRate.rate).toBe(4);
    });

    it('should support zero VAT rates', () => {
      const zeroRate: VatRate = {
        rate: 0,
        type: 'zero',
        country: MemberState.GB,
      };

      expect(zeroRate.type).toBe('zero');
      expect(zeroRate.rate).toBe(0);
    });
  });

  describe('MemberState enum', () => {
    it('should define all 27 EU member states', () => {
      const states = getAllMemberStates();
      expect(states.length).toBe(27);
    });

    it('should have correct ISO codes', () => {
      expect(MemberState.AT).toBe('AT');
      expect(MemberState.DE).toBe('DE');
      expect(MemberState.FR).toBe('FR');
      expect(MemberState.IT).toBe('IT');
      expect(MemberState.ES).toBe('ES');
      expect(MemberState.NL).toBe('NL');
      expect(MemberState.BE).toBe('BE');
    });

    it('should have all required member states', () => {
      const requiredStates = [
        MemberState.AT,
        MemberState.BE,
        MemberState.BG,
        MemberState.HR,
        MemberState.CY,
        MemberState.CZ,
        MemberState.DK,
        MemberState.EE,
        MemberState.FI,
        MemberState.FR,
        MemberState.DE,
        MemberState.GR,
        MemberState.HU,
        MemberState.IE,
        MemberState.IT,
        MemberState.LV,
        MemberState.LT,
        MemberState.LU,
        MemberState.MT,
        MemberState.NL,
        MemberState.PL,
        MemberState.PT,
        MemberState.RO,
        MemberState.SK,
        MemberState.SI,
        MemberState.ES,
        MemberState.SE,
      ];

      const allStates = getAllMemberStates();
      for (const state of requiredStates) {
        expect(allStates).toContain(state);
      }
    });
  });

  describe('getMemberStateName', () => {
    it('should return full names for member states', () => {
      expect(getMemberStateName(MemberState.DE)).toBe('Germany');
      expect(getMemberStateName(MemberState.FR)).toBe('France');
      expect(getMemberStateName(MemberState.IT)).toBe('Italy');
      expect(getMemberStateName(MemberState.ES)).toBe('Spain');
    });

    it('should handle all member states', () => {
      const states = getAllMemberStates();
      for (const state of states) {
        const name = getMemberStateName(state);
        expect(name).toBeTruthy();
        expect(name.length).toBeGreaterThan(0);
      }
    });

    it('should return unique names for each state', () => {
      const states = getAllMemberStates();
      const names = states.map((state) => getMemberStateName(state));
      const uniqueNames = new Set(names);
      expect(uniqueNames.size).toBe(states.length);
    });
  });

  describe('getAllMemberStates', () => {
    it('should return array of 27 states', () => {
      const states = getAllMemberStates();
      expect(Array.isArray(states)).toBe(true);
      expect(states.length).toBe(27);
    });

    it('should not have duplicates', () => {
      const states = getAllMemberStates();
      const uniqueStates = new Set(states);
      expect(uniqueStates.size).toBe(states.length);
    });

    it('should maintain consistent order', () => {
      const states1 = getAllMemberStates();
      const states2 = getAllMemberStates();
      expect(states1).toEqual(states2);
    });
  });

  describe('Cross-type integration', () => {
    it('should support real-world invoice scenario', () => {
      const invoice: InvoiceData = {
        invoiceId: 'INV-EUR-2024-0042',
        invoiceDate: '2024-03-10',
        sellerId: 'seller-eu-digital',
        sellerName: 'Digital Services EU Ltd',
        buyerId: 'buyer-corp-nl',
        buyerName: 'Nederlandse Bedrijven BV',
        buyerCountry: MemberState.NL,
        lineItems: [
          {
            description: 'Software Development Services',
            quantity: 40,
            unitPrice: 25000, // 250 EUR/hour
            totalPrice: 1000000, // 10,000 EUR
            vatRate: {
              rate: 21,
              type: 'standard',
              country: MemberState.NL,
            },
          },
          {
            description: 'Consulting',
            quantity: 8,
            unitPrice: 15000, // 150 EUR/hour
            totalPrice: 120000, // 1,200 EUR
            vatRate: {
              rate: 21,
              type: 'standard',
              country: MemberState.NL,
            },
          },
        ],
        totalAmount: 1120000, // 11,200 EUR
        totalVat: 235200, // 2,352 EUR (21%)
        vatRate: {
          rate: 21,
          type: 'standard',
          country: MemberState.NL,
        },
      };

      expect(invoice.totalAmount).toBe(1120000);
      expect(invoice.totalVat).toBe(235200);
      expect(invoice.lineItems.length).toBe(2);
    });

    it('should support multi-country OSS return', () => {
      const return_: OssReturn = {
        id: 'return-2024-q1-multi',
        period: '2024-01',
        sellerId: 'seller-global-tech',
        filingDate: '2024-02-20T12:00:00Z',
        countries: [
          {
            country: MemberState.DE,
            totalTaxableAmount: 250000,
            totalTaxAmount: 47500,
            transactions: ['tx-de-001', 'tx-de-002', 'tx-de-003'],
          },
          {
            country: MemberState.FR,
            totalTaxableAmount: 180000,
            totalTaxAmount: 36000,
            transactions: ['tx-fr-001', 'tx-fr-002'],
          },
          {
            country: MemberState.NL,
            totalTaxableAmount: 220000,
            totalTaxAmount: 46200,
            transactions: ['tx-nl-001', 'tx-nl-002', 'tx-nl-003'],
          },
          {
            country: MemberState.AT,
            totalTaxableAmount: 95000,
            totalTaxAmount: 18050,
            transactions: ['tx-at-001'],
          },
        ],
        totalTaxDue: 147750,
        status: 'draft',
      };

      expect(return_.countries.length).toBe(4);
      const totalTransactions = return_.countries.reduce(
        (sum, country) => sum + country.transactions.length,
        0,
      );
      expect(totalTransactions).toBe(9);
    });
  });
});
