import { describe, it, expect } from 'vitest';
import { test, fc } from '@fast-check/vitest';
import {
  SME_UNION_TURNOVER_THRESHOLD_EUR,
  SMECrossBorderMonitor,
} from './sme-cross-border-monitor';

const CURRENT_YEAR = 2026;

describe('SMECrossBorderMonitor', () => {
  it('is eligible with zero turnover', () => {
    const monitor = new SMECrossBorderMonitor(CURRENT_YEAR);
    expect(monitor.isEligibleForExemption()).toBe(true);
  });

  test.prop([
    fc.float({ min: 0, max: Math.fround(SME_UNION_TURNOVER_THRESHOLD_EUR), noNaN: true }),
    fc.float({ min: 0, max: Math.fround(SME_UNION_TURNOVER_THRESHOLD_EUR), noNaN: true }),
  ])(
    'is eligible when both current and previous year turnover are <= EUR 100,000',
    (currentTurnover, previousTurnover) => {
      const monitor = new SMECrossBorderMonitor(CURRENT_YEAR);
      monitor.recordTransaction(currentTurnover, 'DE', new Date(Date.UTC(CURRENT_YEAR, 5, 1)));
      monitor.recordTransaction(previousTurnover, 'FR', new Date(Date.UTC(CURRENT_YEAR - 1, 5, 1)));

      expect(monitor.isEligibleForExemption()).toBe(true);
    },
  );

  test.prop([
    fc.float({
      min: Math.fround(SME_UNION_TURNOVER_THRESHOLD_EUR + 0.01),
      max: 1_000_000,
      noNaN: true,
    }),
    fc.float({ min: 0, max: Math.fround(SME_UNION_TURNOVER_THRESHOLD_EUR), noNaN: true }),
  ])(
    'is not eligible when current year turnover exceeds EUR 100,000, regardless of previous year',
    (currentTurnover, previousTurnover) => {
      const monitor = new SMECrossBorderMonitor(CURRENT_YEAR);
      monitor.recordTransaction(currentTurnover, 'DE', new Date(Date.UTC(CURRENT_YEAR, 5, 1)));
      monitor.recordTransaction(previousTurnover, 'FR', new Date(Date.UTC(CURRENT_YEAR - 1, 5, 1)));

      expect(monitor.isEligibleForExemption()).toBe(false);
    },
  );

  test.prop([
    fc.float({ min: 0, max: Math.fround(SME_UNION_TURNOVER_THRESHOLD_EUR), noNaN: true }),
    fc.float({
      min: Math.fround(SME_UNION_TURNOVER_THRESHOLD_EUR + 0.01),
      max: 1_000_000,
      noNaN: true,
    }),
  ])(
    'is not eligible when previous year turnover exceeded EUR 100,000, even if current year is within the cap',
    (currentTurnover, previousTurnover) => {
      const monitor = new SMECrossBorderMonitor(CURRENT_YEAR);
      monitor.recordTransaction(currentTurnover, 'DE', new Date(Date.UTC(CURRENT_YEAR, 5, 1)));
      monitor.recordTransaction(previousTurnover, 'FR', new Date(Date.UTC(CURRENT_YEAR - 1, 5, 1)));

      expect(monitor.isEligibleForExemption()).toBe(false);
    },
  );

  it('accumulates union-wide turnover across multiple customer countries within a year', () => {
    const monitor = new SMECrossBorderMonitor(CURRENT_YEAR);
    monitor.recordTransaction(40_000, 'DE', new Date(Date.UTC(CURRENT_YEAR, 0, 1)));
    monitor.recordTransaction(30_000, 'FR', new Date(Date.UTC(CURRENT_YEAR, 5, 1)));

    expect(monitor.getUnionWideTurnoverEUR(CURRENT_YEAR)).toBe(70_000);
  });
});
