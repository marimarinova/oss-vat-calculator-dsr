import { describe, it, expect, beforeEach } from 'vitest';
import {
  ThresholdMonitor,
  ThresholdStatus,
  YearlyThresholdMonitor,
} from './threshold-monitor';

describe('Threshold Monitor', () => {
  let monitor: ThresholdMonitor;

  beforeEach(() => {
    monitor = new ThresholdMonitor(1, 2026);
  });

  describe('Initialization', () => {
    it('should initialize with BELOW_THRESHOLD status', () => {
      expect(monitor.getStatus()).toBe(ThresholdStatus.BELOW_THRESHOLD);
    });

    it('should start with zero cumulative amount', () => {
      expect(monitor.getCumulativeAmount()).toBe(0);
    });

    it('should show full threshold amount remaining', () => {
      expect(monitor.getAmountUntilThreshold()).toBe(10000);
    });

    it('should throw error for invalid quarter', () => {
      expect(() => new ThresholdMonitor(0, 2026)).toThrow();
      expect(() => new ThresholdMonitor(5, 2026)).toThrow();
      expect(() => new ThresholdMonitor(1.5, 2026)).toThrow();
    });
  });

  describe('Recording transactions', () => {
    it('should accumulate transaction amounts', () => {
      monitor.recordTransaction(1000, 1, 2026);
      expect(monitor.getCumulativeAmount()).toBe(1000);

      monitor.recordTransaction(2000, 2, 2026);
      expect(monitor.getCumulativeAmount()).toBe(3000);
    });

    it('should return BELOW_THRESHOLD while below limit', () => {
      const status = monitor.recordTransaction(5000, 1, 2026);
      expect(status).toBe(ThresholdStatus.BELOW_THRESHOLD);
      expect(monitor.hasExceededThreshold()).toBe(false);
    });

    it('should transition to AT_OR_ABOVE_THRESHOLD when limit is reached', () => {
      monitor.recordTransaction(9000, 1, 2026);
      expect(monitor.getStatus()).toBe(ThresholdStatus.BELOW_THRESHOLD);

      const status = monitor.recordTransaction(1500, 1, 2026);
      expect(status).toBe(ThresholdStatus.AT_OR_ABOVE_THRESHOLD);
      expect(monitor.hasExceededThreshold()).toBe(true);
    });

    it('should detect exact threshold crossing', () => {
      monitor.recordTransaction(10000, 1, 2026);
      expect(monitor.getStatus()).toBe(ThresholdStatus.AT_OR_ABOVE_THRESHOLD);
      expect(monitor.hasExceededThreshold()).toBe(true);
    });

    it('should record threshold crossing date', () => {
      monitor.recordTransaction(5000, 1, 2026);
      expect(monitor.getThresholdCrossedDate()).toBeUndefined();

      monitor.recordTransaction(5000, 1, 2026);
      expect(monitor.getThresholdCrossedDate()).toBeDefined();
      expect(monitor.getThresholdCrossedDate()).toBeInstanceOf(Date);
    });

    it('should update amount until threshold', () => {
      monitor.recordTransaction(3000, 1, 2026);
      expect(monitor.getAmountUntilThreshold()).toBe(7000);

      monitor.recordTransaction(6000, 1, 2026);
      expect(monitor.getAmountUntilThreshold()).toBe(1000); // 10000 - 9000 = 1000
    });

    it('should reject negative transaction amounts', () => {
      expect(() => monitor.recordTransaction(-100, 1, 2026)).toThrow();
    });

    it('should validate month is in quarter', () => {
      // Q1 includes months 1, 2, 3
      expect(() => monitor.recordTransaction(100, 1, 2026)).not.toThrow();
      expect(() => monitor.recordTransaction(100, 2, 2026)).not.toThrow();
      expect(() => monitor.recordTransaction(100, 3, 2026)).not.toThrow();

      // Q1 does not include months 4, 5, etc
      expect(() => monitor.recordTransaction(100, 4, 2026)).toThrow();
    });
  });

  describe('Monthly breakdown', () => {
    it('should track monthly supply totals', () => {
      monitor.recordTransaction(1000, 1, 2026);
      monitor.recordTransaction(2000, 1, 2026);
      monitor.recordTransaction(1500, 2, 2026);

      const breakdown = monitor.getMonthlyBreakdown();

      expect(breakdown).toHaveLength(2);
      expect(breakdown[0].month).toBe(1);
      expect(breakdown[0].totalEUR).toBe(3000);
      expect(breakdown[0].transactionCount).toBe(2);

      expect(breakdown[1].month).toBe(2);
      expect(breakdown[1].totalEUR).toBe(1500);
      expect(breakdown[1].transactionCount).toBe(1);
    });

    it('should keep monthly breakdown sorted', () => {
      monitor.recordTransaction(100, 3, 2026);
      monitor.recordTransaction(100, 1, 2026);
      monitor.recordTransaction(100, 2, 2026);

      const breakdown = monitor.getMonthlyBreakdown();

      expect(breakdown[0].month).toBe(1);
      expect(breakdown[1].month).toBe(2);
      expect(breakdown[2].month).toBe(3);
    });
  });

  describe('State management', () => {
    it('should provide snapshot of full state', () => {
      monitor.recordTransaction(5000, 1, 2026);
      const state = monitor.getState();

      expect(state.quarter).toBe(1);
      expect(state.year).toBe(2026);
      expect(state.cumulativeEUR).toBe(5000);
      expect(state.status).toBe(ThresholdStatus.BELOW_THRESHOLD);
      expect(state.monthlyBreakdown).toHaveLength(1);
    });

    it('should reset state for new quarter', () => {
      monitor.recordTransaction(5000, 1, 2026);
      expect(monitor.getCumulativeAmount()).toBe(5000);

      monitor.reset(2, 2026);
      expect(monitor.getCumulativeAmount()).toBe(0);
      expect(monitor.getStatus()).toBe(ThresholdStatus.BELOW_THRESHOLD);
      expect(monitor.getState().quarter).toBe(2);
    });
  });

  describe('Threshold constant', () => {
    it('should expose threshold amount', () => {
      expect(ThresholdMonitor.getThresholdAmount()).toBe(10000);
    });
  });
});

describe('Yearly Threshold Monitor', () => {
  let monitor: YearlyThresholdMonitor;

  beforeEach(() => {
    monitor = new YearlyThresholdMonitor();
  });

  describe('Multi-quarter tracking', () => {
    it('should manage separate monitors for each quarter', () => {
      monitor.recordTransaction(5000, 1, 2026); // Q1 (month 1)
      monitor.recordTransaction(3000, 10, 2026); // Q4 (month 10)

      const states = monitor.getAllStates();
      expect(states).toHaveLength(2);
      expect(states[0].quarter).toBe(1);
      expect(states[1].quarter).toBe(4);
    });

    it('should track threshold crossing per quarter', () => {
      // Q1 below threshold
      monitor.recordTransaction(5000, 1, 2026);
      monitor.recordTransaction(4000, 2, 2026);

      // Q2 above threshold
      monitor.recordTransaction(6000, 4, 2026);
      monitor.recordTransaction(5000, 5, 2026);

      const states = monitor.getAllStates();
      expect(states[0].status).toBe(ThresholdStatus.BELOW_THRESHOLD);
      expect(states[1].status).toBe(ThresholdStatus.AT_OR_ABOVE_THRESHOLD);
    });
  });

  describe('Threshold detection', () => {
    it('should detect threshold exceeded in any quarter of year', () => {
      monitor.recordTransaction(5000, 1, 2026); // Q1
      monitor.recordTransaction(4000, 2, 2026);

      expect(monitor.hasExceededThresholdInYear(2026)).toBe(false);

      monitor.recordTransaction(6000, 4, 2026); // Q4
      monitor.recordTransaction(5000, 5, 2026);

      expect(monitor.hasExceededThresholdInYear(2026)).toBe(true);
    });

    it('should not detect threshold exceeded in different year', () => {
      monitor.recordTransaction(11000, 1, 2025);
      expect(monitor.hasExceededThresholdInYear(2026)).toBe(false);
    });
  });

  describe('Quarterly month assignment', () => {
    it('should assign months to correct quarters', () => {
      // Each quarter
      monitor.recordTransaction(1000, 1, 2026); // Q1, month 1
      monitor.recordTransaction(1000, 4, 2026); // Q2, month 4
      monitor.recordTransaction(1000, 7, 2026); // Q3, month 7
      monitor.recordTransaction(1000, 10, 2026); // Q4, month 10

      const states = monitor.getAllStates();
      expect(states).toHaveLength(4);
      expect(states[0].quarter).toBe(1);
      expect(states[1].quarter).toBe(2);
      expect(states[2].quarter).toBe(3);
      expect(states[3].quarter).toBe(4);
    });
  });
});
