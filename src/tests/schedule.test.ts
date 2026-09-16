import { describe, it, expect } from 'vitest';
import {
  resolveMonthlySlot,
  shouldFireMonthly,
  monthCoveredBySlot,
  parseMonthlyDayRule,
  type MonthlyDayRule,
} from '../schedule.js';

const CATCHUP = 48;

/** Would the job post, given a rule/hour and a local wall-clock moment? */
const fires = (
  rule: MonthlyDayRule,
  hour: number,
  y: number,
  m: number,
  d: number,
  h: number
): boolean => shouldFireMonthly(resolveMonthlySlot(rule, hour, y, m, d, h), CATCHUP);

describe('parseMonthlyDayRule', () => {
  it('accepts the labels, the legacy alias and a numeric day', () => {
    expect(parseMonthlyDayRule('START')).toBe('START');
    expect(parseMonthlyDayRule('MIDDLE')).toBe('MIDDLE');
    expect(parseMonthlyDayRule('END')).toBe('END');
    expect(parseMonthlyDayRule('LAST')).toBe('END');
    expect(parseMonthlyDayRule(9)).toBe(9);
  });

  it('falls back to START for junk and for a missing value', () => {
    expect(parseMonthlyDayRule(undefined)).toBe('START');
    expect(parseMonthlyDayRule('whenever')).toBe('START');
  });
});

describe('shouldFireMonthly - default slot, 1st at 12:00', () => {
  it('fires on the exact slot', () => {
    expect(fires('START', 12, 2026, 9, 1, 12)).toBe(true);
  });

  it('does not fire before the slot', () => {
    expect(fires('START', 12, 2026, 9, 1, 11)).toBe(false);
  });

  it('still fires when the tick is late, which used to lose the month', () => {
    expect(fires('START', 12, 2026, 9, 1, 13)).toBe(true);
    expect(fires('START', 12, 2026, 9, 3, 11)).toBe(true); // 47h late
  });

  it('stops catching up once the window has passed', () => {
    expect(fires('START', 12, 2026, 9, 3, 13)).toBe(false); // 49h late
  });

  it('does not dump last month on a fresh mid-month install', () => {
    expect(fires('START', 12, 2026, 9, 20, 12)).toBe(false);
  });
});

describe('END slots catch up across the month boundary', () => {
  it('fires on the last day of the month', () => {
    expect(fires('END', 12, 2026, 8, 31, 12)).toBe(true);
  });

  it('still fires the next morning, after the month has rolled over', () => {
    expect(fires('END', 12, 2026, 9, 1, 9)).toBe(true);
  });

  it('keeps the slot in the month it was scheduled in, so the dedupe key holds', () => {
    const onTime = resolveMonthlySlot('END', 12, 2026, 8, 31, 12);
    const caughtUp = resolveMonthlySlot('END', 12, 2026, 9, 1, 9);
    expect(caughtUp.year).toBe(onTime.year);
    expect(caughtUp.month).toBe(onTime.month);
    expect(onTime.month).toBe(8);
  });

  it('compiles the same month whether it fired on time or late', () => {
    const onTime = monthCoveredBySlot(resolveMonthlySlot('END', 12, 2026, 8, 31, 12));
    const caughtUp = monthCoveredBySlot(resolveMonthlySlot('END', 12, 2026, 9, 1, 9));
    expect(caughtUp).toEqual(onTime);
    expect(onTime).toEqual({ year: 2026, month: 7 });
  });

  it('lands on the real last day of a short month', () => {
    expect(fires('END', 12, 2026, 2, 28, 12)).toBe(true);
    expect(fires('END', 12, 2026, 2, 27, 12)).toBe(false);
  });
});

describe('slot arithmetic across a year boundary', () => {
  it('a January 1st slot compiles the previous December', () => {
    expect(monthCoveredBySlot(resolveMonthlySlot('START', 12, 2027, 1, 1, 12)))
      .toEqual({ year: 2026, month: 12 });
  });

  it('an early-January tick falls back to the December slot, not a future one', () => {
    const slot = resolveMonthlySlot('MIDDLE', 12, 2027, 1, 3, 12);
    expect(slot).toMatchObject({ year: 2026, month: 12 });
    expect(shouldFireMonthly(slot, CATCHUP)).toBe(false); // ~19 days late
  });
});

describe('numeric day rules', () => {
  it('a day past the end of a short month lands on its last day', () => {
    expect(fires(31, 12, 2026, 2, 28, 12)).toBe(true);
  });
});
