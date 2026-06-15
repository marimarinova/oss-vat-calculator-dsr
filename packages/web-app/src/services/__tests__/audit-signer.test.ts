import { describe, it, expect, vi } from 'vitest';
import type { FirebaseApp } from 'firebase/app';

const { getFunctionsMock, httpsCallableMock } = vi.hoisted(() => ({
  getFunctionsMock: vi.fn(),
  httpsCallableMock: vi.fn(),
}));

vi.mock('firebase/functions', () => ({
  getFunctions: (...args: unknown[]) => getFunctionsMock(...args),
  httpsCallable: (...args: unknown[]) => httpsCallableMock(...args),
}));

import { DevAuditSigner, CloudFunctionAuditSigner } from '../audit-signer';

describe('DevAuditSigner', () => {
  it('signs entries with the demo key epoch and echoes chain position', async () => {
    const signer = new DevAuditSigner();
    const result = await signer.sign({ foo: 'bar' }, '', 1);

    expect(result.keyEpoch).toBe(0);
    expect(result.previousHash).toBe('');
    expect(result.sequenceNumber).toBe(1);
    expect(result.hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('chains sequential entries via previousHash', async () => {
    const signer = new DevAuditSigner();
    const first = await signer.sign({ foo: 'bar' }, '', 1);
    const second = await signer.sign({ foo: 'baz' }, first.hash, 2);

    expect(second.previousHash).toBe(first.hash);
    expect(second.sequenceNumber).toBe(2);
    expect(second.hash).not.toBe(first.hash);
  });
});

describe('CloudFunctionAuditSigner', () => {
  it('delegates signing to the signAuditEntry callable Cloud Function', async () => {
    const callable = vi.fn().mockResolvedValue({
      data: { hash: 'server-hash', previousHash: '', sequenceNumber: 1, keyEpoch: 3 },
    });
    httpsCallableMock.mockReturnValue(callable);
    const fakeFunctions = { app: 'mock-functions-instance' };
    getFunctionsMock.mockReturnValue(fakeFunctions);

    const fakeApp = {} as FirebaseApp;
    const signer = new CloudFunctionAuditSigner(fakeApp);
    const result = await signer.sign({ foo: 'bar' }, '', 1);

    expect(getFunctionsMock).toHaveBeenCalledWith(fakeApp);
    expect(httpsCallableMock).toHaveBeenCalledWith(fakeFunctions, 'signAuditEntry');
    expect(callable).toHaveBeenCalledWith({
      data: { foo: 'bar' },
      previousHash: '',
      sequenceNumber: 1,
    });
    expect(result).toEqual({
      hash: 'server-hash',
      previousHash: '',
      sequenceNumber: 1,
      keyEpoch: 3,
    });
  });
});
