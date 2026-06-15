/**
 * STUB — Quarterly Audit Chain Key Rotation (Refactor 4.3)
 *
 * This file is illustrative only. It is NOT deployed, NOT built, and NOT
 * part of any pnpm workspace package or test suite (the `functions/`
 * directory is intentionally outside `packages/*` in pnpm-workspace.yaml).
 * No Firebase Functions build dependency has been added to the project.
 *
 * Intent: a scheduled Cloud Function (Cloud Scheduler + Pub/Sub trigger,
 * or `functions.pubsub.schedule(...)`) runs at 00:00 UTC on the first day
 * of each calendar quarter - 1 January, 1 April, 1 July, 1 October - and:
 *
 *   1. Generates a new random signing key for the next AuditChainKeyEpoch
 *      (epoch = previous epoch + 1, effectiveFrom = the trigger time).
 *   2. Sets effectiveTo on the previous epoch to the same timestamp.
 *   3. Stores the new key in a secrets manager (e.g. Google Secret Manager),
 *      never in Firestore alongside chain data.
 *   4. Records the new epoch's public metadata (epoch, effectiveFrom,
 *      keyFingerprint via computeKeyFingerprint from
 *      @oss-vat/shared-core's key-rotation module) so clients can confirm
 *      which key is active without ever seeing the raw key.
 *
 * New AuditEntry writes after rotation use the new epoch's key and set
 * `keyEpoch` to the new epoch number. AuditChainKeyRegistry (see
 * @oss-vat/shared-core key-rotation.ts) holds every epoch's key for the
 * lifetime of the chain so verifyChain() can verify entries written under
 * any past epoch.
 *
 * Cron schedule (illustrative, Cloud Scheduler syntax): "0 0 1 1,4,7,10 *"
 */

export {};
