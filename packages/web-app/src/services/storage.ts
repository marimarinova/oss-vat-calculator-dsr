/**
 * LocalStorage Service
 * Provides a consistent interface for client-side data persistence
 * Fallback when Firebase is unavailable
 */

export interface StorageTransaction {
  id: string;
  date: string; // ISO date
  buyerCountry: string; // 2-letter code
  amount: number; // in cents to avoid float issues
  currency: string; // ISO 4217
  description: string;
  productType: 'goods' | 'services';
  vatRate?: number;
  timestamp: number;
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
  createdAt: number;
  submittedAt?: number;
  pdfUrl?: string;
  csvUrl?: string;
}

class LocalStorageService {
  private readonly SELLER_KEY = 'oss_seller_info';
  private readonly TRANSACTIONS_KEY = 'oss_transactions';
  private readonly FILINGS_KEY = 'oss_filings';

  // Seller Info
  getSellerInfo(): StorageSellerInfo | null {
    const data = localStorage.getItem(this.SELLER_KEY);
    return data ? JSON.parse(data) : null;
  }

  saveSellerInfo(info: StorageSellerInfo): void {
    localStorage.setItem(this.SELLER_KEY, JSON.stringify(info));
  }

  // Transactions
  getTransactions(): StorageTransaction[] {
    const data = localStorage.getItem(this.TRANSACTIONS_KEY);
    return data ? JSON.parse(data) : [];
  }

  addTransaction(tx: StorageTransaction): void {
    const transactions = this.getTransactions();
    transactions.push(tx);
    localStorage.setItem(this.TRANSACTIONS_KEY, JSON.stringify(transactions));
  }

  updateTransaction(id: string, updates: Partial<StorageTransaction>): void {
    const transactions = this.getTransactions();
    const index = transactions.findIndex((t) => t.id === id);
    if (index !== -1) {
      transactions[index] = { ...transactions[index], ...updates };
      localStorage.setItem(this.TRANSACTIONS_KEY, JSON.stringify(transactions));
    }
  }

  deleteTransaction(id: string): void {
    const transactions = this.getTransactions().filter((t) => t.id !== id);
    localStorage.setItem(this.TRANSACTIONS_KEY, JSON.stringify(transactions));
  }

  getTransactionsByQuarter(year: number, quarter: number): StorageTransaction[] {
    const transactions = this.getTransactions();
    const startMonth = (quarter - 1) * 3;
    const endMonth = startMonth + 3;

    return transactions.filter((tx) => {
      const date = new Date(tx.date);
      return (
        date.getFullYear() === year && date.getMonth() >= startMonth && date.getMonth() < endMonth
      );
    });
  }

  // Filings
  getFilings(): StorageFiling[] {
    const data = localStorage.getItem(this.FILINGS_KEY);
    return data ? JSON.parse(data) : [];
  }

  addFiling(filing: StorageFiling): void {
    const filings = this.getFilings();
    filings.push(filing);
    localStorage.setItem(this.FILINGS_KEY, JSON.stringify(filings));
  }

  updateFiling(id: string, updates: Partial<StorageFiling>): void {
    const filings = this.getFilings();
    const index = filings.findIndex((f) => f.id === id);
    if (index !== -1) {
      filings[index] = { ...filings[index], ...updates };
      localStorage.setItem(this.FILINGS_KEY, JSON.stringify(filings));
    }
  }

  // Utilities
  clearAll(): void {
    localStorage.removeItem(this.SELLER_KEY);
    localStorage.removeItem(this.TRANSACTIONS_KEY);
    localStorage.removeItem(this.FILINGS_KEY);
  }

  exportAsJSON(): string {
    return JSON.stringify(
      {
        seller: this.getSellerInfo(),
        transactions: this.getTransactions(),
        filings: this.getFilings(),
        exportedAt: new Date().toISOString(),
      },
      null,
      2,
    );
  }

  importFromJSON(jsonString: string): void {
    const data = JSON.parse(jsonString);
    if (data.seller) localStorage.setItem(this.SELLER_KEY, JSON.stringify(data.seller));
    if (data.transactions)
      localStorage.setItem(this.TRANSACTIONS_KEY, JSON.stringify(data.transactions));
    if (data.filings) localStorage.setItem(this.FILINGS_KEY, JSON.stringify(data.filings));
  }
}

export const storageService = new LocalStorageService();
