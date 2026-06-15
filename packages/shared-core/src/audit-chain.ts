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
async function getSubtleCrypto(): Promise<SubtleCrypto> {
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
  previousHash: string,
): string {
  return JSON.stringify({
    id,
    data,
    timestamp,
    sequenceNumber,
    previousHash,
  });
}

/**
 * Create a new audit entry
 * @param data - The data to record
 * @param previousHash - Hash of the previous entry (empty string for genesis)
 * @param key - Secret key derived from seller's authentication credential
 * @param sequenceNumber - Position of this entry in the chain (1 for genesis, strictly +1 each entry)
 * @param id - Optional ID for the entry (will be generated if not provided)
 * @returns The new audit entry with computed hash
 */
export async function createAuditEntry(
  data: Record<string, unknown>,
  previousHash: string,
  key: string,
  sequenceNumber: number,
  id?: string,
): Promise<AuditEntry> {
  const entryId = id || generateEntryId();
  const timestamp = Date.now();

  // Serialize the entry data for hashing
  const serialized = serializeForHashing(entryId, data, timestamp, sequenceNumber, previousHash);

  // Compute HMAC-SHA256 hash
  const hash = await computeHmac(serialized, key);

  return {
    id: entryId,
    data,
    timestamp,
    sequenceNumber,
    previousHash,
    hash,
  };
}

/**
 * Verify an entire audit chain
 * @param entries - Array of audit entries to verify, in chronological order
 * @param key - Secret key used to compute the hashes
 * @returns Verification result indicating validity and any break point
 */
export async function verifyChain(
  entries: AuditEntry[],
  key: string,
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
    firstEntry.previousHash,
  );
  const firstComputedHash = await computeHmac(firstSerialized, key);
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

    // Recompute this entry's hash
    const serialized = serializeForHashing(
      current.id,
      current.data,
      current.timestamp,
      current.sequenceNumber,
      current.previousHash,
    );
    const computedHash = await computeHmac(serialized, key);

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
 * @param key - The secret key
 * @returns True if the entry's hash is valid, false otherwise
 */
export async function verifySingleEntry(entry: AuditEntry, key: string): Promise<boolean> {
  const serialized = serializeForHashing(
    entry.id,
    entry.data,
    entry.timestamp,
    entry.sequenceNumber,
    entry.previousHash,
  );
  const computedHash = await computeHmac(serialized, key);
  return computedHash === entry.hash;
}
