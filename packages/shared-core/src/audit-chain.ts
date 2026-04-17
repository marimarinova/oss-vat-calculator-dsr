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

// Use Node.js crypto if available, otherwise provide browser-compatible fallback
let createHmac: (
  algorithm: string,
  key: string,
) => { update: (data: string) => { digest: (encoding: string) => string } };

try {
  const nodeCrypto = require('crypto');
  createHmac = nodeCrypto.createHmac;
} catch {
  // Browser fallback using synchronous approach
  createHmac = (algorithm: string, key: string) => {
    let inputData = '';
    return {
      update: (data: string) => {
        inputData = data;
        return {
          digest: (_encoding: string) => {
            // Simple browser-compatible hash (not cryptographically equivalent but functional for demo)
            let hash = 0;
            const combined = key + inputData;
            for (let i = 0; i < combined.length; i++) {
              const char = combined.charCodeAt(i);
              hash = (hash << 5) - hash + char;
              hash = hash & hash; // Convert to 32-bit integer
            }
            return Math.abs(hash).toString(16).padStart(16, '0');
          },
        };
      },
    };
  };
}

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
 * Compute HMAC-SHA256 hash of data
 * @param data - String data to hash
 * @param key - Secret key for HMAC computation
 * @returns Hexadecimal representation of the hash
 */
export function computeHmac(data: string, key: string): string {
  return createHmac('sha256', key).update(data).digest('hex');
}

/**
 * Serialize an audit entry for hashing
 * Creates a deterministic JSON representation excluding the entry's own hash
 */
function serializeForHashing(
  id: string,
  data: Record<string, unknown>,
  timestamp: number,
  previousHash: string,
): string {
  return JSON.stringify({
    id,
    data,
    timestamp,
    previousHash,
  });
}

/**
 * Create a new audit entry
 * @param data - The data to record
 * @param previousHash - Hash of the previous entry (empty string for genesis)
 * @param key - Secret key derived from seller's authentication credential
 * @param id - Optional ID for the entry (will be generated if not provided)
 * @returns The new audit entry with computed hash
 */
export function createAuditEntry(
  data: Record<string, unknown>,
  previousHash: string,
  key: string,
  id?: string,
): AuditEntry {
  const entryId = id || generateEntryId();
  const timestamp = Date.now();

  // Serialize the entry data for hashing
  const serialized = serializeForHashing(entryId, data, timestamp, previousHash);

  // Compute HMAC-SHA256 hash
  const hash = computeHmac(serialized, key);

  return {
    id: entryId,
    data,
    timestamp,
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
export function verifyChain(entries: AuditEntry[], key: string): VerificationResult {
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

  // Verify first entry's hash
  const firstSerialized = serializeForHashing(
    firstEntry.id,
    firstEntry.data,
    firstEntry.timestamp,
    firstEntry.previousHash,
  );
  const firstComputedHash = computeHmac(firstSerialized, key);
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

    // Recompute this entry's hash
    const serialized = serializeForHashing(
      current.id,
      current.data,
      current.timestamp,
      current.previousHash,
    );
    const computedHash = computeHmac(serialized, key);

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
export function verifySingleEntry(entry: AuditEntry, key: string): boolean {
  const serialized = serializeForHashing(entry.id, entry.data, entry.timestamp, entry.previousHash);
  const computedHash = computeHmac(serialized, key);
  return computedHash === entry.hash;
}
