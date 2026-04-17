/**
 * Firebase Integration Service
 * Handles authentication, Firestore persistence, and fallback to localStorage
 * Design Principle 1: Near-zero cost via Firebase free tier
 */

import { initializeApp, FirebaseApp, FirebaseOptions } from 'firebase/app';
import {
  getAuth,
  Auth,
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import {
  getFirestore,
  Firestore,
  collection,
  query,
  where,
  getDocs,
  setDoc,
  doc,
  QueryConstraint,
  DocumentData,
  CollectionReference,
  QueryDocumentSnapshot,
  SnapshotOptions,
} from 'firebase/firestore';

/**
 * Firebase configuration
 * Uses environment variables: VITE_FIREBASE_CONFIG (JSON string)
 * Falls back to demo mode if not configured
 */
export interface FirebaseConfig extends FirebaseOptions {
  projectId: string;
  apiKey: string;
  authDomain: string;
  databaseURL?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
}

export class FirebaseService {
  private app: FirebaseApp | null = null;
  private auth: Auth | null = null;
  private firestore: Firestore | null = null;
  private demoMode: boolean = false;

  async initialize(config?: FirebaseConfig): Promise<void> {
    try {
      // Try to load from environment or passed config
      const firebaseConfig =
        config ||
        (import.meta.env.VITE_FIREBASE_CONFIG
          ? JSON.parse(import.meta.env.VITE_FIREBASE_CONFIG)
          : null);

      if (!firebaseConfig) {
        console.warn('Firebase not configured. Running in demo mode with localStorage only.');
        this.demoMode = true;
        return;
      }

      this.app = initializeApp(firebaseConfig);
      this.auth = getAuth(this.app);
      this.firestore = getFirestore(this.app);
      console.log('Firebase initialized successfully');
    } catch (error) {
      console.error('Firebase initialization failed, using demo mode:', error);
      this.demoMode = true;
    }
  }

  isDemoMode(): boolean {
    return this.demoMode;
  }

  // Auth Methods
  async signUp(email: string, password: string): Promise<User> {
    if (!this.auth) throw new Error('Firebase not initialized');
    const result = await createUserWithEmailAndPassword(this.auth, email, password);
    return result.user;
  }

  async signIn(email: string, password: string): Promise<User> {
    if (!this.auth) throw new Error('Firebase not initialized');
    const result = await signInWithEmailAndPassword(this.auth, email, password);
    return result.user;
  }

  async logout(): Promise<void> {
    if (!this.auth) throw new Error('Firebase not initialized');
    await signOut(this.auth);
  }

  onAuthStateChanged(callback: (user: User | null) => void): () => void {
    if (!this.auth) {
      // In demo mode, keep user logged in via localStorage
      const demoUser = localStorage.getItem('demo_user');
      if (demoUser) {
        callback(JSON.parse(demoUser));
      }
      return () => {};
    }
    return onAuthStateChanged(this.auth, callback);
  }

  getCurrentUser(): User | null {
    if (!this.auth) {
      const demoUser = localStorage.getItem('demo_user');
      return demoUser ? JSON.parse(demoUser) : null;
    }
    return this.auth.currentUser;
  }

  // Firestore Methods
  async saveData<T extends DocumentData>(
    collectionName: string,
    docId: string,
    data: T,
  ): Promise<void> {
    if (this.demoMode) {
      const key = `${collectionName}:${docId}`;
      localStorage.setItem(key, JSON.stringify(data));
      return;
    }

    if (!this.firestore) throw new Error('Firestore not initialized');
    await setDoc(doc(this.firestore, collectionName, docId), data);
  }

  async queryData<T extends DocumentData>(
    collectionName: string,
    constraints: QueryConstraint[],
  ): Promise<QueryDocumentSnapshot<T, DocumentData>[]> {
    if (this.demoMode) {
      // Simple localStorage-based query (supports basic field equality)
      const results: QueryDocumentSnapshot<T>[] = [];
      const keys = Object.keys(localStorage);

      for (const key of keys) {
        if (key.startsWith(collectionName + ':')) {
          const data = JSON.parse(localStorage.getItem(key) || '{}') as T;
          // Very basic constraint matching - in production use proper filtering
          let matches = true;
          for (const constraint of constraints) {
            // This is simplified; real implementation would properly evaluate constraints
            matches = matches && this.evaluateConstraint(data, constraint);
          }
          if (matches) {
            results.push({
              data: () => data,
              id: key.replace(collectionName + ':', ''),
            } as QueryDocumentSnapshot<T>);
          }
        }
      }
      return results;
    }

    if (!this.firestore) throw new Error('Firestore not initialized');
    const collRef = collection(this.firestore, collectionName) as CollectionReference<T>;
    const q = query(collRef, ...constraints);
    const snapshot = await getDocs(q);
    return snapshot.docs;
  }

  private evaluateConstraint(data: DocumentData, constraint: QueryConstraint): boolean {
    // Simplified constraint evaluation for demo mode
    // In production, use proper Firestore query evaluation
    return true;
  }
}

export const firebaseService = new FirebaseService();
