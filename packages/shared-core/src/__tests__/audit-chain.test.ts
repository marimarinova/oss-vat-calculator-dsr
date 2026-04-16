/**
 * Tests for HMAC-SHA256 Audit Chain
 * Verifies Design Principle 2: Tampering detection through hash chain
 */

import { describe, it, expect } from 'vitest';
import {
  AuditEntry,
  computeHmac,
  createAuditEntry,
  verifyChain,
  verifySingleEntry,
  VerificationResult,
} from '../audit-chain';

describe('HMAC-SHA256 Audit Chain', () => {
  const testKey = 'seller-secret-key-12345';

  describe('computeHmac', () => {
    it('should compute consistent HMAC for same input', () => {
      const data = 'test data';
      const hash1 = computeHmac(data, testKey);
      const hash2 = computeHmac(data, testKey);
      expect(hash1).toBe(hash2);
    });

    it('should produce different HMAC for different data', () => {
      const hash1 = computeHmac('data1', testKey);
      const hash2 = computeHmac('data2', testKey);
      expect(hash1).not.toBe(hash2);
    });

    it('should produce different HMAC for different keys', () => {
      const data = 'same data';
      const hash1 = computeHmac(data, 'key1');
      const hash2 = computeHmac(data, 'key2');
      expect(hash1).not.toBe(hash2);
    });

    it('should return hex string', () => {
      const hash = computeHmac('test', testKey);
      expect(hash).toMatch(/^[0-9a-f]+$/);
      expect(hash.length).toBe(64); // SHA256 produces 64 hex characters
    });
  });

  describe('createAuditEntry', () => {
    it('should create entry with correct structure', () => {
      const data = { amount: 100, currency: 'EUR' };
      const entry = createAuditEntry(data, '', testKey);

      expect(entry).toHaveProperty('id');
      expect(entry).toHaveProperty('data');
      expect(entry).toHaveProperty('timestamp');
      expect(entry).toHaveProperty('previousHash');
      expect(entry).toHaveProperty('hash');
    });

    it('should use genesis hash for first entry', () => {
      const entry = createAuditEntry({ test: true }, '', testKey);
      expect(entry.previousHash).toBe('');
    });

    it('should link to previous hash', () => {
      const previousHash = 'abc123def456';
      const entry = createAuditEntry({ test: true }, previousHash, testKey);
      expect(entry.previousHash).toBe(previousHash);
    });

    it('should generate ID if not provided', () => {
      const entry1 = createAuditEntry({ test: 1 }, '', testKey);
      const entry2 = createAuditEntry({ test: 2 }, '', testKey);
      expect(entry1.id).toBeTruthy();
      expect(entry2.id).toBeTruthy();
      expect(entry1.id).not.toBe(entry2.id);
    });

    it('should use provided ID', () => {
      const customId = 'custom-entry-id-123';
      const entry = createAuditEntry({ test: true }, '', testKey, customId);
      expect(entry.id).toBe(customId);
    });

    it('should compute valid hash for genesis entry', () => {
      const entry = createAuditEntry({ test: true }, '', testKey);
      const isValid = verifySingleEntry(entry, testKey);
      expect(isValid).toBe(true);
    });

    it('should timestamp entries', () => {
      const before = Date.now();
      const entry = createAuditEntry({ test: true }, '', testKey);
      const after = Date.now();
      expect(entry.timestamp).toBeGreaterThanOrEqual(before);
      expect(entry.timestamp).toBeLessThanOrEqual(after);
    });
  });

  describe('verifySingleEntry', () => {
    it('should verify valid entry', () => {
      const entry = createAuditEntry({ data: 'test' }, '', testKey);
      expect(verifySingleEntry(entry, testKey)).toBe(true);
    });

    it('should reject entry with wrong key', () => {
      const entry = createAuditEntry({ data: 'test' }, '', testKey);
      expect(verifySingleEntry(entry, 'wrong-key')).toBe(false);
    });

    it('should detect data tampering', () => {
      const entry = createAuditEntry({ amount: 100 }, '', testKey);
      const tampered = { ...entry, data: { amount: 200 } };
      expect(verifySingleEntry(tampered, testKey)).toBe(false);
    });

    it('should detect timestamp tampering', () => {
      const entry = createAuditEntry({ test: true }, '', testKey);
      const tampered = { ...entry, timestamp: entry.timestamp + 1000 };
      expect(verifySingleEntry(tampered, testKey)).toBe(false);
    });

    it('should detect hash tampering', () => {
      const entry = createAuditEntry({ test: true }, '', testKey);
      const tampered = { ...entry, hash: 'aabbccddee' };
      expect(verifySingleEntry(tampered, testKey)).toBe(false);
    });
  });

  describe('verifyChain', () => {
    it('should validate empty chain', () => {
      const result = verifyChain([], testKey);
      expect(result.valid).toBe(true);
    });

    it('should validate single entry chain', () => {
      const entry = createAuditEntry({ test: 1 }, '', testKey);
      const result = verifyChain([entry], testKey);
      expect(result.valid).toBe(true);
    });

    it('should validate multi-entry chain', () => {
      const entry1 = createAuditEntry({ test: 1 }, '', testKey);
      const entry2 = createAuditEntry({ test: 2 }, entry1.hash, testKey);
      const entry3 = createAuditEntry({ test: 3 }, entry2.hash, testKey);

      const result = verifyChain([entry1, entry2, entry3], testKey);
      expect(result.valid).toBe(true);
    });

    it('should detect broken link in chain', () => {
      const entry1 = createAuditEntry({ test: 1 }, '', testKey);
      const entry2 = createAuditEntry({ test: 2 }, entry1.hash, testKey);

      // Break the link
      const brokenEntry2 = { ...entry2, previousHash: 'wrong-hash' };

      const result = verifyChain([entry1, brokenEntry2], testKey);
      expect(result.valid).toBe(false);
      expect(result.brokenAt).toBe(1);
    });

    it('should detect tampered data in middle of chain', () => {
      const entry1 = createAuditEntry({ test: 1 }, '', testKey);
      const entry2 = createAuditEntry({ test: 2 }, entry1.hash, testKey);
      const entry3 = createAuditEntry({ test: 3 }, entry2.hash, testKey);

      // Tamper with middle entry
      const tamperedEntry2 = { ...entry2, data: { test: 999 } };

      const result = verifyChain([entry1, tamperedEntry2, entry3], testKey);
      expect(result.valid).toBe(false);
      expect(result.brokenAt).toBe(1);
    });

    it('should detect wrong key', () => {
      const entry1 = createAuditEntry({ test: 1 }, '', testKey);
      const entry2 = createAuditEntry({ test: 2 }, entry1.hash, testKey);

      const result = verifyChain([entry1, entry2], 'wrong-key');
      expect(result.valid).toBe(false);
    });

    it('should reject genesis entry with non-empty previousHash', () => {
      const entry = createAuditEntry({ test: 1 }, '', testKey);
      const badEntry = { ...entry, previousHash: 'should-be-empty' };

      const result = verifyChain([badEntry], testKey);
      expect(result.valid).toBe(false);
      expect(result.brokenAt).toBe(0);
    });

    it('should provide detailed verification information', () => {
      const entry1 = createAuditEntry({ test: 1 }, '', testKey);
      const entry2 = createAuditEntry({ test: 2 }, entry1.hash, testKey);
      const result = verifyChain([entry1, entry2], testKey);

      expect(result.details).toBeTruthy();
      expect(result.details).toContain('2 entries');
    });
  });

  describe('Real-world scenarios', () => {
    it('should handle large audit trails', () => {
      let currentHash = '';
      const entries: AuditEntry[] = [];

      // Create 100 entries
      for (let i = 0; i < 100; i++) {
        const entry = createAuditEntry(
          { transactionId: `tx-${i}`, amount: i * 100 },
          currentHash,
          testKey
        );
        entries.push(entry);
        currentHash = entry.hash;
      }

      // Verify entire chain
      const result = verifyChain(entries, testKey);
      expect(result.valid).toBe(true);
    });

    it('should detect tampering at any position', () => {
      let currentHash = '';
      const entries: AuditEntry[] = [];

      for (let i = 0; i < 10; i++) {
        const entry = createAuditEntry(
          { transactionId: `tx-${i}`, amount: i * 100 },
          currentHash,
          testKey
        );
        entries.push(entry);
        currentHash = entry.hash;
      }

      // Tamper at position 5
      entries[5].data = { transactionId: 'tx-5', amount: 999999 };

      // Chain verification should fail
      const result = verifyChain(entries, testKey);
      expect(result.valid).toBe(false);
      expect(result.brokenAt).toBe(5);
    });

    it('should handle complex nested data structures', () => {
      const complexData = {
        invoice: {
          id: 'INV-2024-001',
          items: [
            { sku: 'ITEM-1', qty: 5, price: 100 },
            { sku: 'ITEM-2', qty: 3, price: 250 },
          ],
          totals: {
            subtotal: 1250,
            tax: 237.5,
            total: 1487.5,
          },
        },
        buyer: {
          vatId: 'DE123456789',
          name: 'Example Company',
        },
      };

      const entry = createAuditEntry(complexData, '', testKey);
      expect(verifySingleEntry(entry, testKey)).toBe(true);

      const result = verifyChain([entry], testKey);
      expect(result.valid).toBe(true);
    });
  });
});
