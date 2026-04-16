/**
 * Tests for Data Lifecycle Taxonomy
 * Verifies Design Principle 3: GDPR-compliant data transformation
 */

import { describe, it, expect } from 'vitest';
import {
  DataLifecycleStage,
  LIFECYCLE_POLICIES,
  pseudonymiseBuyerName,
  truncateAddressToCountry,
  removeContactDetails,
  hashVatId,
  transformToArchival,
  transformToAnonymised,
  getLifecyclePolicy,
  calculateNextTransitionTime,
} from '../taxonomy';

describe('Data Lifecycle Taxonomy', () => {
  describe('DataLifecycleStage enum', () => {
    it('should have all four stages', () => {
      expect(DataLifecycleStage.EPHEMERAL).toBe('ephemeral');
      expect(DataLifecycleStage.OPERATIONAL).toBe('operational');
      expect(DataLifecycleStage.ARCHIVAL).toBe('archival');
      expect(DataLifecycleStage.ANONYMISED).toBe('anonymised');
    });
  });

  describe('LIFECYCLE_POLICIES', () => {
    it('should define policy for each stage', () => {
      expect(DataLifecycleStage.EPHEMERAL in LIFECYCLE_POLICIES).toBe(true);
      expect(DataLifecycleStage.OPERATIONAL in LIFECYCLE_POLICIES).toBe(true);
      expect(DataLifecycleStage.ARCHIVAL in LIFECYCLE_POLICIES).toBe(true);
      expect(DataLifecycleStage.ANONYMISED in LIFECYCLE_POLICIES).toBe(true);
    });

    it('should have correct retention for operational (125 days = 3 months + 30 days)', () => {
      const policy = LIFECYCLE_POLICIES[DataLifecycleStage.OPERATIONAL];
      expect(policy.retentionDays).toBe(125);
    });

    it('should have correct retention for archival (3650 days = 10 years)', () => {
      const policy = LIFECYCLE_POLICIES[DataLifecycleStage.ARCHIVAL];
      expect(policy.retentionDays).toBe(3650);
    });

    it('should have transformations for archival stage', () => {
      const policy = LIFECYCLE_POLICIES[DataLifecycleStage.ARCHIVAL];
      expect(policy.transformations.length).toBeGreaterThan(0);
      expect(policy.transformations).toContain('pseudonymise_buyer_name');
      expect(policy.transformations).toContain('truncate_address_to_country');
    });
  });

  describe('pseudonymiseBuyerName', () => {
    it('should return string with BUYER prefix', () => {
      const result = pseudonymiseBuyerName('John Doe', 'salt123');
      expect(result).toMatch(/^BUYER-/);
    });

    it('should be deterministic', () => {
      const name = 'Jane Smith';
      const salt = 'seller-123';
      const result1 = pseudonymiseBuyerName(name, salt);
      const result2 = pseudonymiseBuyerName(name, salt);
      expect(result1).toBe(result2);
    });

    it('should produce different pseudonyms for different names', () => {
      const salt = 'same-salt';
      const result1 = pseudonymiseBuyerName('Alice', salt);
      const result2 = pseudonymiseBuyerName('Bob', salt);
      expect(result1).not.toBe(result2);
    });

    it('should produce different pseudonyms for different salts', () => {
      const name = 'Charlie';
      const result1 = pseudonymiseBuyerName(name, 'salt1');
      const result2 = pseudonymiseBuyerName(name, 'salt2');
      expect(result1).not.toBe(result2);
    });
  });

  describe('truncateAddressToCountry', () => {
    it('should return country code', () => {
      const result = truncateAddressToCountry('123 Main St, Berlin, 10115, Germany', 'DE');
      expect(result).toBe('DE');
    });

    it('should handle different address formats', () => {
      expect(truncateAddressToCountry('Street Address', 'FR')).toBe('FR');
      expect(truncateAddressToCountry('', 'IT')).toBe('IT');
    });
  });

  describe('removeContactDetails', () => {
    it('should remove email', () => {
      const data = { name: 'John', email: 'john@example.com' };
      const result = removeContactDetails(data);
      expect(result.email).toBeUndefined();
      expect(result.name).toBe('John');
    });

    it('should remove phone', () => {
      const data = { name: 'John', phone: '+1234567890' };
      const result = removeContactDetails(data);
      expect(result.phone).toBeUndefined();
    });

    it('should remove multiple contact fields', () => {
      const data = {
        name: 'John',
        email: 'john@example.com',
        phone: '123456',
        contactEmail: 'contact@example.com',
        contactPhone: '987654',
      };
      const result = removeContactDetails(data);
      expect(result.email).toBeUndefined();
      expect(result.phone).toBeUndefined();
      expect(result.contact).toBeUndefined();
      expect(result.contactEmail).toBeUndefined();
      expect(result.contactPhone).toBeUndefined();
      expect(result.name).toBe('John');
    });

    it('should not remove non-contact fields', () => {
      const data = {
        id: '123',
        name: 'John',
        country: 'DE',
        amount: 100,
      };
      const result = removeContactDetails(data);
      expect(result.id).toBe('123');
      expect(result.name).toBe('John');
      expect(result.country).toBe('DE');
      expect(result.amount).toBe(100);
    });
  });

  describe('hashVatId', () => {
    it('should return string with VAT prefix', () => {
      const result = hashVatId('DE123456789', 'salt123');
      expect(result).toMatch(/^VAT-/);
    });

    it('should be deterministic', () => {
      const vatId = 'FR987654321';
      const salt = 'seller-id';
      const result1 = hashVatId(vatId, salt);
      const result2 = hashVatId(vatId, salt);
      expect(result1).toBe(result2);
    });

    it('should produce different hashes for different VAT IDs', () => {
      const salt = 'same-salt';
      const result1 = hashVatId('DE123', salt);
      const result2 = hashVatId('FR456', salt);
      expect(result1).not.toBe(result2);
    });
  });

  describe('transformToArchival', () => {
    it('should return LifecycleTransformedData with ARCHIVAL stage', () => {
      const data = {
        id: 'tx-123',
        buyerName: 'John Doe',
        address: '123 Main St, Berlin, 10115',
        country: 'DE',
        buyerVatId: 'DE123456789',
        amount: 1000,
      };

      const result = transformToArchival(data, 'DE123456789', 'seller-123');
      expect(result.stage).toBe(DataLifecycleStage.ARCHIVAL);
      expect(result.id).toBe('tx-123');
      expect(result.transformations.length).toBeGreaterThan(0);
      expect(result.transformedAt).toBeTruthy();
    });

    it('should pseudonymise buyer name', () => {
      const data = {
        id: 'tx-1',
        buyerName: 'Alice Smith',
        country: 'AT',
        buyerVatId: 'AT123',
      };

      const result = transformToArchival(data, 'AT123', 'seller-1');
      expect(result.data.buyerName).toMatch(/^BUYER-/);
      expect(result.data.buyerName).not.toBe('Alice Smith');
    });

    it('should truncate address to country', () => {
      const data = {
        id: 'tx-2',
        address: '456 Oak Ave, Vienna, 1010',
        country: 'AT',
      };

      const result = transformToArchival(data, 'AT456', 'seller-2');
      expect(result.data.address).toBe('AT');
    });

    it('should remove contact details', () => {
      const data = {
        id: 'tx-3',
        email: 'buyer@example.com',
        phone: '+1234567890',
        country: 'BE',
      };

      const result = transformToArchival(data, 'BE789', 'seller-3');
      expect(result.data.email).toBeUndefined();
      expect(result.data.phone).toBeUndefined();
    });

    it('should hash VAT ID', () => {
      const data = {
        id: 'tx-4',
        buyerVatId: 'FR111222333',
        country: 'FR',
      };

      const result = transformToArchival(data, 'FR111222333', 'seller-4');
      expect(result.data.buyerVatId).toMatch(/^VAT-/);
      expect(result.data.buyerVatId).not.toBe('FR111222333');
    });

    it('should log all transformations', () => {
      const data = {
        id: 'tx-5',
        buyerName: 'Bob',
        address: 'Some Street',
        country: 'CZ',
        buyerVatId: 'CZ123',
        email: 'bob@test.com',
      };

      const result = transformToArchival(data, 'CZ123', 'seller-5');
      const transformationNames = result.transformations.map((t) => t.name);

      expect(transformationNames).toContain('pseudonymise_buyer_name');
      expect(transformationNames).toContain('truncate_address_to_country');
      expect(transformationNames).toContain('hash_vat_ids');
    });

    it('should preserve amount and other transactional data', () => {
      const data = {
        id: 'tx-6',
        amount: 5000,
        currency: 'EUR',
        vatRate: 19,
        country: 'DE',
      };

      const result = transformToArchival(data, 'DE999', 'seller-6');
      expect(result.data.amount).toBe(5000);
      expect(result.data.currency).toBe('EUR');
      expect(result.data.vatRate).toBe(19);
    });
  });

  describe('transformToAnonymised', () => {
    it('should return LifecycleTransformedData with ANONYMISED stage', () => {
      const data = {
        id: 'tx-100',
        amount: 1000,
        country: 'DE',
      };

      const result = transformToAnonymised(data);
      expect(result.stage).toBe(DataLifecycleStage.ANONYMISED);
    });

    it('should remove ID', () => {
      const data = { id: 'tx-100', amount: 1000 };
      const result = transformToAnonymised(data);
      expect(result.id).toBe('');
    });

    it('should preserve aggregatable fields', () => {
      const data = {
        id: 'tx-101',
        amount: 2000,
        vatAmount: 380,
        country: 'FR',
        vatRate: 19,
        buyerName: 'John',
        email: 'john@example.com',
      };

      const result = transformToAnonymised(data);
      expect(result.data.amount).toBe(2000);
      expect(result.data.vatAmount).toBe(380);
      expect(result.data.country).toBe('FR');
      expect(result.data.vatRate).toBe(19);
    });

    it('should remove personally identifiable information', () => {
      const data = {
        id: 'tx-102',
        buyerName: 'Jane Doe',
        email: 'jane@example.com',
        address: '789 Pine St',
        amount: 1500,
      };

      const result = transformToAnonymised(data);
      expect(result.data.buyerName).toBeUndefined();
      expect(result.data.email).toBeUndefined();
      expect(result.data.address).toBeUndefined();
    });

    it('should include anonymisation transformations', () => {
      const data = { id: 'tx-103', amount: 500, country: 'IT' };
      const result = transformToAnonymised(data);

      expect(result.transformations.length).toBeGreaterThan(0);
      const transformationNames = result.transformations.map((t) => t.name);
      expect(transformationNames).toContain('remove_all_identifiers');
    });
  });

  describe('getLifecyclePolicy', () => {
    it('should return policy for stage', () => {
      const policy = getLifecyclePolicy(DataLifecycleStage.OPERATIONAL);
      expect(policy.stage).toBe(DataLifecycleStage.OPERATIONAL);
      expect(policy.retentionDays).toBe(125);
    });

    it('should return policy with description', () => {
      const policy = getLifecyclePolicy(DataLifecycleStage.ARCHIVAL);
      expect(policy.description).toBeTruthy();
      expect(policy.description.length).toBeGreaterThan(0);
    });
  });

  describe('calculateNextTransitionTime', () => {
    it('should calculate transition time for operational stage', () => {
      const now = Date.now();
      const nextTime = calculateNextTransitionTime(now, DataLifecycleStage.OPERATIONAL);

      expect(nextTime).toBeTruthy();
      if (nextTime) {
        const daysUntilTransition = (nextTime - now) / (1000 * 60 * 60 * 24);
        expect(daysUntilTransition).toBeCloseTo(125, 0);
      }
    });

    it('should calculate transition time for archival stage', () => {
      const now = Date.now();
      const nextTime = calculateNextTransitionTime(now, DataLifecycleStage.ARCHIVAL);

      expect(nextTime).toBeTruthy();
      if (nextTime) {
        const daysUntilTransition = (nextTime - now) / (1000 * 60 * 60 * 24);
        expect(daysUntilTransition).toBeCloseTo(3650, 0);
      }
    });

    it('should return null for ephemeral stage', () => {
      const nextTime = calculateNextTransitionTime(Date.now(), DataLifecycleStage.EPHEMERAL);
      expect(nextTime).toBeNull();
    });

    it('should return null for anonymised stage', () => {
      const nextTime = calculateNextTransitionTime(Date.now(), DataLifecycleStage.ANONYMISED);
      expect(nextTime).toBeNull();
    });
  });

  describe('GDPR compliance scenarios', () => {
    it('should handle complete lifecycle of a transaction', () => {
      const originalData = {
        id: 'invoice-2024-001',
        buyerName: 'Acme Corp',
        buyerVatId: 'DE123456789',
        address: '123 Business St, Munich, 80001',
        email: 'contact@acme.com',
        phone: '+49301234567',
        country: 'DE',
        amount: 5000,
        currency: 'EUR',
        vatRate: 19,
      };

      // Stage 1: Ephemeral (in memory during processing)
      // No transformation needed

      // Stage 2: Operational (Firestore for 125 days)
      const operationalPolicy = getLifecyclePolicy(DataLifecycleStage.OPERATIONAL);
      expect(operationalPolicy.retentionDays).toBe(125);

      // Stage 3: Archival (pseudonymised for 10 years)
      const archivalData = transformToArchival(originalData, 'DE123456789', 'seller-id');
      expect(archivalData.stage).toBe(DataLifecycleStage.ARCHIVAL);
      expect(archivalData.data.buyerName).toMatch(/^BUYER-/);
      expect(archivalData.data.address).toBe('DE');
      expect(archivalData.data.email).toBeUndefined();

      // Stage 4: Anonymised (aggregate statistics only)
      const anonData = transformToAnonymised(archivalData.data);
      expect(anonData.stage).toBe(DataLifecycleStage.ANONYMISED);
      expect(anonData.id).toBe('');
      expect(anonData.data.amount).toBe(5000);
      expect(anonData.data.country).toBe('DE');
    });
  });
});
