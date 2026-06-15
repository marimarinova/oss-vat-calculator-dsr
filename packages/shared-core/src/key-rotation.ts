/**
 * Audit Chain Key Rotation (Refactor 4.3)
 *
 * The audit chain's HMAC-SHA256 signing key is rotated quarterly. Each
 * rotation introduces a new "key epoch". Audit entries record which epoch
 * they were signed under (AuditEntry.keyEpoch), so a chain that spans a
 * rotation boundary can still be verified by selecting the correct key per
 * entry.
 *
 * Quarterly rotation schedule (enforced by a scheduled Cloud Function, see
 * functions/rotate-audit-chain-key.stub.ts): a new key epoch becomes
 * effective at 00:00 UTC on 1 January, 1 April, 1 July and 1 October.
 *
 * SECURITY: raw signing keys are never stored alongside chain data and are
 * never exposed by this module's public types. AuditChainKeyEpoch carries
 * only a keyFingerprint - the last 8 bytes (16 hex chars) of the SHA-256
 * digest of the key - which can be used to confirm which key was in effect
 * without revealing it.
 */

import { AuditChainKeyProvider, getSubtleCrypto } from './audit-chain';

/**
 * Public metadata describing a signing key epoch. Deliberately excludes the
 * raw key - only a one-way fingerprint is exposed.
 */
export interface AuditChainKeyEpoch {
  /** Monotonically increasing epoch number (matches AuditEntry.keyEpoch) */
  epoch: number;
  /** When this key became effective (inclusive) */
  effectiveFrom: Date;
  /** When this key stopped being effective (exclusive), if rotated out */
  effectiveTo?: Date;
  /** Last 8 bytes (16 hex chars) of SHA-256(key) - never the raw key */
  keyFingerprint: string;
}

/**
 * A single key epoch registration, including the raw signing key.
 * Only ever held in memory by AuditChainKeyRegistry; never serialized.
 */
export interface AuditChainKeyEpochDefinition {
  /** Monotonically increasing epoch number (matches AuditEntry.keyEpoch) */
  epoch: number;
  /** Raw HMAC-SHA256 signing key for this epoch */
  key: string;
  /** When this key became effective (inclusive) */
  effectiveFrom: Date;
  /** When this key stopped being effective (exclusive), if rotated out */
  effectiveTo?: Date;
}

/**
 * Compute a fingerprint for a signing key: the last 8 bytes (16 hex chars)
 * of its SHA-256 digest. Used to identify which key is in effect without
 * ever storing or exposing the raw key.
 */
export async function computeKeyFingerprint(key: string): Promise<string> {
  const subtle = await getSubtleCrypto();
  const encoder = new TextEncoder();
  const digest = new Uint8Array(await subtle.digest('SHA-256', encoder.encode(key)));
  const lastEightBytes = digest.slice(-8);
  return Array.from(lastEightBytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * In-memory registry of audit chain signing keys, keyed by epoch.
 *
 * Holds the raw signing keys for the lifetime of the process so the audit
 * chain can be created/verified, while only ever exposing fingerprints
 * (AuditChainKeyEpoch) to callers via describeEpoch().
 */
export class AuditChainKeyRegistry implements AuditChainKeyProvider {
  private readonly epochs: readonly AuditChainKeyEpochDefinition[];

  constructor(epochs: AuditChainKeyEpochDefinition[]) {
    if (epochs.length === 0) {
      throw new Error('AuditChainKeyRegistry requires at least one key epoch');
    }
    this.epochs = [...epochs].sort((a, b) => a.epoch - b.epoch);
  }

  /**
   * @param keyEpoch - The epoch to resolve
   * @returns The raw signing key registered for `keyEpoch`
   * @throws if no key is registered for `keyEpoch`
   */
  getKey(keyEpoch: number): string {
    const definition = this.epochs.find((e) => e.epoch === keyEpoch);
    if (!definition) {
      throw new Error(`No audit chain signing key registered for key epoch ${keyEpoch}`);
    }
    return definition.key;
  }

  /**
   * Select the epoch that is active at the given date, based on each
   * epoch's effectiveFrom/effectiveTo window.
   *
   * @param date - The date to resolve an active epoch for
   * @returns The active epoch number
   * @throws if no registered epoch covers `date`
   */
  getActiveEpoch(date: Date): number {
    const active = this.epochs.find(
      (e) => date >= e.effectiveFrom && (e.effectiveTo === undefined || date < e.effectiveTo),
    );
    if (!active) {
      throw new Error(`No audit chain signing key epoch is active for ${date.toISOString()}`);
    }
    return active.epoch;
  }

  /**
   * @param keyEpoch - The epoch to describe
   * @returns Public metadata for `keyEpoch`, including its key fingerprint
   *   but never the raw key
   * @throws if no key is registered for `keyEpoch`
   */
  async describeEpoch(keyEpoch: number): Promise<AuditChainKeyEpoch> {
    const definition = this.epochs.find((e) => e.epoch === keyEpoch);
    if (!definition) {
      throw new Error(`No audit chain signing key registered for key epoch ${keyEpoch}`);
    }
    return {
      epoch: definition.epoch,
      effectiveFrom: definition.effectiveFrom,
      effectiveTo: definition.effectiveTo,
      keyFingerprint: await computeKeyFingerprint(definition.key),
    };
  }
}
