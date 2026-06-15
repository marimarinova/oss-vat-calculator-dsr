import { describe, expect } from 'vitest';
import { test, fc } from '@fast-check/vitest';
import { IOSS_CONSIGNMENT_CAP_EUR, IOSSConsignmentMonitor } from './ioss-consignment-monitor';

describe('IOSSConsignmentMonitor', () => {
  test.prop([fc.float({ min: -1000, max: 1000, noNaN: true })])(
    'isEligible matches 0 < value <= 150 (Art. 369l)',
    (value) => {
      const monitor = new IOSSConsignmentMonitor();
      const expected = value > 0 && value <= IOSS_CONSIGNMENT_CAP_EUR;
      expect(monitor.isEligible(value)).toBe(expected);
    },
  );
});
