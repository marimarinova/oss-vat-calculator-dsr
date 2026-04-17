/**
 * Global Application Context
 * Manages user state, transactions, seller info, and filing history
 * Uses React Context for lightweight state management
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  storageService,
  StorageTransaction,
  StorageSellerInfo,
  StorageFiling,
} from '../services/storage';
import { firebaseService } from '../services/firebase';

export interface User {
  uid: string;
  email: string;
  displayName?: string;
}

export interface AppContextType {
  // Auth
  user: User | null;
  isLoading: boolean;
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;

  // Seller Info
  sellerInfo: StorageSellerInfo | null;
  updateSellerInfo: (info: Partial<StorageSellerInfo>) => void;

  // Transactions
  transactions: StorageTransaction[];
  addTransaction: (tx: Omit<StorageTransaction, 'id' | 'timestamp'>) => void;
  updateTransaction: (id: string, updates: Partial<StorageTransaction>) => void;
  deleteTransaction: (id: string) => void;
  getTransactionsByQuarter: (year: number, quarter: number) => StorageTransaction[];

  // Filings
  filings: StorageFiling[];
  addFiling: (filing: Omit<StorageFiling, 'id'>) => void;
  updateFiling: (id: string, updates: Partial<StorageFiling>) => void;

  // Firebase status
  isFirebaseEnabled: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export interface AppProviderProps {
  children: React.ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sellerInfo, setSellerInfo] = useState<StorageSellerInfo | null>(null);
  const [transactions, setTransactions] = useState<StorageTransaction[]>([]);
  const [filings, setFilings] = useState<StorageFiling[]>([]);
  const [isFirebaseEnabled, setIsFirebaseEnabled] = useState(false);

  // Initialize Firebase and load data
  useEffect(() => {
    const initialize = async () => {
      try {
        await firebaseService.initialize();
        setIsFirebaseEnabled(!firebaseService.isDemoMode());

        // Load seller info
        const seller = storageService.getSellerInfo();
        if (seller) setSellerInfo(seller);

        // Load transactions
        const txs = storageService.getTransactions();
        setTransactions(txs);

        // Load filings
        const fils = storageService.getFilings();
        setFilings(fils);

        // Set up auth listener
        firebaseService.onAuthStateChanged((firebaseUser) => {
          if (firebaseUser) {
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              displayName: firebaseUser.displayName || undefined,
            });
          } else {
            setUser(null);
          }
          setIsLoading(false);
        });
      } catch (error) {
        console.error('Failed to initialize app:', error);
        setIsLoading(false);
      }
    };

    initialize();
  }, []);

  const signUp = async (email: string, password: string) => {
    try {
      if (firebaseService.isDemoMode()) {
        // Demo mode: store user in localStorage
        const demoUser = {
          uid: `user_${Date.now()}`,
          email,
          displayName: email.split('@')[0],
        };
        localStorage.setItem('demo_user', JSON.stringify(demoUser));
        setUser(demoUser);
      } else {
        const firebaseUser = await firebaseService.signUp(email, password);
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email || '',
          displayName: firebaseUser.displayName || undefined,
        });
      }
    } catch (error) {
      console.error('Sign up failed:', error);
      throw error;
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      if (firebaseService.isDemoMode()) {
        // Demo mode: check localStorage
        const demoUsers = Object.values(localStorage)
          .filter((v) => {
            try {
              const obj = JSON.parse(v);
              return obj.email === email;
            } catch {
              return false;
            }
          })
          .map((v) => JSON.parse(v));

        if (demoUsers.length > 0) {
          setUser(demoUsers[0]);
          localStorage.setItem('demo_user', JSON.stringify(demoUsers[0]));
        } else {
          throw new Error('User not found');
        }
      } else {
        const firebaseUser = await firebaseService.signIn(email, password);
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email || '',
          displayName: firebaseUser.displayName || undefined,
        });
      }
    } catch (error) {
      console.error('Sign in failed:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      if (!firebaseService.isDemoMode()) {
        await firebaseService.logout();
      }
      localStorage.removeItem('demo_user');
      setUser(null);
    } catch (error) {
      console.error('Logout failed:', error);
      throw error;
    }
  };

  const updateSellerInfo = (info: Partial<StorageSellerInfo>) => {
    const updated = { ...sellerInfo, ...info } as StorageSellerInfo;
    storageService.saveSellerInfo(updated);
    setSellerInfo(updated);
  };

  const addTransaction = (tx: Omit<StorageTransaction, 'id' | 'timestamp'>) => {
    const newTx: StorageTransaction = {
      ...tx,
      id: `tx_${Date.now()}`,
      timestamp: Date.now(),
    };
    storageService.addTransaction(newTx);
    setTransactions([...transactions, newTx]);
  };

  const updateTransactionLocal = (id: string, updates: Partial<StorageTransaction>) => {
    storageService.updateTransaction(id, updates);
    setTransactions(transactions.map((t) => (t.id === id ? { ...t, ...updates } : t)));
  };

  const deleteTransactionLocal = (id: string) => {
    storageService.deleteTransaction(id);
    setTransactions(transactions.filter((t) => t.id !== id));
  };

  const getTransactionsByQuarter = (year: number, quarter: number): StorageTransaction[] => {
    return storageService.getTransactionsByQuarter(year, quarter);
  };

  const addFiling = (filing: Omit<StorageFiling, 'id'>) => {
    const newFiling: StorageFiling = {
      ...filing,
      id: `filing_${Date.now()}`,
    };
    storageService.addFiling(newFiling);
    setFilings([...filings, newFiling]);
  };

  const updateFilingLocal = (id: string, updates: Partial<StorageFiling>) => {
    storageService.updateFiling(id, updates);
    setFilings(filings.map((f) => (f.id === id ? { ...f, ...updates } : f)));
  };

  const value: AppContextType = {
    user,
    isLoading,
    signUp,
    signIn,
    logout,
    sellerInfo,
    updateSellerInfo,
    transactions,
    addTransaction,
    updateTransaction: updateTransactionLocal,
    deleteTransaction: deleteTransactionLocal,
    getTransactionsByQuarter,
    filings,
    addFiling,
    updateFiling: updateFilingLocal,
    isFirebaseEnabled,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
};
