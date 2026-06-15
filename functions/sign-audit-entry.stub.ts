/**
 * STUB — Server-Side Audit Chain Signer (Refactor 6)
 *
 * This file is illustrative only. It is NOT deployed, NOT built, and NOT
 * part of any pnpm workspace package or test suite (the `functions/`
 * directory is intentionally outside `packages/*` in pnpm-workspace.yaml).
 * No Firebase Functions build dependency has been added to the project.
 *
 * Intent: an HTTPS callable Cloud Function `signAuditEntry(data,
 * previousHash, sequenceNumber)` that:
 *
 *   1. Authenticates the caller via `context.auth.uid` (the function must
 *      reject unauthenticated calls).
 *   2. Loads the current AuditChainKeyRegistry (see
 *      @oss-vat/shared-core key-rotation.ts) from a secrets manager
 *      (e.g. Google Secret Manager) - the raw signing keys never leave
 *      this server-side environment.
 *   3. Resolves the active key epoch for "now" via
 *      `registry.getActiveEpoch(new Date())`.
 *   4. Calls `createAuditEntry(data, previousHash, key, keyEpoch,
 *      sequenceNumber)` from @oss-vat/shared-core to compute the
 *      HMAC-SHA256 hash.
 *   5. Returns only `{ hash, previousHash, sequenceNumber, keyEpoch }` to
 *      the client - never the raw key.
 *
 * The web app's CloudFunctionAuditSigner (see
 * packages/web-app/src/services/audit-signer.ts) calls this function by
 * name ('signAuditEntry') via `firebase/functions`' httpsCallable(). Until
 * this function is deployed, CloudFunctionAuditSigner cannot be used; the
 * web app uses DevAuditSigner in demo mode instead (see
 * packages/web-app/src/services/audit-signer.ts).
 *
 * Illustrative implementation sketch (Firebase Functions v2 syntax):
 *
 *   export const signAuditEntry = onCall(async (request) => {
 *     if (!request.auth) {
 *       throw new HttpsError('unauthenticated', 'Sign-in required');
 *     }
 *     const { data, previousHash, sequenceNumber } = request.data;
 *     const registry = await loadKeyRegistryFromSecretManager();
 *     const keyEpoch = registry.getActiveEpoch(new Date());
 *     const key = registry.getKey(keyEpoch);
 *     const entry = await createAuditEntry(data, previousHash, key, keyEpoch, sequenceNumber);
 *     return { hash: entry.hash, previousHash: entry.previousHash, sequenceNumber: entry.sequenceNumber, keyEpoch: entry.keyEpoch };
 *   });
 */

export {};
