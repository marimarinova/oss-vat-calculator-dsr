/**
 * Data Persistence Service (Refactor 6)
 *
 * Primary persistence is Cloud Firestore, using the exact paths
 * firestore.rules expects:
 *   - users/{uid}                              (seller/profile info)
 *   - users/{uid}/transactions/{transactionId} (immutable, append-only)
 *   - users/{uid}/corrections/{correctionId}   (append-only, continues the
 *                                                same hash chain)
 *   - users/{uid}/quarterlyReports/{reportId}
 *
 * All async methods below take `uid` and call through to
 * `firebaseService`, which talks to Firestore.
 *
 * DEMO MODE FALLBACK: when Firebase is not configured
 * (firebaseService.isDemoMode()), firebaseService transparently falls back
 * to localStorage under the hood. This fallback is NOT representative of
 * the production data model (no real security rules, no real audit-chain
 * signing key) - it exists only so the app remains usable for local demos
 * without Firebase credentials. NEVER rely on this path in production.
 */

import { Timestamp } from 'firebase/firestore';
import { firebaseService } from './firebase';
import { AuditSigner, CloudFunctionAuditSigner, DevAuditSigner } from './audit-signer';

/** One piece of place-of-supply evidence (Art. 63c(1)(k) / Art. 63c(2)). */
export interface LocationEvidenceItem {
  evidenceType: 'billing-country' | 'ip-country' | 'bank-country' | 'phone-country' | 'other';
  value: string; // e.g. 'DE', '192.0.2.1'
}

export interface StorageTransaction {
  id: string;
  date: string; // ISO date (YYYY-MM-DD)
  buyerCountry: string; // 2-letter code
  amount: number; // in cents to avoid float issues
  currency: string; // ISO 4217
  description: string;
  productType: 'goods' | 'services';
  quantity: number; // number of units supplied; default 1 (Art. 63c(1)(b))
  invoiceNumber?: string; // optional invoice reference (Art. 63c(1)(j))
  locationEvidence?: LocationEvidenceItem[]; // 1-2 items (Art. 63c(1)(k))
  vatRate?: number;
  timestamp: number; // ms since epoch, derived from Firestore createdAt

  // Audit chain fields (Refactor 4.2/4.3) - required by firestore.rules'
  // validateAuditFields() and used to extend the chain on the next write.
  hash: string;
  previousHash: string;
  sequenceNumber: number;
  keyEpoch: number;
}

/** A payment received for a transaction (subcollection Art. 63c(1)(h) and (i)). */
export interface StoragePayment {
  id: string;
  date: string; // ISO date YYYY-MM-DD
  amount: number; // in cents
  currency: string; // ISO 4217
  isAdvance: boolean; // true = received before the supply (Art. 63c(1)(i))
  createdAt: number; // ms since epoch
}

/** A return of goods entry (subcollection Art. 63c(1)(l)). */
export interface StorageReturn {
  id: string;
  date: string; // ISO date YYYY-MM-DD
  returnedAmount: number; // taxable amount returned, in cents
  vatRate: number; // VAT rate that applied (percentage)
  createdAt: number; // ms since epoch
}

export interface StorageSellerInfo {
  name: string;
  vatId: string;
  country: string;
  email: string;
}

export interface StorageFiling {
  id: string;
  period: string; // YYYY-Q format
  status: 'draft' | 'submitted' | 'accepted' | 'rejected';
  createdAt: number; // ms since epoch
  submittedAt?: number;
  pdfUrl?: string;
  csvUrl?: string;
}

export interface StorageCorrection {
  id: string;
  originalTransactionId: string;
  reasonCode: 'UI-ERROR' | 'PRICE-CHANGE' | 'CUSTOMER-REFUND' | 'WRONG-MS' | 'WRONG-TAXCODE';
  adjustedAmount: number; // corrected taxable amount in cents (Art. 63c(1)(e)); 0 = voided
  createdAt: number; // ms since epoch
  hash: string;
  previousHash: string;
  sequenceNumber: number;
  keyEpoch: number;
}

/** Raw shape of a transaction document as stored in Firestore. */
interface FirestoreTransactionDoc {
  date: string;
  countryCode: string;
  amount: number;
  currency: string;
  description: string;
  productType: 'goods' | 'services';
  quantity: number;
  invoiceNumber?: string;
  locationEvidence?: Array<{ evidenceType: string; value: string }>;
  vatRate?: number;
  createdAt: Timestamp | number;
  hash: string;
  previousHash: string;
  sequenceNumber: number;
  keyEpoch: number;
}

/** Raw shape of a payment document in a transaction's payments subcollection. */
interface FirestorePaymentDoc {
  date: string;
  amount: number;
  currency: string;
  isAdvance: boolean;
  createdAt: Timestamp | number;
}

/** Raw shape of a return document in a transaction's returns subcollection. */
interface FirestoreReturnDoc {
  date: string;
  returnedAmount: number;
  vatRate: number;
  createdAt: Timestamp | number;
}

/** Raw shape of a correction document as stored in Firestore. */
interface FirestoreCorrectionDoc {
  originalTransactionId: string;
  reasonCode: StorageCorrection['reasonCode'];
  adjustedAmount: number;
  createdAt: Timestamp | number;
  hash: string;
  previousHash: string;
  sequenceNumber: number;
  keyEpoch: number;
}

/** Raw shape of a quarterly report document as stored in Firestore. */
interface FirestoreQuarterlyReportDoc {
  period: string;
  year: number;
  quarter: number;
  status: StorageFiling['status'];
  createdAt: Timestamp | number;
  submittedAt?: Timestamp | number;
  pdfUrl?: string;
  csvUrl?: string;
}

/** Raw shape of a user profile document as stored in Firestore. */
interface FirestoreUserProfileDoc {
  name: string;
  email: string;
  vatId?: string;
  country?: string;
  createdAt: Timestamp | number;
}

function toMillis(value: Timestamp | number): number {
  return typeof value === 'number' ? value : value.toMillis();
}

/** A concrete "now" value matching whatever createdAt requires in this mode. */
function nowForStorage(): Timestamp | number {
  return firebaseService.isDemoMode() ? Date.now() : Timestamp.now();
}

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function parsePeriod(period: string): { year: number; quarter: number } {
  const [yearPart, quarterPart] = period.split('-Q');
  return { year: parseInt(yearPart, 10), quarter: parseInt(quarterPart, 10) };
}

class FirestoreStorageService {
  /**
   * Returns the signer used to obtain audit-chain fields for new
   * transactions/corrections. In demo mode (no Firebase project
   * configured) a local DevAuditSigner is used; otherwise a
   * CloudFunctionAuditSigner delegates HMAC signing to a Cloud Function so
   * the signing key never reaches the browser.
   */
  private getDefaultSigner(): AuditSigner {
    if (firebaseService.isDemoMode()) {
      return new DevAuditSigner();
    }
    const app = firebaseService.getApp();
    if (!app) {
      throw new Error('Firebase app not initialized - cannot create CloudFunctionAuditSigner');
    }
    return new CloudFunctionAuditSigner(app);
  }

  // ---------------------------------------------------------------------
  // Seller / profile info - users/{uid}
  // ---------------------------------------------------------------------

  async getSellerInfo(uid: string): Promise<StorageSellerInfo | null> {
    const data = await firebaseService.getDocument<FirestoreUserProfileDoc>('users', uid);
    if (!data) return null;
    return {
      name: data.name,
      vatId: data.vatId ?? '',
      country: data.country ?? '',
      email: data.email,
    };
  }

  async saveSellerInfo(uid: string, info: StorageSellerInfo): Promise<void> {
    const existing = await firebaseService.getDocument<FirestoreUserProfileDoc>('users', uid);
    const doc: FirestoreUserProfileDoc = {
      name: info.name,
      email: info.email,
      vatId: info.vatId,
      country: info.country,
      // firestore.rules: createdAt must not change once the profile exists.
      createdAt: existing?.createdAt ?? nowForStorage(),
    };
    await firebaseService.saveData('users', uid, doc);
  }

  // ---------------------------------------------------------------------
  // Transactions - users/{uid}/transactions/{transactionId}
  // ---------------------------------------------------------------------

  async getTransactions(uid: string): Promise<StorageTransaction[]> {
    const snapshots = await firebaseService.queryData<FirestoreTransactionDoc>(
      `users/${uid}/transactions`,
      [],
    );
    return snapshots.map((snap) => this.toStorageTransaction(snap.id, snap.data()));
  }

  /**
   * Append a new immutable transaction. Audit-chain fields (hash,
   * previousHash, sequenceNumber, keyEpoch) are obtained from `signer` so
   * the write satisfies firestore.rules' validateAuditFields().
   */
  async addTransaction(
    uid: string,
    tx: Omit<
      StorageTransaction,
      'id' | 'timestamp' | 'hash' | 'previousHash' | 'sequenceNumber' | 'keyEpoch'
    >,
    signer: AuditSigner = this.getDefaultSigner(),
  ): Promise<StorageTransaction> {
    const { previousHash, sequenceNumber } = await this.getChainHead(uid);

    const auditableData: Record<string, unknown> = {
      date: tx.date,
      countryCode: tx.buyerCountry,
      amount: tx.amount,
      currency: tx.currency,
      description: tx.description,
      productType: tx.productType,
      quantity: tx.quantity,
      vatRate: tx.vatRate ?? null,
    };

    const auditFields = await signer.sign(auditableData, previousHash, sequenceNumber);

    const id = generateId('tx');
    const docData: FirestoreTransactionDoc = {
      date: tx.date,
      countryCode: tx.buyerCountry,
      amount: tx.amount,
      currency: tx.currency,
      description: tx.description,
      productType: tx.productType,
      quantity: tx.quantity,
      ...(tx.invoiceNumber !== undefined ? { invoiceNumber: tx.invoiceNumber } : {}),
      ...(tx.locationEvidence !== undefined ? { locationEvidence: tx.locationEvidence } : {}),
      ...(tx.vatRate !== undefined ? { vatRate: tx.vatRate } : {}),
      createdAt: nowForStorage(),
      hash: auditFields.hash,
      previousHash: auditFields.previousHash,
      sequenceNumber: auditFields.sequenceNumber,
      keyEpoch: auditFields.keyEpoch,
    };

    await firebaseService.saveData(`users/${uid}/transactions`, id, docData);

    return this.toStorageTransaction(id, docData);
  }

  async getTransactionsByQuarter(
    uid: string,
    year: number,
    quarter: number,
  ): Promise<StorageTransaction[]> {
    const transactions = await this.getTransactions(uid);
    const startMonth = (quarter - 1) * 3;
    const endMonth = startMonth + 3;

    return transactions.filter((tx) => {
      const date = new Date(tx.date);
      return (
        date.getFullYear() === year && date.getMonth() >= startMonth && date.getMonth() < endMonth
      );
    });
  }

  private toStorageTransaction(id: string, data: FirestoreTransactionDoc): StorageTransaction {
    return {
      id,
      date: data.date,
      buyerCountry: data.countryCode,
      amount: data.amount,
      currency: data.currency,
      description: data.description,
      productType: data.productType,
      quantity: data.quantity ?? 1, // default 1 for documents written before Refactor 7b
      invoiceNumber: data.invoiceNumber,
      locationEvidence: data.locationEvidence as LocationEvidenceItem[] | undefined,
      vatRate: data.vatRate,
      timestamp: toMillis(data.createdAt),
      hash: data.hash,
      previousHash: data.previousHash,
      sequenceNumber: data.sequenceNumber,
      keyEpoch: data.keyEpoch,
    };
  }

  // ---------------------------------------------------------------------
  // Corrections - users/{uid}/corrections/{correctionId}
  // Refactor 4.1: append-only corrections sibling to immutable
  // transactions, continuing the same hash chain.
  // ---------------------------------------------------------------------

  async getCorrections(uid: string): Promise<StorageCorrection[]> {
    const snapshots = await firebaseService.queryData<FirestoreCorrectionDoc>(
      `users/${uid}/corrections`,
      [],
    );
    return snapshots.map((snap) => this.toStorageCorrection(snap.id, snap.data()));
  }

  async addCorrection(
    uid: string,
    correction: Pick<StorageCorrection, 'originalTransactionId' | 'reasonCode' | 'adjustedAmount'>,
    signer: AuditSigner = this.getDefaultSigner(),
  ): Promise<StorageCorrection> {
    const { previousHash, sequenceNumber } = await this.getChainHead(uid);

    const auditableData: Record<string, unknown> = {
      originalTransactionId: correction.originalTransactionId,
      reasonCode: correction.reasonCode,
      adjustedAmount: correction.adjustedAmount,
    };

    const auditFields = await signer.sign(auditableData, previousHash, sequenceNumber);

    const id = generateId('corr');
    const docData: FirestoreCorrectionDoc = {
      originalTransactionId: correction.originalTransactionId,
      reasonCode: correction.reasonCode,
      adjustedAmount: correction.adjustedAmount,
      createdAt: nowForStorage(),
      hash: auditFields.hash,
      previousHash: auditFields.previousHash,
      sequenceNumber: auditFields.sequenceNumber,
      keyEpoch: auditFields.keyEpoch,
    };

    await firebaseService.saveData(`users/${uid}/corrections`, id, docData);

    return this.toStorageCorrection(id, docData);
  }

  private toStorageCorrection(id: string, data: FirestoreCorrectionDoc): StorageCorrection {
    return {
      id,
      originalTransactionId: data.originalTransactionId,
      reasonCode: data.reasonCode,
      adjustedAmount: data.adjustedAmount ?? 0, // default 0 for documents written before Refactor 7b
      createdAt: toMillis(data.createdAt),
      hash: data.hash,
      previousHash: data.previousHash,
      sequenceNumber: data.sequenceNumber,
      keyEpoch: data.keyEpoch,
    };
  }

  // ---------------------------------------------------------------------
  // Payments - users/{uid}/transactions/{txId}/payments/{paymentId}
  // Append-only subcollection; no update/delete (enforced by firestore.rules).
  // ---------------------------------------------------------------------

  async getPayments(uid: string, txId: string): Promise<StoragePayment[]> {
    const snapshots = await firebaseService.queryData<FirestorePaymentDoc>(
      `users/${uid}/transactions/${txId}/payments`,
      [],
    );
    return snapshots.map((snap) => this.toStoragePayment(snap.id, snap.data()));
  }

  async addPayment(
    uid: string,
    txId: string,
    payment: Pick<StoragePayment, 'date' | 'amount' | 'currency' | 'isAdvance'>,
  ): Promise<StoragePayment> {
    const id = generateId('pay');
    const docData: FirestorePaymentDoc = {
      date: payment.date,
      amount: payment.amount,
      currency: payment.currency,
      isAdvance: payment.isAdvance,
      createdAt: nowForStorage(),
    };
    await firebaseService.saveData(`users/${uid}/transactions/${txId}/payments`, id, docData);
    return this.toStoragePayment(id, docData);
  }

  private toStoragePayment(id: string, data: FirestorePaymentDoc): StoragePayment {
    return {
      id,
      date: data.date,
      amount: data.amount,
      currency: data.currency,
      isAdvance: data.isAdvance,
      createdAt: toMillis(data.createdAt),
    };
  }

  // ---------------------------------------------------------------------
  // Returns - users/{uid}/transactions/{txId}/returns/{returnId}
  // Append-only subcollection; no update/delete (enforced by firestore.rules).
  // ---------------------------------------------------------------------

  async getReturns(uid: string, txId: string): Promise<StorageReturn[]> {
    const snapshots = await firebaseService.queryData<FirestoreReturnDoc>(
      `users/${uid}/transactions/${txId}/returns`,
      [],
    );
    return snapshots.map((snap) => this.toStorageReturn(snap.id, snap.data()));
  }

  async addReturn(
    uid: string,
    txId: string,
    ret: Pick<StorageReturn, 'date' | 'returnedAmount' | 'vatRate'>,
  ): Promise<StorageReturn> {
    const id = generateId('ret');
    const docData: FirestoreReturnDoc = {
      date: ret.date,
      returnedAmount: ret.returnedAmount,
      vatRate: ret.vatRate,
      createdAt: nowForStorage(),
    };
    await firebaseService.saveData(`users/${uid}/transactions/${txId}/returns`, id, docData);
    return this.toStorageReturn(id, docData);
  }

  private toStorageReturn(id: string, data: FirestoreReturnDoc): StorageReturn {
    return {
      id,
      date: data.date,
      returnedAmount: data.returnedAmount,
      vatRate: data.vatRate,
      createdAt: toMillis(data.createdAt),
    };
  }

  /**
   * The current head of this user's audit chain (transactions and
   * corrections combined - corrections continue the same chain). Returns
   * the genesis values (empty previousHash, sequenceNumber 1) when the
   * chain is empty.
   */
  private async getChainHead(
    uid: string,
  ): Promise<{ previousHash: string; sequenceNumber: number }> {
    const [transactions, corrections] = await Promise.all([
      this.getTransactions(uid),
      this.getCorrections(uid),
    ]);

    const entries = [...transactions, ...corrections];
    if (entries.length === 0) {
      return { previousHash: '', sequenceNumber: 1 };
    }

    const last = entries.reduce((latest, current) =>
      current.sequenceNumber > latest.sequenceNumber ? current : latest,
    );

    return { previousHash: last.hash, sequenceNumber: last.sequenceNumber + 1 };
  }

  // ---------------------------------------------------------------------
  // Quarterly Reports / Filings - users/{uid}/quarterlyReports/{reportId}
  // ---------------------------------------------------------------------

  async getFilings(uid: string): Promise<StorageFiling[]> {
    const snapshots = await firebaseService.queryData<FirestoreQuarterlyReportDoc>(
      `users/${uid}/quarterlyReports`,
      [],
    );
    return snapshots.map((snap) => this.toStorageFiling(snap.id, snap.data()));
  }

  async addFiling(uid: string, filing: Omit<StorageFiling, 'id'>): Promise<StorageFiling> {
    const id = generateId('filing');
    const { year, quarter } = parsePeriod(filing.period);

    const docData: FirestoreQuarterlyReportDoc = {
      period: filing.period,
      year,
      quarter,
      status: filing.status,
      createdAt: this.toFirestoreTimestamp(filing.createdAt),
      ...(filing.submittedAt !== undefined
        ? { submittedAt: this.toFirestoreTimestamp(filing.submittedAt) }
        : {}),
      ...(filing.pdfUrl !== undefined ? { pdfUrl: filing.pdfUrl } : {}),
      ...(filing.csvUrl !== undefined ? { csvUrl: filing.csvUrl } : {}),
    };

    await firebaseService.saveData(`users/${uid}/quarterlyReports`, id, docData);

    return this.toStorageFiling(id, docData);
  }

  async updateFiling(
    uid: string,
    id: string,
    updates: Partial<StorageFiling>,
  ): Promise<StorageFiling | null> {
    const existing = await firebaseService.getDocument<FirestoreQuarterlyReportDoc>(
      `users/${uid}/quarterlyReports`,
      id,
    );
    if (!existing) return null;

    const merged: StorageFiling = { ...this.toStorageFiling(id, existing), ...updates };
    const { year, quarter } = parsePeriod(merged.period);

    const docData: FirestoreQuarterlyReportDoc = {
      period: merged.period,
      year,
      quarter,
      status: merged.status,
      createdAt: this.toFirestoreTimestamp(merged.createdAt),
      ...(merged.submittedAt !== undefined
        ? { submittedAt: this.toFirestoreTimestamp(merged.submittedAt) }
        : {}),
      ...(merged.pdfUrl !== undefined ? { pdfUrl: merged.pdfUrl } : {}),
      ...(merged.csvUrl !== undefined ? { csvUrl: merged.csvUrl } : {}),
    };

    await firebaseService.saveData(`users/${uid}/quarterlyReports`, id, docData);

    return merged;
  }

  private toFirestoreTimestamp(millis: number): Timestamp | number {
    return firebaseService.isDemoMode() ? millis : Timestamp.fromMillis(millis);
  }

  private toStorageFiling(id: string, data: FirestoreQuarterlyReportDoc): StorageFiling {
    return {
      id,
      period: data.period,
      status: data.status,
      createdAt: toMillis(data.createdAt),
      submittedAt: data.submittedAt !== undefined ? toMillis(data.submittedAt) : undefined,
      pdfUrl: data.pdfUrl,
      csvUrl: data.csvUrl,
    };
  }
}

export const storageService = new FirestoreStorageService();
