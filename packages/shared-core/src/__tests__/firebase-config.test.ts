/**
 * Tests for Firebase Configuration Helper
 * Verifies environment-based configuration management
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  FirebaseConfig,
  FIREBASE_CONFIGS,
  getFirebaseConfig,
  getCurrentEnvironment,
  getInitializeAppConfig,
  validateFirebaseConfig,
  setFirebaseInstances,
  getFirebaseInstances,
  isFirebaseInitialized,
} from '../firebase-config';

describe('Firebase Configuration Helper', () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  describe('FIREBASE_CONFIGS', () => {
    it('should define configs for all environments', () => {
      expect('development' in FIREBASE_CONFIGS).toBe(true);
      expect('production' in FIREBASE_CONFIGS).toBe(true);
      expect('test' in FIREBASE_CONFIGS).toBe(true);
    });

    it('should have valid development config', () => {
      const devConfig = FIREBASE_CONFIGS.development;
      expect(devConfig.projectId).toBeTruthy();
      expect(devConfig.authDomain).toBeTruthy();
    });

    it('should have valid test config', () => {
      const testConfig = FIREBASE_CONFIGS.test;
      expect(testConfig.projectId).toBe('oss-vat-calculator-test');
      expect(testConfig.apiKey).toBe('test-api-key');
    });
  });

  describe('getFirebaseConfig', () => {
    it('should return development config by default', () => {
      const config = getFirebaseConfig('development');
      expect(config.projectId).toBe('oss-vat-calculator-dev');
    });

    it('should return test config for test environment', () => {
      const config = getFirebaseConfig('test');
      expect(config.projectId).toBe('oss-vat-calculator-test');
    });

    it('should be case-insensitive', () => {
      const config1 = getFirebaseConfig('DEVELOPMENT');
      const config2 = getFirebaseConfig('development');
      expect(config1.projectId).toBe(config2.projectId);
    });

    it('should throw error for unsupported environment', () => {
      expect(() => {
        getFirebaseConfig('invalid-env');
      }).toThrow();
    });

    it('should validate required fields', () => {
      expect(() => {
        getFirebaseConfig('test');
      }).not.toThrow();
    });

    it('should have all required fields in config', () => {
      const config = getFirebaseConfig('test');
      const requiredFields = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'appId'];

      for (const field of requiredFields) {
        expect(config[field as keyof FirebaseConfig]).toBeTruthy();
      }
    });
  });

  describe('getCurrentEnvironment', () => {
    it('should return production when NODE_ENV=production', () => {
      process.env.NODE_ENV = 'production';
      expect(getCurrentEnvironment()).toBe('production');
    });

    it('should return test when NODE_ENV=test', () => {
      process.env.NODE_ENV = 'test';
      expect(getCurrentEnvironment()).toBe('test');
    });

    it('should return development by default', () => {
      process.env.NODE_ENV = 'unknown';
      expect(getCurrentEnvironment()).toBe('development');
    });

    it('should return development when NODE_ENV is not set', () => {
      delete process.env.NODE_ENV;
      expect(getCurrentEnvironment()).toBe('development');
    });
  });

  describe('getInitializeAppConfig', () => {
    it('should return config based on current environment', () => {
      process.env.NODE_ENV = 'test';
      const config = getInitializeAppConfig();
      expect(config.projectId).toBe('oss-vat-calculator-test');
    });

    it('should be consistent with getCurrentEnvironment', () => {
      process.env.NODE_ENV = 'development';
      const env = getCurrentEnvironment();
      const config = getInitializeAppConfig();
      expect(config).toEqual(getFirebaseConfig(env));
    });
  });

  describe('validateFirebaseConfig', () => {
    it('should validate a valid config', async () => {
      const validConfig: FirebaseConfig = {
        apiKey: 'test-api-key',
        authDomain: 'test.firebaseapp.com',
        projectId: 'test-project',
        storageBucket: 'test.appspot.com',
        messagingSenderId: '123456789',
        appId: 'app-id-123',
      };

      await expect(validateFirebaseConfig(validConfig)).resolves.toBeUndefined();
    });

    it('should reject config with missing apiKey', async () => {
      const invalidConfig: FirebaseConfig = {
        apiKey: '',
        authDomain: 'test.firebaseapp.com',
        projectId: 'test-project',
        storageBucket: 'test.appspot.com',
        messagingSenderId: '123456789',
        appId: 'app-id-123',
      };

      await expect(validateFirebaseConfig(invalidConfig)).rejects.toThrow();
    });

    it('should reject config with missing projectId', async () => {
      const invalidConfig: FirebaseConfig = {
        apiKey: 'test-api-key',
        authDomain: 'test.firebaseapp.com',
        projectId: '',
        storageBucket: 'test.appspot.com',
        messagingSenderId: '123456789',
        appId: 'app-id-123',
      };

      await expect(validateFirebaseConfig(invalidConfig)).rejects.toThrow();
    });
  });

  describe('Firebase Instances Caching', () => {
    beforeEach(() => {
      // Reset instances before each test
      setFirebaseInstances({});
    });

    it('should start with no cached instances', () => {
      expect(isFirebaseInitialized()).toBe(false);
      expect(getFirebaseInstances()).toEqual({});
    });

    it('should cache Firebase instances', () => {
      const instances = {
        app: { projectId: 'test' },
        firestore: { path: 'firestore' },
        auth: { currentUser: null },
      };

      setFirebaseInstances(instances);
      expect(getFirebaseInstances()).toEqual(instances);
    });

    it('should report initialized status correctly', () => {
      expect(isFirebaseInitialized()).toBe(false);

      setFirebaseInstances({ app: {} });
      expect(isFirebaseInitialized()).toBe(true);

      setFirebaseInstances({});
      expect(isFirebaseInitialized()).toBe(false);
    });

    it('should allow partial instance caching', () => {
      setFirebaseInstances({
        app: { projectId: 'test-app' },
      });

      const cached = getFirebaseInstances();
      expect(cached.app).toBeTruthy();
      expect(cached.firestore).toBeUndefined();
      expect(isFirebaseInitialized()).toBe(true);
    });

    it('should allow updating instances', () => {
      setFirebaseInstances({ app: {} });
      expect(getFirebaseInstances()).toHaveProperty('app');

      setFirebaseInstances({
        app: {},
        firestore: {},
        auth: {},
      });

      const cached = getFirebaseInstances();
      expect(cached.app).toBeTruthy();
      expect(cached.firestore).toBeTruthy();
      expect(cached.auth).toBeTruthy();
    });
  });

  describe('Environment-specific configurations', () => {
    it('development config should use dev project', () => {
      const config = getFirebaseConfig('development');
      expect(config.projectId).toContain('dev');
    });

    it('production config should use production environment variables', () => {
      const config = FIREBASE_CONFIGS.production;
      // In production, actual values should come from env vars
      // For testing, they might be empty unless env vars are set
      expect(config).toHaveProperty('projectId');
    });

    it('test config should be fixed values', () => {
      const config = getFirebaseConfig('test');
      expect(config.apiKey).toBe('test-api-key');
      expect(config.projectId).toBe('oss-vat-calculator-test');
      expect(config.appId).toBe('test-app-id');
    });
  });

  describe('Configuration structure', () => {
    it('should have consistent structure across environments', () => {
      const requiredFields = [
        'apiKey',
        'authDomain',
        'projectId',
        'storageBucket',
        'messagingSenderId',
        'appId',
      ];

      for (const env of Object.keys(FIREBASE_CONFIGS)) {
        const config = FIREBASE_CONFIGS[env as keyof typeof FIREBASE_CONFIGS];
        for (const field of requiredFields) {
          expect(config[field as keyof FirebaseConfig]).toBeDefined();
        }
      }
    });

    it('should allow optional measurementId', () => {
      const config = getFirebaseConfig('test');
      // measurementId is optional — may or may not be present
      // The test config omits it, so it should be undefined or absent
      expect(config.measurementId).toBeUndefined();
    });
  });

  describe('Real-world scenarios', () => {
    beforeEach(() => {
      setFirebaseInstances({});
    });

    it('should support development workflow', () => {
      process.env.NODE_ENV = 'development';
      const env = getCurrentEnvironment();
      const config = getFirebaseConfig(env);

      expect(config.projectId).toContain('dev');
      expect(isFirebaseInitialized()).toBe(false);

      // Simulate app initialization
      setFirebaseInstances({
        app: { projectId: config.projectId },
        firestore: {},
        auth: {},
      });

      expect(isFirebaseInitialized()).toBe(true);
    });

    it('should support testing workflow', () => {
      const config = getFirebaseConfig('test');
      validateFirebaseConfig(config);

      expect(config.projectId).toBe('oss-vat-calculator-test');
    });

    it('should allow switching environments', () => {
      process.env.NODE_ENV = 'test';
      let config = getInitializeAppConfig();
      expect(config.projectId).toBe('oss-vat-calculator-test');

      process.env.NODE_ENV = 'development';
      config = getInitializeAppConfig();
      expect(config.projectId).toContain('dev');
    });
  });
});
