import { describe, it, expect } from 'vitest';
import { shouldFireMonthly } from '../schedule.js';

describe('shouldFireMonthly', () => {
  const CATCHUP = 48;
  // Default configuration: 1st of the month at 12:00.
  const fire = (day: number, hour: number) => shouldFireMonthly(day, hour, 1, 12, CATCHUP);

  it('fires on the exact slot', () => {
    expect(fire(1, 12)).toBe(true);
  });

  it('does not fire before the slot', () => {
    expect(fire(1, 11)).toBe(false);
  });

  it('still fires when the tick is late, which used to lose the month', () => {
    expect(fire(1, 13)).toBe(true);
    expect(fire(2, 12)).toBe(true);
    expect(fire(3, 11)).toBe(true); // 47h late, the last hour of the window
  });

  it('stops catching up once the window has passed', () => {
    expect(fire(3, 13)).toBe(false); // 49h late
  });

  it('does not dump last month on a fresh mid-month install', () => {
    expect(fire(20, 12)).toBe(false);
  });

  it('handles a slot later in the month', () => {
    expect(shouldFireMonthly(15, 9, 15, 9, CATCHUP)).toBe(true);
    expect(shouldFireMonthly(15, 8, 15, 9, CATCHUP)).toBe(false);
    expect(shouldFireMonthly(16, 9, 15, 9, CATCHUP)).toBe(true);
  });
});
