/**
 * STUB — ECB Daily Reference Rate Fetcher (Refactor 3)
 *
 * This file is illustrative only. It is NOT deployed, NOT built, and NOT
 * part of any pnpm workspace package or test suite (the `functions/`
 * directory is intentionally outside `packages/*` in pnpm-workspace.yaml).
 * No Firebase Functions build dependency has been added to the project.
 *
 * Intent: a scheduled Cloud Function that runs daily at 17:00 CET (after the
 * ECB publishes its daily reference rates at ~16:00 CET) and writes the
 * parsed rates into Firestore at `system/ecbRates/{date}`.
 *
 * The web-app / oss-calculator then loads rates from that collection and
 * calls registerDailyRate() to populate the module-level store, enabling
 * Art. 91(2)-compliant currency conversion for every non-EUR transaction.
 *
 * Production prerequisites (not yet done):
 *   1. Deploy this function: `firebase deploy --only functions:ecbDailyFetcher`
 *   2. Seed historical dates in `system/ecbRates/{date}` for back-dated
 *      transactions using `scripts/backfill-ecb-rates.ts` (not yet written).
 *   3. Grant the service account read access to the ECB endpoint (no auth
 *      required — the feed is public).
 *
 * Illustrative implementation sketch (Firebase Functions v2 syntax):
 *
 *   import { onSchedule } from 'firebase-functions/v2/scheduler';
 *   import { getFirestore, Timestamp } from 'firebase-admin/firestore';
 *   import { parseECBDailyXML } from '@oss-vat/oss-calculator';
 *
 *   export const ecbDailyFetcher = onSchedule(
 *     { schedule: '0 17 * * 1-5', timeZone: 'Europe/Berlin' },
 *     async () => {
 *       const url = 'https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml';
 *       const xml = await fetch(url).then((r) => r.text());
 *       const rates = parseECBDailyXML(xml);
 *       if (rates.length === 0) return;
 *
 *       const db = getFirestore();
 *       const date = rates[0].publishedOn; // YYYY-MM-DD
 *       const batch = db.batch();
 *
 *       for (const r of rates) {
 *         const ref = db.collection('system').doc('ecbRates').collection(date).doc(r.target);
 *         batch.set(ref, {
 *           base: r.base,
 *           target: r.target,
 *           rate: r.rate,
 *           publishedOn: r.publishedOn,
 *           fetchedAt: Timestamp.now(),
 *         });
 *       }
 *
 *       await batch.commit();
 *       console.log(`ECB rates for ${date} written (${rates.length} currencies).`);
 *     },
 *   );
 *
 * Firestore path: system/ecbRates/{date}/{currencyCode}
 *   → { base: 'EUR', target: string, rate: number, publishedOn: string, fetchedAt: Timestamp }
 *
 * Client-side loading (web-app/src/services/ecb-loader.ts — not yet written):
 *   const snapshot = await getDocs(collection(db, `system/ecbRates/${date}`));
 *   snapshot.forEach(doc => registerDailyRate(doc.data() as DailyECBRate));
 */

export {};
