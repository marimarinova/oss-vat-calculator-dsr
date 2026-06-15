import { describe, it, expect } from 'vitest';
import { test, fc } from '@fast-check/vitest';
import {
  DISTANCE_SALES_THRESHOLD_EUR,
  DistanceSalesEventType,
  DistanceSalesMonitor,
  DistanceSalesStatus,
  DistanceSalesTransaction,
  SupplyCategory,
} from './distance-sales-monitor';

const BE = 'BE';
const DE = 'DE';

function relevantTransaction(
  id: string,
  netAmountEUR: number,
  overrides: Partial<DistanceSalesTransaction> = {},
): DistanceSalesTransaction {
  return {
    id,
    date: new Date('2026-01-01'),
    netAmountEUR,
    customerCountry: DE,
    supplierCountry: BE,
    isB2C: true,
    category: SupplyCategory.GOODS_DISTANCE,
    ...overrides,
  };
}

describe('DistanceSalesMonitor', () => {
  it('starts BELOW_THRESHOLD with zero cumulative when not locked in', () => {
    const monitor = new DistanceSalesMonitor(false);
    expect(monitor.getStatus()).toBe(DistanceSalesStatus.BELOW_THRESHOLD);
    expect(monitor.getCumulativeEUR()).toBe(0);
    expect(monitor.getEventLog()).toHaveLength(0);
  });

  test.prop([
    fc.array(fc.float({ min: 0, max: 200, noNaN: true }), { minLength: 0, maxLength: 40 }),
  ])('stays BELOW_THRESHOLD while the cumulative total is under the threshold', (amounts) => {
    const monitor = new DistanceSalesMonitor(false);
    amounts.forEach((amount, index) => {
      monitor.recordTransaction(relevantTransaction(`tx-${index}`, amount));
    });

    // 40 transactions x 200 EUR max = 8,000 EUR, always below the 10,000 EUR threshold
    expect(monitor.getStatus()).toBe(DistanceSalesStatus.BELOW_THRESHOLD);
    expect(monitor.getCumulativeEUR()).toBeLessThan(DISTANCE_SALES_THRESHOLD_EUR);
  });

  test.prop([
    fc.array(
      fc.record({
        netAmountEUR: fc.float({ min: 1, max: 1000, noNaN: true }),
        isB2C: fc.boolean(),
        sameCountry: fc.boolean(),
        category: fc.constantFrom(
          SupplyCategory.GOODS_DISTANCE,
          SupplyCategory.TBE_SERVICES,
          SupplyCategory.OTHER_GOODS,
          SupplyCategory.OTHER_SERVICES,
        ),
      }),
      { minLength: 1, maxLength: 20 },
    ),
  ])(
    'domestic and B2B supplies never advance the cumulative total',
    (transactions) => {
      const monitor = new DistanceSalesMonitor(false);

      transactions.forEach((t, index) => {
        monitor.recordTransaction(
          relevantTransaction(`tx-${index}`, t.netAmountEUR, {
            isB2C: t.isB2C,
            customerCountry: t.sameCountry ? BE : DE,
            category: t.category,
          }),
        );
      });

      const expectedTotal = transactions
        .filter(
          (t) =>
            t.isB2C &&
            !t.sameCountry &&
            (t.category === SupplyCategory.GOODS_DISTANCE ||
              t.category === SupplyCategory.TBE_SERVICES),
        )
        .reduce((sum, t) => sum + t.netAmountEUR, 0);

      expect(monitor.getCumulativeEUR()).toBeCloseTo(expectedTotal, 5);
    },
  );

  test.prop([fc.boolean(), fc.array(fc.float({ min: 0, max: 5000, noNaN: true }), { maxLength: 10 })])(
    'a supplier who exceeded the threshold in the prior year is immediately locked in, regardless of current-year activity',
    (_unused, currentYearAmounts) => {
      const monitor = new DistanceSalesMonitor(true);

      expect(monitor.getStatus()).toBe(DistanceSalesStatus.LOCKED_IN_FROM_PRIOR_YEAR);
      expect(
        monitor
          .getEventLog()
          .some((e) => e.type === DistanceSalesEventType.LOCKED_IN_FROM_PRIOR_YEAR),
      ).toBe(true);

      currentYearAmounts.forEach((amount, index) => {
        monitor.recordTransaction(relevantTransaction(`tx-${index}`, amount));
        expect(monitor.getStatus()).toBe(DistanceSalesStatus.LOCKED_IN_FROM_PRIOR_YEAR);
      });
    },
  );

  test.prop([
    fc.float({ min: 0, max: Math.fround(DISTANCE_SALES_THRESHOLD_EUR - 0.01), noNaN: true }),
    fc.float({ min: Math.fround(0.02), max: Math.fround(5000), noNaN: true }),
  ])(
    'crossing the threshold emits CROSSED with the id of the triggering transaction',
    (belowAmount, crossingDelta) => {
      const monitor = new DistanceSalesMonitor(false);

      monitor.recordTransaction(relevantTransaction('tx-below', belowAmount));

      const remaining = DISTANCE_SALES_THRESHOLD_EUR - monitor.getCumulativeEUR();
      const crossingAmount = Math.max(crossingDelta, remaining + 0.01);

      monitor.recordTransaction(relevantTransaction('tx-crossing', crossingAmount));

      expect(monitor.getStatus()).toBe(DistanceSalesStatus.CROSSED);
      expect(monitor.getCumulativeEUR()).toBeGreaterThanOrEqual(DISTANCE_SALES_THRESHOLD_EUR);

      const crossedEvent = monitor
        .getEventLog()
        .find((e) => e.type === DistanceSalesEventType.CROSSED);
      expect(crossedEvent).toBeDefined();
      expect(crossedEvent?.transactionId).toBe('tx-crossing');
    },
  );

  it('emits APPROACHING_80 and APPROACHING_95 before CROSSED', () => {
    const monitor = new DistanceSalesMonitor(false);

    monitor.recordTransaction(relevantTransaction('tx-1', 8_000));
    monitor.recordTransaction(relevantTransaction('tx-2', 1_500));
    monitor.recordTransaction(relevantTransaction('tx-3', 1_000));

    const types = monitor.getEventLog().map((e) => e.type);
    expect(types).toEqual([
      DistanceSalesEventType.APPROACHING_80,
      DistanceSalesEventType.APPROACHING_95,
      DistanceSalesEventType.CROSSED,
    ]);
  });
});
