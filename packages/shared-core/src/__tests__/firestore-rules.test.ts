/**
 * Firestore Security Rules Tests (Refactor 4.1)
 *
 * These tests exercise the rules in `firestore.rules` against the Firebase
 * Emulator Suite via @firebase/rules-unit-testing.
 *
 * NOT RUNNABLE IN THIS ENVIRONMENT: the Firestore emulator requires a Java
 * runtime (via firebase-tools), which is not installed here. The suite is
 * therefore wrapped in `describe.skip` so `pnpm test` stays green.
 *
 * To run for real:
 *   1. Install a JDK and firebase-tools.
 *   2. Remove `.skip` below.
 *   3. `firebase emulators:exec --only firestore "pnpm --filter @oss-vat/shared-core test"`
 */

import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const RULES_PATH = resolve(__dirname, '../../../../firestore.rules');
const OWNER_UID = 'user-1';

const baseTransaction = {
  date: '2026-01-15',
  amount: 100,
  countryCode: 'EL',
  description: 'Test sale',
  createdAt: new Date(),
  hash: 'a'.repeat(64),
  previousHash: '',
  sequenceNumber: 1,
};

describe.skip('Firestore Security Rules (requires Firebase Emulator + Java)', () => {
  let testEnv: RulesTestEnvironment;

  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: 'oss-vat-rules-test',
      firestore: {
        rules: readFileSync(RULES_PATH, 'utf8'),
      },
    });
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  beforeEach(async () => {
    await testEnv.clearFirestore();
  });

  it('rejects a transaction missing hash/previousHash/sequenceNumber', async () => {
    const { hash, previousHash, sequenceNumber, ...withoutAuditFields } = baseTransaction;
    const db = testEnv.authenticatedContext(OWNER_UID).firestore();

    await assertFails(setDoc(doc(db, `users/${OWNER_UID}/transactions/tx-1`), withoutAuditFields));
    void hash;
    void previousHash;
    void sequenceNumber;
  });

  it('rejects an update to a transaction', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(
        doc(context.firestore(), `users/${OWNER_UID}/transactions/tx-2`),
        baseTransaction,
      );
    });

    const db = testEnv.authenticatedContext(OWNER_UID).firestore();
    await assertFails(updateDoc(doc(db, `users/${OWNER_UID}/transactions/tx-2`), { amount: 200 }));
  });

  it('rejects GR and accepts EL as the country code for Greece', async () => {
    const db = testEnv.authenticatedContext(OWNER_UID).firestore();

    await assertFails(
      setDoc(doc(db, `users/${OWNER_UID}/transactions/tx-gr`), {
        ...baseTransaction,
        countryCode: 'GR',
      }),
    );

    await assertSucceeds(
      setDoc(doc(db, `users/${OWNER_UID}/transactions/tx-el`), {
        ...baseTransaction,
        countryCode: 'EL',
      }),
    );
  });

  it('rejects GB as a country code', async () => {
    const db = testEnv.authenticatedContext(OWNER_UID).firestore();

    await assertFails(
      setDoc(doc(db, `users/${OWNER_UID}/transactions/tx-gb`), {
        ...baseTransaction,
        countryCode: 'GB',
      }),
    );
  });

  it("rejects an update to a 'submitted' quarterly report", async () => {
    const submittedReport = {
      year: 2026,
      quarter: 1,
      status: 'submitted',
      createdAt: new Date(),
    };

    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(
        doc(context.firestore(), `users/${OWNER_UID}/quarterlyReports/report-1`),
        submittedReport,
      );
    });

    const db = testEnv.authenticatedContext(OWNER_UID).firestore();
    await assertFails(
      updateDoc(doc(db, `users/${OWNER_UID}/quarterlyReports/report-1`), { status: 'draft' }),
    );
  });
});
