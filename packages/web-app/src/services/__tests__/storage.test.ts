import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('firebase/firestore', () => {
  class FakeTimestamp {
    private readonly millis: number;
    constructor(millis: number) {
      this.millis = millis;
    }
    static now() {
      return new FakeTimestamp(Date.now());
    }
    static fromMillis(ms: number) {
      return new FakeTimestamp(ms);
    }
    toMillis() {
      return this.millis;
    }
  }
  return { Timestamp: FakeTimestamp };
});

const { isDemoMode, saveData, queryData, getDocument, getApp } = vi.hoisted(() => ({
  isDemoMode: vi.fn(),
  saveData: vi.fn(),
  queryData: vi.fn(),
  getDocument: vi.fn(),
  getApp: vi.fn(),
}));

vi.mock('../firebase', () => ({
  firebaseService: { isDemoMode, saveData, queryData, getDocument, getApp },
}));

import { storageService } from '../storage';
import type { AuditSigner } from '../audit-signer';

function snapshot<T>(id: string, data: T) {
  return { id, data: () => data };
}

const baseTransaction = {
  date: '2026-01-15',
  buyerCountry: 'DE',
  amount: 1999,
  currency: 'EUR',
  description: 'Widget sale',
  productType: 'goods' as const,
  quantity: 1,
  vatRate: 19,
};

describe('FirestoreStorageService - demo mode fallback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isDemoMode.mockReturnValue(true);
    queryData.mockResolvedValue([]);
  });

  it('creates a transaction with genesis audit fields via DevAuditSigner', async () => {
    const tx = await storageService.addTransaction('user1', baseTransaction);

    expect(tx.previousHash).toBe('');
    expect(tx.sequenceNumber).toBe(1);
    expect(tx.keyEpoch).toBe(0);
    expect(tx.hash).toMatch(/^[0-9a-f]{64}$/);
    expect(getApp).not.toHaveBeenCalled();
    expect(saveData).toHaveBeenCalledWith(
      'users/user1/transactions',
      tx.id,
      expect.objectContaining({ hash: tx.hash, sequenceNumber: 1, keyEpoch: 0 }),
    );
  });

  it('chains subsequent transactions off the previous chain head', async () => {
    const tx1 = await storageService.addTransaction('user1', baseTransaction);

    queryData.mockImplementation(async (collection: string) => {
      if (collection === 'users/user1/transactions') {
        return [
          snapshot(tx1.id, {
            date: tx1.date,
            countryCode: tx1.buyerCountry,
            amount: tx1.amount,
            currency: tx1.currency,
            description: tx1.description,
            productType: tx1.productType,
            quantity: tx1.quantity,
            vatRate: tx1.vatRate,
            createdAt: Date.now(),
            hash: tx1.hash,
            previousHash: tx1.previousHash,
            sequenceNumber: tx1.sequenceNumber,
            keyEpoch: tx1.keyEpoch,
          }),
        ];
      }
      return [];
    });

    const tx2 = await storageService.addTransaction('user1', baseTransaction);

    expect(tx2.sequenceNumber).toBe(2);
    expect(tx2.previousHash).toBe(tx1.hash);
  });

  it('returns transactions written via getTransactions', async () => {
    const stored = {
      date: '2026-02-01',
      countryCode: 'FR',
      amount: 500,
      currency: 'EUR',
      description: 'Service fee',
      productType: 'services' as const,
      createdAt: 1700000000000,
      hash: 'h1',
      previousHash: '',
      sequenceNumber: 1,
      keyEpoch: 0,
    };
    queryData.mockResolvedValue([snapshot('tx_1', stored)]);

    const transactions = await storageService.getTransactions('user1');

    expect(transactions).toHaveLength(1);
    expect(transactions[0]).toMatchObject({
      id: 'tx_1',
      buyerCountry: 'FR',
      amount: 500,
      hash: 'h1',
      sequenceNumber: 1,
      keyEpoch: 0,
      timestamp: 1700000000000,
    });
  });

  it('preserves createdAt when updating seller info', async () => {
    getDocument.mockResolvedValue({
      name: 'Old Name',
      email: 'seller@example.com',
      vatId: 'BG123',
      country: 'BG',
      createdAt: 1600000000000,
    });

    await storageService.saveSellerInfo('user1', {
      name: 'New Name',
      vatId: 'BG999',
      country: 'BG',
      email: 'seller@example.com',
    });

    expect(saveData).toHaveBeenCalledWith(
      'users',
      'user1',
      expect.objectContaining({ name: 'New Name', createdAt: 1600000000000 }),
    );
  });
});

describe('FirestoreStorageService - non-demo mode (Firestore)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isDemoMode.mockReturnValue(false);
    queryData.mockResolvedValue([]);
  });

  it('writes audit fields obtained from an explicit signer, never bundling a key', async () => {
    const mockSigner: AuditSigner = {
      sign: vi.fn().mockResolvedValue({
        hash: 'server-hash',
        previousHash: '',
        sequenceNumber: 1,
        keyEpoch: 5,
      }),
    };

    const tx = await storageService.addTransaction('user1', baseTransaction, mockSigner);

    expect(mockSigner.sign).toHaveBeenCalled();
    expect(getApp).not.toHaveBeenCalled();
    expect(tx.hash).toBe('server-hash');
    expect(tx.keyEpoch).toBe(5);
    expect(saveData).toHaveBeenCalledWith(
      'users/user1/transactions',
      tx.id,
      expect.objectContaining({ hash: 'server-hash', keyEpoch: 5 }),
    );
  });

  it('throws when no Firebase app is available for the default Cloud Function signer', async () => {
    getApp.mockReturnValue(null);

    await expect(storageService.addTransaction('user1', baseTransaction)).rejects.toThrow(
      'Firebase app not initialized',
    );
  });
});
