/**
 * Simple test runner for the shared-core modules
 * Tests the compiled JavaScript without vitest
 */

const assert = require('assert');

// Import compiled modules
const types = require('./dist/types');
const auditChain = require('./dist/audit-chain');
const taxonomy = require('./dist/taxonomy');
const firebaseConfig = require('./dist/firebase-config');

let passedTests = 0;
let failedTests = 0;

function test(description, fn) {
  try {
    fn();
    console.log('✓', description);
    passedTests++;
  } catch (error) {
    console.error('✗', description);
    console.error('  Error:', error.message);
    failedTests++;
  }
}

console.log('\n=== TYPES TESTS ===\n');

test('MemberState enum exists', () => {
  assert(types.MemberState.DE === 'DE');
  assert(types.MemberState.FR === 'FR');
  assert(types.MemberState.IT === 'IT');
});

test('getAllMemberStates returns 27 states', () => {
  const states = types.getAllMemberStates();
  assert(states.length === 27, `Expected 27 states, got ${states.length}`);
});

test('getMemberStateName returns correct names', () => {
  assert(types.getMemberStateName(types.MemberState.DE) === 'Germany');
  assert(types.getMemberStateName(types.MemberState.FR) === 'France');
});

console.log('\n=== AUDIT CHAIN TESTS ===\n');

test('computeHmac produces consistent output', () => {
  const data = 'test data';
  const key = 'test-key';
  const hash1 = auditChain.computeHmac(data, key);
  const hash2 = auditChain.computeHmac(data, key);
  assert.strictEqual(hash1, hash2);
});

test('computeHmac produces different output for different keys', () => {
  const data = 'test data';
  const hash1 = auditChain.computeHmac(data, 'key1');
  const hash2 = auditChain.computeHmac(data, 'key2');
  assert.notStrictEqual(hash1, hash2);
});

test('createAuditEntry creates valid entry', () => {
  const entry = auditChain.createAuditEntry({ test: true }, '', 'test-key');
  assert(entry.id);
  assert(entry.data);
  assert(entry.timestamp);
  assert.strictEqual(entry.previousHash, '');
  assert(entry.hash);
});

test('verifySingleEntry validates entry', () => {
  const entry = auditChain.createAuditEntry({ test: true }, '', 'test-key');
  assert(auditChain.verifySingleEntry(entry, 'test-key') === true);
});

test('verifySingleEntry rejects tampered entry', () => {
  const entry = auditChain.createAuditEntry({ test: true }, '', 'test-key');
  const tampered = { ...entry, data: { test: false } };
  assert(auditChain.verifySingleEntry(tampered, 'test-key') === false);
});

test('verifyChain validates single-entry chain', () => {
  const entry = auditChain.createAuditEntry({ test: 1 }, '', 'test-key');
  const result = auditChain.verifyChain([entry], 'test-key');
  assert(result.valid === true);
});

test('verifyChain validates multi-entry chain', () => {
  const key = 'test-key';
  const entry1 = auditChain.createAuditEntry({ test: 1 }, '', key);
  const entry2 = auditChain.createAuditEntry({ test: 2 }, entry1.hash, key);
  const entry3 = auditChain.createAuditEntry({ test: 3 }, entry2.hash, key);

  const result = auditChain.verifyChain([entry1, entry2, entry3], key);
  assert(result.valid === true);
});

test('verifyChain detects broken chain', () => {
  const key = 'test-key';
  const entry1 = auditChain.createAuditEntry({ test: 1 }, '', key);
  const entry2 = auditChain.createAuditEntry({ test: 2 }, entry1.hash, key);
  const brokenEntry2 = { ...entry2, previousHash: 'wrong-hash' };

  const result = auditChain.verifyChain([entry1, brokenEntry2], key);
  assert(result.valid === false);
  assert(result.brokenAt === 1);
});

console.log('\n=== TAXONOMY TESTS ===\n');

test('DataLifecycleStage enum exists', () => {
  assert(taxonomy.DataLifecycleStage.EPHEMERAL === 'ephemeral');
  assert(taxonomy.DataLifecycleStage.OPERATIONAL === 'operational');
  assert(taxonomy.DataLifecycleStage.ARCHIVAL === 'archival');
  assert(taxonomy.DataLifecycleStage.ANONYMISED === 'anonymised');
});

test('LIFECYCLE_POLICIES defines all stages', () => {
  assert(taxonomy.LIFECYCLE_POLICIES[taxonomy.DataLifecycleStage.EPHEMERAL]);
  assert(taxonomy.LIFECYCLE_POLICIES[taxonomy.DataLifecycleStage.OPERATIONAL]);
  assert(taxonomy.LIFECYCLE_POLICIES[taxonomy.DataLifecycleStage.ARCHIVAL]);
  assert(taxonomy.LIFECYCLE_POLICIES[taxonomy.DataLifecycleStage.ANONYMISED]);
});

test('Operational retention is 125 days', () => {
  const policy = taxonomy.LIFECYCLE_POLICIES[taxonomy.DataLifecycleStage.OPERATIONAL];
  assert.strictEqual(policy.retentionDays, 125);
});

test('Archival retention is 3650 days (10 years)', () => {
  const policy = taxonomy.LIFECYCLE_POLICIES[taxonomy.DataLifecycleStage.ARCHIVAL];
  assert.strictEqual(policy.retentionDays, 3650);
});

test('pseudonymiseBuyerName produces deterministic output', () => {
  const name = 'John Doe';
  const salt = 'seller-123';
  const result1 = taxonomy.pseudonymiseBuyerName(name, salt);
  const result2 = taxonomy.pseudonymiseBuyerName(name, salt);
  assert.strictEqual(result1, result2);
  assert(result1.startsWith('BUYER-'));
});

test('truncateAddressToCountry returns country code', () => {
  const result = taxonomy.truncateAddressToCountry('123 Main St, Berlin, 10115', 'DE');
  assert.strictEqual(result, 'DE');
});

test('removeContactDetails removes email', () => {
  const data = { name: 'John', email: 'john@example.com' };
  const result = taxonomy.removeContactDetails(data);
  assert(!result.email);
  assert.strictEqual(result.name, 'John');
});

test('hashVatId produces deterministic hash with prefix', () => {
  const vatId = 'DE123456789';
  const salt = 'seller-123';
  const result1 = taxonomy.hashVatId(vatId, salt);
  const result2 = taxonomy.hashVatId(vatId, salt);
  assert.strictEqual(result1, result2);
  assert(result1.startsWith('VAT-'));
});

test('transformToArchival produces archival-stage data', () => {
  const data = {
    id: 'tx-123',
    buyerName: 'John Doe',
    address: '123 Street',
    country: 'DE',
    buyerVatId: 'DE123',
    email: 'john@example.com',
  };

  const result = taxonomy.transformToArchival(data, 'DE123', 'seller-123');
  assert.strictEqual(result.stage, taxonomy.DataLifecycleStage.ARCHIVAL);
  assert(result.data.buyerName.startsWith('BUYER-'));
  assert(!result.data.email);
  assert.strictEqual(result.data.address, 'DE');
});

test('transformToAnonymised removes identifiers', () => {
  const data = {
    id: 'tx-100',
    buyerName: 'Jane',
    email: 'jane@example.com',
    amount: 1000,
    country: 'FR',
  };

  const result = taxonomy.transformToAnonymised(data);
  assert.strictEqual(result.stage, taxonomy.DataLifecycleStage.ANONYMISED);
  assert.strictEqual(result.id, '');
  assert(!result.data.buyerName);
  assert(!result.data.email);
  assert.strictEqual(result.data.amount, 1000);
  assert.strictEqual(result.data.country, 'FR');
});

test('getLifecyclePolicy returns correct policy', () => {
  const policy = taxonomy.getLifecyclePolicy(taxonomy.DataLifecycleStage.OPERATIONAL);
  assert.strictEqual(policy.stage, taxonomy.DataLifecycleStage.OPERATIONAL);
  assert.strictEqual(policy.retentionDays, 125);
});

console.log('\n=== FIREBASE CONFIG TESTS ===\n');

test('getFirebaseConfig returns development config', () => {
  const config = firebaseConfig.getFirebaseConfig('development');
  assert(config.projectId);
  assert(config.apiKey);
});

test('getFirebaseConfig returns test config', () => {
  const config = firebaseConfig.getFirebaseConfig('test');
  assert.strictEqual(config.projectId, 'oss-vat-calculator-test');
});

test('getFirebaseConfig is case-insensitive', () => {
  const config1 = firebaseConfig.getFirebaseConfig('DEVELOPMENT');
  const config2 = firebaseConfig.getFirebaseConfig('development');
  assert.strictEqual(config1.projectId, config2.projectId);
});

test('getFirebaseConfig throws for invalid environment', () => {
  let threw = false;
  try {
    firebaseConfig.getFirebaseConfig('invalid-env');
  } catch (error) {
    threw = true;
  }
  assert(threw);
});

test('getCurrentEnvironment returns valid environment', () => {
  const env = firebaseConfig.getCurrentEnvironment();
  assert(['development', 'production', 'test'].includes(env));
});

test('Firebase instances caching works', () => {
  firebaseConfig.setFirebaseInstances({});
  assert(!firebaseConfig.isFirebaseInitialized());

  firebaseConfig.setFirebaseInstances({ app: {} });
  assert(firebaseConfig.isFirebaseInitialized());

  const instances = firebaseConfig.getFirebaseInstances();
  assert(instances.app);
});

// Summary
console.log('\n' + '='.repeat(50));
console.log(`\nTest Results:`);
console.log(`  Passed: ${passedTests}`);
console.log(`  Failed: ${failedTests}`);
console.log(`  Total:  ${passedTests + failedTests}\n`);

if (failedTests > 0) {
  process.exit(1);
}
