/**
 * Global Application Context
 * Manages user state, transactions, seller info, and filing history
 * Uses React Context for lightweight state management
 *
 * Refactor 6: persistence is now async (Firestore-backed via
 * storageService, see services/storage.ts).
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  storageService,
  StorageTransaction,
  StorageSellerInfo,
  StorageFiling,
  StorageCorrection,
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
  updateSellerInfo: (info: Partial<StorageSellerInfo>) => Promise<void>;

  // Transactions
  transactions: StorageTransaction[];
  addTransaction: (
    tx: Omit<
      StorageTransaction,
      'id' | 'timestamp' | 'hash' | 'previousHash' | 'sequenceNumber' | 'keyEpoch'
    >,
  ) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  getTransactionsByQuarter: (year: number, quarter: number) => Promise<StorageTransaction[]>;

  // Filings
  filings: StorageFiling[];
  addFiling: (filing: Omit<StorageFiling, 'id'>) => Promise<void>;
  updateFiling: (id: string, updates: Partial<StorageFiling>) => Promise<void>;

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

  // Load all per-user data once a user is known
  const loadUserData = useCallback(async (uid: string) => {
    const [seller, txs, fils] = await Promise.all([
      storageService.getSellerInfo(uid),
      storageService.getTransactions(uid),
      storageService.getFilings(uid),
    ]);
    setSellerInfo(seller);
    setTransactions(txs);
    setFilings(fils);
  }, []);

  // Initialize Firebase and load data
  useEffect(() => {
    const initialize = async () => {
      try {
        await firebaseService.initialize();
        setIsFirebaseEnabled(!firebaseService.isDemoMode());

        // Set up auth listener
        firebaseService.onAuthStateChanged((firebaseUser) => {
          if (firebaseUser) {
            const nextUser = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              displayName: firebaseUser.displayName || undefined,
            };
            setUser(nextUser);
            void loadUserData(nextUser.uid);
          } else {
            setUser(null);
            setSellerInfo(null);
            setTransactions([]);
            setFilings([]);
          }
          setIsLoading(false);
        });
      } catch (error) {
        console.error('Failed to initialize app:', error);
        setIsLoading(false);
      }
    };

    initialize();
  }, [loadUserData]);

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
        await loadUserData(demoUser.uid);
      } else {
        const firebaseUser = await firebaseService.signUp(email, password);
        const nextUser = {
          uid: firebaseUser.uid,
          email: firebaseUser.email || '',
          displayName: firebaseUser.displayName || undefined,
        };
        setUser(nextUser);
        await loadUserData(nextUser.uid);
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
          await loadUserData(demoUsers[0].uid);
        } else {
          throw new Error('User not found');
        }
      } else {
        const firebaseUser = await firebaseService.signIn(email, password);
        const nextUser = {
          uid: firebaseUser.uid,
          email: firebaseUser.email || '',
          displayName: firebaseUser.displayName || undefined,
        };
        setUser(nextUser);
        await loadUserData(nextUser.uid);
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
      setSellerInfo(null);
      setTransactions([]);
      setFilings([]);
    } catch (error) {
      console.error('Logout failed:', error);
      throw error;
    }
  };

  const requireUid = (): string => {
    if (!user) throw new Error('No authenticated user');
    return user.uid;
  };

  const updateSellerInfo = async (info: Partial<StorageSellerInfo>) => {
    const uid = requireUid();
    const updated = { ...sellerInfo, ...info } as StorageSellerInfo;
    await storageService.saveSellerInfo(uid, updated);
    setSellerInfo(updated);
  };

  const addTransaction = async (
    tx: Omit<
      StorageTransaction,
      'id' | 'timestamp' | 'hash' | 'previousHash' | 'sequenceNumber' | 'keyEpoch'
    >,
  ) => {
    const uid = requireUid();
    const newTx = await storageService.addTransaction(uid, tx);
    setTransactions((prev) => [...prev, newTx]);
  };

  /**
   * Transactions are immutable once written (firestore.rules denies
   * update/delete). "Deleting" a transaction records an append-only
   * correction referencing it and hides it from the active view; the
   * original transaction remains in Firestore for the audit trail.
   */
  const deleteTransaction = async (id: string) => {
    const uid = requireUid();
    const correction: Pick<StorageCorrection, 'originalTransactionId' | 'reasonCode'> = {
      originalTransactionId: id,
      reasonCode: 'UI-ERROR',
    };
    await storageService.addCorrection(uid, correction);
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  };

  const getTransactionsByQuarter = async (
    year: number,
    quarter: number,
  ): Promise<StorageTransaction[]> => {
    const uid = requireUid();
    return storageService.getTransactionsByQuarter(uid, year, quarter);
  };

  const addFiling = async (filing: Omit<StorageFiling, 'id'>) => {
    const uid = requireUid();
    const newFiling = await storageService.addFiling(uid, filing);
    setFilings((prev) => [...prev, newFiling]);
  };

  const updateFiling = async (id: string, updates: Partial<StorageFiling>) => {
    const uid = requireUid();
    const updated = await storageService.updateFiling(uid, id, updates);
    if (!updated) return;
    setFilings((prev) => prev.map((f) => (f.id === id ? updated : f)));
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
    deleteTransaction,
    getTransactionsByQuarter,
    filings,
    addFiling,
    updateFiling,
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
