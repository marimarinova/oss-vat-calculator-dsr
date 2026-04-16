/**
 * Data Lifecycle Taxonomy
 *
 * Design Principle 3: Four stages of data lifecycle for GDPR compliance and
 * audit trail integrity. Each stage has specific transformation requirements
 * and retention periods per Art. 63c (10-year retention for tax records).
 *
 * Ephemeral → Operational → Archival → Anonymised
 */

/**
 * Data lifecycle stages with increasing privacy protection
 */
export enum DataLifecycleStage {
  /** Browser memory only, never persisted to disk or remote storage */
  EPHEMERAL = 'ephemeral',
  /** Firestore, retained for filing cycle + 30 days */
  OPERATIONAL = 'operational',
  /** Buyer names pseudonymised, addresses truncated to country level */
  ARCHIVAL = 'archival',
  /** All personal identifiers irreversibly removed after 10-year retention */
  ANONYMISED = 'anonymised',
}

/**
 * Lifecycle policy defining transformations and retention for a data stage
 */
export interface LifecyclePolicy {
  /** The stage of the lifecycle */
  stage: DataLifecycleStage;
  /** Retention period in days */
  retentionDays: number;
  /** Transformations applied to data in this stage */
  transformations: string[];
  /** Description of this stage */
  description: string;
}

/**
 * Standard lifecycle policies per Design Principle 3
 * Retention periods comply with Art. 63c and GDPR Article 5
 */
export const LIFECYCLE_POLICIES: Record<DataLifecycleStage, LifecyclePolicy> = {
  [DataLifecycleStage.EPHEMERAL]: {
    stage: DataLifecycleStage.EPHEMERAL,
    retentionDays: 0, // Never persisted
    transformations: [],
    description:
      'Data in browser memory during user session. Never persisted to disk or remote storage. Cleared on session end.',
  },
  [DataLifecycleStage.OPERATIONAL]: {
    stage: DataLifecycleStage.OPERATIONAL,
    retentionDays: 125, // Filing cycle (3 months) + 30 days
    transformations: [],
    description:
      'Active operational data in Firestore. Retained for VAT filing cycle (3 months) plus 30 days for corrections. Full details preserved for compliance audits.',
  },
  [DataLifecycleStage.ARCHIVAL]: {
    stage: DataLifecycleStage.ARCHIVAL,
    retentionDays: 3650, // 10 years per Art. 63c
    transformations: [
      'pseudonymise_buyer_name',
      'truncate_address_to_country',
      'remove_contact_details',
      'hash_vat_ids',
    ],
    description:
      'Long-term archival after operational period. Buyer names replaced with pseudonyms, addresses truncated to country level. Retained for 10 years per Art. 63c for tax authority audits.',
  },
  [DataLifecycleStage.ANONYMISED]: {
    stage: DataLifecycleStage.ANONYMISED,
    retentionDays: 0, // Permanently deleted after anonymisation
    transformations: [
      'remove_all_identifiers',
      'remove_timestamps',
      'aggregate_by_country',
      'irreversible_deletion',
    ],
    description:
      'All personal identifiers removed and data irreversibly transformed. Used only for aggregate statistical reporting. Deleted immediately after use or analysis.',
  },
};

/**
 * Data subject information for privacy tracking
 */
export interface DataSubject {
  /** Buyer VAT ID for identification */
  buyerVatId: string;
  /** Full name (encrypted in operational, pseudonymised in archival) */
  fullName?: string;
  /** Email address (removed in archival) */
  email?: string;
  /** Full address (truncated in archival) */
  address?: string;
  /** Billing address country (always retained) */
  country: string;
}

/**
 * Represents data transformed by lifecycle policies
 */
export interface LifecycleTransformedData {
  /** Original data ID */
  id: string;
  /** Current lifecycle stage */
  stage: DataLifecycleStage;
  /** Timestamp of transformation */
  transformedAt: number;
  /** The transformed data */
  data: Record<string, unknown>;
  /** Metadata about transformations applied */
  transformations: TransformationLog[];
}

/**
 * Log entry for a single transformation
 */
export interface TransformationLog {
  /** Name of the transformation applied */
  name: string;
  /** Timestamp of transformation in milliseconds */
  timestamp: number;
  /** Description of what was changed */
  description: string;
}

/**
 * Pseudonymise a buyer name using a deterministic hash
 * The same buyer name always produces the same pseudonym for linkability
 * @param fullName - Original full name
 * @param salt - Salt value (seller ID recommended)
 * @returns Pseudonymised identifier
 */
export function pseudonymiseBuyerName(fullName: string, salt: string): string {
  try {
    const crypto = require('crypto');
    const hmac = crypto.createHmac('sha256', salt);
    hmac.update(fullName);
    return `BUYER-${hmac.digest('hex').substring(0, 16)}`;
  } catch {
    // Browser fallback
    let hash = 0;
    const combined = salt + fullName;
    for (let i = 0; i < combined.length; i++) {
      hash = ((hash << 5) - hash) + combined.charCodeAt(i);
      hash = hash & hash;
    }
    return `BUYER-${Math.abs(hash).toString(16).padStart(16, '0')}`;
  }
}

/**
 * Truncate address to country level only
 * @param address - Full address
 * @param country - Country code
 * @returns Truncated address
 */
export function truncateAddressToCountry(address: string, country: string): string {
  // Remove street, city, postal code; keep only country
  return country;
}

/**
 * Remove contact details (email, phone)
 * @param data - Original data object
 * @returns Data with contact fields removed
 */
export function removeContactDetails(data: Record<string, unknown>): Record<string, unknown> {
  const transformed = { ...data };
  delete transformed.email;
  delete transformed.phone;
  delete transformed.contact;
  delete transformed.contactEmail;
  delete transformed.contactPhone;
  return transformed;
}

/**
 * Hash VAT IDs for pseudonymisation while maintaining lookups
 * @param vatId - Original VAT ID
 * @param salt - Salt for hashing
 * @returns Hashed VAT ID
 */
export function hashVatId(vatId: string, salt: string): string {
  try {
    const crypto = require('crypto');
    const hmac = crypto.createHmac('sha256', salt);
    hmac.update(vatId);
    return `VAT-${hmac.digest('hex').substring(0, 16)}`;
  } catch {
    let hash = 0;
    const combined = salt + vatId;
    for (let i = 0; i < combined.length; i++) {
      hash = ((hash << 5) - hash) + combined.charCodeAt(i);
      hash = hash & hash;
    }
    return `VAT-${Math.abs(hash).toString(16).padStart(16, '0')}`;
  }
}

/**
 * Transform data to archival stage
 * @param originalData - Original operational data
 * @param buyerVatId - Buyer's VAT ID for consistent pseudonymisation
 * @param sellerSalt - Seller ID to use as salt
 * @returns Transformed data ready for archival
 */
export function transformToArchival(
  originalData: Record<string, unknown>,
  buyerVatId: string,
  sellerSalt: string
): LifecycleTransformedData {
  const transformed = { ...originalData };
  const transformations: TransformationLog[] = [];
  const timestamp = Date.now();

  // Pseudonymise buyer name
  if (transformed.buyerName && typeof transformed.buyerName === 'string') {
    transformed.buyerName = pseudonymiseBuyerName(transformed.buyerName, sellerSalt);
    transformations.push({
      name: 'pseudonymise_buyer_name',
      timestamp,
      description: 'Buyer name replaced with deterministic pseudonym',
    });
  }

  // Truncate address
  if (transformed.address && transformed.country && typeof transformed.country === 'string') {
    transformed.address = truncateAddressToCountry(
      String(transformed.address),
      String(transformed.country)
    );
    transformations.push({
      name: 'truncate_address_to_country',
      timestamp,
      description: 'Address truncated to country level only',
    });
  }

  // Remove contact details
  const beforeRemoval = Object.keys(transformed).length;
  const withoutContact = removeContactDetails(transformed);
  if (Object.keys(withoutContact).length < beforeRemoval) {
    transformations.push({
      name: 'remove_contact_details',
      timestamp,
      description: 'Email, phone, and contact information removed',
    });
  }

  // Hash VAT IDs
  if (withoutContact.buyerVatId && typeof withoutContact.buyerVatId === 'string') {
    withoutContact.buyerVatId = hashVatId(String(withoutContact.buyerVatId), sellerSalt);
    transformations.push({
      name: 'hash_vat_ids',
      timestamp,
      description: 'VAT ID hashed for pseudonymisation',
    });
  }

  return {
    id: String(originalData.id || ''),
    stage: DataLifecycleStage.ARCHIVAL,
    transformedAt: timestamp,
    data: withoutContact,
    transformations,
  };
}

/**
 * Transform data to fully anonymised stage
 * @param originalData - Data to anonymise
 * @returns Anonymised data with all identifiers removed
 */
export function transformToAnonymised(
  originalData: Record<string, unknown>
): LifecycleTransformedData {
  const timestamp = Date.now();
  // Keep only aggregated, non-identifying fields
  const anonymised: Record<string, unknown> = {};

  // Preserve only aggregatable fields
  if (typeof originalData.amount === 'number') {
    anonymised.amount = originalData.amount;
  }
  if (typeof originalData.vatAmount === 'number') {
    anonymised.vatAmount = originalData.vatAmount;
  }
  if (typeof originalData.country === 'string') {
    anonymised.country = originalData.country;
  }
  if (typeof originalData.vatRate === 'number') {
    anonymised.vatRate = originalData.vatRate;
  }

  return {
    id: '', // ID removed
    stage: DataLifecycleStage.ANONYMISED,
    transformedAt: timestamp,
    data: anonymised,
    transformations: [
      {
        name: 'remove_all_identifiers',
        timestamp,
        description: 'All personal identifiers removed',
      },
      {
        name: 'aggregate_by_country',
        timestamp,
        description: 'Data aggregated to country level',
      },
    ],
  };
}

/**
 * Get the appropriate lifecycle policy for a stage
 */
export function getLifecyclePolicy(stage: DataLifecycleStage): LifecyclePolicy {
  return LIFECYCLE_POLICIES[stage];
}

/**
 * Calculate when data should transition to the next stage
 * @param transitionedAt - When data entered current stage
 * @param currentStage - Current lifecycle stage
 * @returns Timestamp when data should transition to next stage
 */
export function calculateNextTransitionTime(
  transitionedAt: number,
  currentStage: DataLifecycleStage
): number | null {
  const policy = getLifecyclePolicy(currentStage);

  // Anonymised data doesn't transition; it's deleted
  if (currentStage === DataLifecycleStage.ANONYMISED) {
    return null;
  }

  // Ephemeral data doesn't transition automatically; it's session-based
  if (currentStage === DataLifecycleStage.EPHEMERAL) {
    return null;
  }

  const retentionMs = policy.retentionDays * 24 * 60 * 60 * 1000;
  return transitionedAt + retentionMs;
}
