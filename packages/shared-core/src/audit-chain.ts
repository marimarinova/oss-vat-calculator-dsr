/**
 * HMAC-SHA256 Audit Chain
 *
 * Design Principle 2: Tampering with any record breaks the chain and is detectable
 * by recomputing hashes forward from genesis. Each write operation appends an HMAC-SHA256
 * hash linking the current record to the hash of the preceding entry.
 * Key derived from seller's authentication credential, rotated quarterly.
 *
 * Lightweight alternative to blockchain immutability without the computational overhead.
 */

/**
 * Represents a single entry in the audit chain
 */
export interface AuditEntry {
  /** Unique identifier for this entry */
  id: string;
  /** The data that was recorded */
  data: Record<string, unknown>;
  /** Unix timestamp in milliseconds */
  timestamp: number;
  /** Position of this entry in the chain (1 for genesis, strictly +1 each entry) */
  sequenceNumber: number;
  /**
   * The signing key epoch this entry was hashed under (see key-rotation.ts).
   * Required to select the correct key when verifying the chain across a
   * key rotation boundary.
   */
  keyEpoch: number;
  /** HMAC-SHA256 hash of the previous entry (genesis entry has empty string) */
  previousHash: string;
  /** HMAC-SHA256 hash of this entry (computed with key and data) */
  hash: string;
}

/**
 * Result of chain verification
 */
export interface VerificationResult {
  /** Whether the entire chain is valid */
  valid: boolean;
  /** If invalid, the index where the chain was broken */
  brokenAt?: number;
  /** Details about the verification */
  details?: string;
}

/**
 * Resolve the Web Crypto SubtleCrypto implementation.
 * Uses the global Web Crypto API when present (browsers, modern Node),
 * otherwise falls back to Node's webcrypto module.
 */
export async function getSubtleCrypto(): Promise<SubtleCrypto> {
  if (globalThis.crypto?.subtle) {
    return globalThis.crypto.subtle;
  }
  const { webcrypto } = await import('node:crypto');
  return webcrypto.subtle;
}

/**
 * Compute HMAC-SHA256 hash of data using the Web Crypto SubtleCrypto API
 * @param data - String data to hash
 * @param key - Secret key for HMAC computation
 * @returns Lowercase hexadecimal representation of the hash
 */
export async function computeHmac(data: string, key: string): Promise<string> {
  const subtle = await getSubtleCrypto();
  const encoder = new TextEncoder();

  const cryptoKey = await subtle.importKey(
    'raw',
    encoder.encode(key),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  const signature = await subtle.sign('HMAC', cryptoKey, encoder.encode(data));

  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Serialize an audit entry for hashing
 * Creates a deterministic JSON representation excluding the entry's own hash
 */
function serializeForHashing(
  id: string,
  data: Record<string, unknown>,
  timestamp: number,
  sequenceNumber: number,
  keyEpoch: number,
  previousHash: string,
): string {
  return JSON.stringify({
    id,
    data,
    timestamp,
    sequenceNumber,
    keyEpoch,
    previousHash,
  });
}

/**
 * Create a new audit entry
 * @param data - The data to record
 * @param previousHash - Hash of the previous entry (empty string for genesis)
 * @param key - Secret key for the given keyEpoch, derived from seller's authentication credential
 * @param keyEpoch - The signing key epoch `key` belongs to (see key-rotation.ts)
 * @param sequenceNumber - Position of this entry in the chain (1 for genesis, strictly +1 each entry)
 * @param id - Optional ID for the entry (will be generated if not provided)
 * @returns The new audit entry with computed hash
 */
export async function createAuditEntry(
  data: Record<string, unknown>,
  previousHash: string,
  key: string,
  keyEpoch: number,
  sequenceNumber: number,
  id?: string,
): Promise<AuditEntry> {
  const entryId = id || generateEntryId();
  const timestamp = Date.now();

  // Serialize the entry data for hashing
  const serialized = serializeForHashing(
    entryId,
    data,
    timestamp,
    sequenceNumber,
    keyEpoch,
    previousHash,
  );

  // Compute HMAC-SHA256 hash
  const hash = await computeHmac(serialized, key);

  return {
    id: entryId,
    data,
    timestamp,
    sequenceNumber,
    keyEpoch,
    previousHash,
    hash,
  };
}

/**
 * Resolves the signing key for a given audit chain key epoch.
 * Implemented by AuditChainKeyRegistry (see key-rotation.ts), but kept as a
 * minimal interface here so audit-chain.ts has no dependency on the
 * key-rotation module.
 */
export interface AuditChainKeyProvider {
  getKey(keyEpoch: number): string;
}

/**
 * Verify an entire audit chain
 * @param entries - Array of audit entries to verify, in chronological order
 * @param keys - Provides the signing key for each entry's keyEpoch. A chain
 *   spanning multiple key-rotation epochs verifies correctly as long as the
 *   provider can resolve every epoch referenced by the entries.
 * @returns Verification result indicating validity and any break point
 */
export async function verifyChain(
  entries: AuditEntry[],
  keys: AuditChainKeyProvider,
): Promise<VerificationResult> {
  if (entries.length === 0) {
    return {
      valid: true,
      details: 'Empty chain is valid',
    };
  }

  // Verify first entry (genesis) - previousHash should be empty string
  const firstEntry = entries[0];
  if (firstEntry.previousHash !== '') {
    return {
      valid: false,
      brokenAt: 0,
      details: 'Genesis entry must have empty previousHash',
    };
  }

  // Verify genesis sequence number
  if (firstEntry.sequenceNumber !== 1) {
    return {
      valid: false,
      brokenAt: 0,
      details: 'Genesis entry must have sequenceNumber 1',
    };
  }

  // Verify first entry's hash
  const firstSerialized = serializeForHashing(
    firstEntry.id,
    firstEntry.data,
    firstEntry.timestamp,
    firstEntry.sequenceNumber,
    firstEntry.keyEpoch,
    firstEntry.previousHash,
  );
  let firstKey: string;
  try {
    firstKey = keys.getKey(firstEntry.keyEpoch);
  } catch (error) {
    return {
      valid: false,
      brokenAt: 0,
      details: `No signing key available for entry 0's keyEpoch ${firstEntry.keyEpoch}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    };
  }
  const firstComputedHash = await computeHmac(firstSerialized, firstKey);
  if (firstComputedHash !== firstEntry.hash) {
    return {
      valid: false,
      brokenAt: 0,
      details: 'Genesis entry hash does not match',
    };
  }

  // Verify remaining entries
  for (let i = 1; i < entries.length; i++) {
    const current = entries[i];
    const previous = entries[i - 1];

    // Check that previousHash points to the previous entry
    if (current.previousHash !== previous.hash) {
      return {
        valid: false,
        brokenAt: i,
        details: `Entry ${i} previousHash does not match previous entry's hash (tampering detected)`,
      };
    }

    // Check that the sequence number is exactly one greater than the previous entry
    // (catches gaps, duplicates and non-monotonic sequences, e.g. from deleted or
    // truncated entries)
    if (current.sequenceNumber !== previous.sequenceNumber + 1) {
      return {
        valid: false,
        brokenAt: i,
        details: `Entry ${i} sequenceNumber ${current.sequenceNumber} is not the expected ${
          previous.sequenceNumber + 1
        } (entry deletion or reordering detected)`,
      };
    }

    // Recompute this entry's hash using the key for its own keyEpoch, so
    // entries signed before and after a key rotation both verify correctly.
    const serialized = serializeForHashing(
      current.id,
      current.data,
      current.timestamp,
      current.sequenceNumber,
      current.keyEpoch,
      current.previousHash,
    );
    let currentKey: string;
    try {
      currentKey = keys.getKey(current.keyEpoch);
    } catch (error) {
      return {
        valid: false,
        brokenAt: i,
        details: `No signing key available for entry ${i}'s keyEpoch ${current.keyEpoch}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      };
    }
    const computedHash = await computeHmac(serialized, currentKey);

    if (computedHash !== current.hash) {
      return {
        valid: false,
        brokenAt: i,
        details: `Entry ${i} hash does not match (data tampering detected)`,
      };
    }
  }

  return {
    valid: true,
    details: `Chain verified: ${entries.length} entries are valid and unmodified`,
  };
}

/**
 * Generate a unique entry ID
 * Uses timestamp + random suffix for collision resistance
 */
function generateEntryId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 11);
  return `entry-${timestamp}-${random}`;
}

/**
 * Verify a single entry's hash (for integrity check without full chain verification)
 * @param entry - The entry to verify
 * @param key - The secret key for the entry's keyEpoch
 * @returns True if the entry's hash is valid, false otherwise
 */
export async function verifySingleEntry(entry: AuditEntry, key: string): Promise<boolean> {
  const serialized = serializeForHashing(
    entry.id,
    entry.data,
    entry.timestamp,
    entry.sequenceNumber,
    entry.keyEpoch,
    entry.previousHash,
  );
  const computedHash = await computeHmac(serialized, key);
  return computedHash === entry.hash;
}
