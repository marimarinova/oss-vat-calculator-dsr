/**
 * @oss-vat/shared-core
 *
 * Shared infrastructure for OSS VAT Calculator monorepo.
 * Layer 1 - Data Persistence and Audit Integrity:
 *   - HMAC-SHA256 Audit Chain (Design Principle 2)
 *   - Data Lifecycle Taxonomy (Design Principle 3)
 *   - Firebase Configuration Helper
 *   - System-wide TypeScript type definitions
 *
 * @author Marieta Marinova
 * @license MIT
 */

// Core type definitions
export * from './types';

// HMAC-SHA256 Audit Chain (Design Principle 2)
export * from './audit-chain';

// Audit Chain Key Rotation (Refactor 4.3)
export * from './key-rotation';

// Data Lifecycle Taxonomy (Design Principle 3)
export * from './taxonomy';

// Firebase Configuration Helper
export * from './firebase-config';
