/**
 * Firebase Configuration Helper
 *
 * Provides Firebase app initialization, Firestore and Auth instance getters,
 * and environment-based configuration management.
 */

/**
 * Firebase configuration object
 */
export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
}

/**
 * Environment-specific Firebase configurations
 */
export const FIREBASE_CONFIGS: Record<string, FirebaseConfig> = {
  development: {
    apiKey: process.env.VITE_FIREBASE_API_KEY || 'dev-api-key',
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || 'oss-vat-calculator-dev.firebaseapp.com',
    projectId: process.env.VITE_FIREBASE_PROJECT_ID || 'oss-vat-calculator-dev',
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || 'oss-vat-calculator-dev.appspot.com',
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || 'dev-sender-id',
    appId: process.env.VITE_FIREBASE_APP_ID || 'dev-app-id',
    measurementId: process.env.VITE_FIREBASE_MEASUREMENT_ID,
  },
  production: {
    apiKey: process.env.VITE_FIREBASE_API_KEY || '',
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || '',
    projectId: process.env.VITE_FIREBASE_PROJECT_ID || '',
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
    appId: process.env.VITE_FIREBASE_APP_ID || '',
    measurementId: process.env.VITE_FIREBASE_MEASUREMENT_ID,
  },
  test: {
    apiKey: 'test-api-key',
    authDomain: 'oss-vat-calculator-test.firebaseapp.com',
    projectId: 'oss-vat-calculator-test',
    storageBucket: 'oss-vat-calculator-test.appspot.com',
    messagingSenderId: 'test-sender-id',
    appId: 'test-app-id',
  },
};

/**
 * Get Firebase configuration for the current environment
 * @param environment - Environment name ('development', 'production', or 'test')
 * @returns Firebase configuration object
 * @throws Error if environment is not supported or config is incomplete
 */
export function getFirebaseConfig(environment: string = 'development'): FirebaseConfig {
  const env = environment.toLowerCase();

  if (!(env in FIREBASE_CONFIGS)) {
    throw new Error(
      `Unsupported environment: ${env}. Supported: ${Object.keys(FIREBASE_CONFIGS).join(', ')}`,
    );
  }

  const config = FIREBASE_CONFIGS[env as keyof typeof FIREBASE_CONFIGS];

  // Validate that required fields are present
  const requiredFields = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'appId'];
  for (const field of requiredFields) {
    if (!config[field as keyof FirebaseConfig]) {
      throw new Error(`Firebase config missing required field: ${field} for environment: ${env}`);
    }
  }

  return config;
}

/**
 * Get the current environment
 * @returns Environment string ('development', 'production', or 'test')
 */
export function getCurrentEnvironment(): string {
  // Check common environment variables
  if (process.env.NODE_ENV === 'production') {
    return 'production';
  }
  if (process.env.NODE_ENV === 'test') {
    return 'test';
  }
  return 'development';
}

/**
 * Initialize Firebase app (browser/web implementation)
 * This is a type-safe wrapper that assumes firebase SDK is available in browser context
 *
 * Note: This function requires that the firebase/app module is imported in the browser context.
 * It cannot be executed in Node.js environments.
 *
 * Usage in a web app:
 * ```typescript
 * import { initializeApp } from 'firebase/app';
 * const config = getFirebaseConfig('production');
 * const app = initializeApp(config);
 * ```
 */
export function getInitializeAppConfig(): FirebaseConfig {
  const env = getCurrentEnvironment();
  return getFirebaseConfig(env);
}

/**
 * Validates Firebase configuration connectivity
 * In a real app, this would attempt to connect to Firestore
 *
 * @param config - Firebase configuration to validate
 * @returns Promise that resolves if config is valid
 */
export async function validateFirebaseConfig(config: FirebaseConfig): Promise<void> {
  // Basic validation of config structure
  const requiredFields = ['apiKey', 'authDomain', 'projectId'];

  for (const field of requiredFields) {
    if (!config[field as keyof FirebaseConfig]) {
      throw new Error(`Invalid Firebase config: missing ${field}`);
    }
  }

  // In a real implementation, this would attempt to connect to Firebase
  // For testing, we just validate the structure
}

/**
 * Firebase helper instance (for use in browser context)
 * This is a marker type to document what Firebase instances should be available
 */
export interface FirebaseInstances {
  /** Firebase app instance from firebase/app */
  app?: unknown; // FirebaseApp type from SDK
  /** Firestore instance from firebase/firestore */
  firestore?: unknown; // Firestore type from SDK
  /** Auth instance from firebase/auth */
  auth?: unknown; // Auth type from SDK
}

/**
 * Cache for Firebase instances (in browser context only)
 * In a browser app, you would initialize these once and reuse them
 */
let firebaseInstances: FirebaseInstances = {};

/**
 * Set cached Firebase instances
 * @param instances - Firebase instances to cache
 */
export function setFirebaseInstances(instances: FirebaseInstances): void {
  firebaseInstances = instances;
}

/**
 * Get cached Firebase instances
 * @returns Cached Firebase instances
 */
export function getFirebaseInstances(): FirebaseInstances {
  return firebaseInstances;
}

/**
 * Check if Firebase is initialized
 * @returns True if Firebase instances are cached
 */
export function isFirebaseInitialized(): boolean {
  return Object.keys(firebaseInstances).length > 0;
}
