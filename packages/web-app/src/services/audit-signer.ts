/**
 * Audit Chain Signing (Refactor 6)
 *
 * The audit chain's HMAC-SHA256 signing key (see @oss-vat/shared-core's
 * audit-chain.ts / key-rotation.ts) MUST NOT be bundled into the browser
 * client. This module defines the AuditSigner interface the web app uses
 * to obtain audit-chain fields (hash, previousHash, sequenceNumber,
 * keyEpoch) for a new transaction or correction without the raw signing
 * key ever reaching the client.
 */

import { FirebaseApp } from 'firebase/app';
import { getFunctions, httpsCallable, Functions } from 'firebase/functions';
import { createAuditEntry } from '@oss-vat/shared-core';

/**
 * Audit-chain fields that must accompany a transaction/correction write so
 * firestore.rules' validateAuditFields()/validateCorrection() accept it.
 */
export interface AuditFields {
  hash: string;
  previousHash: string;
  sequenceNumber: number;
  keyEpoch: number;
}

/**
 * Signs a new audit chain entry for the given record.
 *
 * @param data - the record being written (transaction/correction fields
 *   that participate in the hash, excluding the audit fields themselves)
 * @param previousHash - hash of the current chain head (empty for genesis)
 * @param sequenceNumber - position this new entry will occupy (1 for genesis)
 */
export interface AuditSigner {
  sign(
    data: Record<string, unknown>,
    previousHash: string,
    sequenceNumber: number,
  ): Promise<AuditFields>;
}

/**
 * Production signer: delegates HMAC-SHA256 signing to a callable Cloud
 * Function so the signing key never reaches the browser.
 *
 * See functions/sign-audit-entry.stub.ts for the (non-deployed)
 * server-side implementation this calls.
 */
export class CloudFunctionAuditSigner implements AuditSigner {
  private readonly functions: Functions;

  constructor(app: FirebaseApp) {
    this.functions = getFunctions(app);
  }

  async sign(
    data: Record<string, unknown>,
    previousHash: string,
    sequenceNumber: number,
  ): Promise<AuditFields> {
    const signAuditEntry = httpsCallable<
      { data: Record<string, unknown>; previousHash: string; sequenceNumber: number },
      AuditFields
    >(this.functions, 'signAuditEntry');

    const result = await signAuditEntry({ data, previousHash, sequenceNumber });
    return result.data;
  }
}

/**
 * DEV/DEMO-ONLY signer.
 *
 * Signs entries locally using a non-secret placeholder key and a fixed
 * "demo" key epoch. This is safe ONLY because demo mode never writes to a
 * real Firestore project - the resulting entries carry no real compliance
 * guarantees and MUST NEVER be used when Firebase is configured for a real
 * project.
 */
export class DevAuditSigner implements AuditSigner {
  /** Non-secret placeholder key - demo mode only, never used in production. */
  private static readonly DEMO_KEY = 'demo-mode-non-production-key';
  /** Reserved key epoch (0) signalling "signed by DevAuditSigner, demo data only". */
  private static readonly DEMO_KEY_EPOCH = 0;

  async sign(
    data: Record<string, unknown>,
    previousHash: string,
    sequenceNumber: number,
  ): Promise<AuditFields> {
    const entry = await createAuditEntry(
      data,
      previousHash,
      DevAuditSigner.DEMO_KEY,
      DevAuditSigner.DEMO_KEY_EPOCH,
      sequenceNumber,
    );

    return {
      hash: entry.hash,
      previousHash: entry.previousHash,
      sequenceNumber: entry.sequenceNumber,
      keyEpoch: entry.keyEpoch,
    };
  }
}
