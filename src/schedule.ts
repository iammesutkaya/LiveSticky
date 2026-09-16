/**
 * Pure scheduling rules for the monthly top-20 job.
 *
 * No Devvit imports here so the decision stays unit-testable: the job only runs
 * inside the hourly scheduler, where the interesting cases (a missed tick, a
 * slot on the last day of the month, a fresh mid-month install) are impossible
 * to reproduce by hand.
 */

/** What the mod picked in "Monthly Post - Schedule Day". */
export type MonthlyDayRule = 'START' | 'MIDDLE' | 'END' | number;

export interface MonthlySlot {
  /** Calendar year and 1-indexed month the slot belongs to. */
  year: number;
  month: number;
  /** Whole hours from the slot to now. Negative means the slot is still ahead. */
  hoursElapsed: number;
}

/** Normalize the stored setting, which may be a legacy number or a label. */
export const parseMonthlyDayRule = (raw: unknown): MonthlyDayRule => {
  const text = String(raw ?? 'START').toUpperCase().trim();
  if (text === 'END' || text === 'LAST') return 'END';
  if (text === 'MIDDLE') return 'MIDDLE';
  if (text === 'START') return 'START';
  const numeric = parseInt(text, 10);
  return Number.isFinite(numeric) ? numeric : 'START';
};

/** Last calendar day of a 1-indexed month (28, 29, 30 or 31). */
const lastDayOf = (year: number, month: number): number =>
  new Date(Date.UTC(year, month, 0)).getUTCDate();

const slotDayFor = (rule: MonthlyDayRule, year: number, month: number): number => {
  if (rule === 'END') return lastDayOf(year, month);
  if (rule === 'MIDDLE') return 15;
  if (rule === 'START') return 1;
  // A numeric day past the end of a short month lands on its last day.
  return Math.min(Math.max(rule, 1), lastDayOf(year, month));
};

/**
 * The most recent slot at or before the given local wall-clock time.
 *
 * Everything is anchored to the slot rather than to "now", which is what lets an
 * END slot catch up across a month boundary: a last-day-of-August slot missed
 * until September 1st still reports August, so the caller's dedupe key and the
 * month it compiles stay the same whether it fired on time or late.
 *
 * Wall-clock components are compared as if UTC. Only differences matter, so the
 * sole effect is that a DST shift moves the catch-up boundary by an hour.
 */
export const resolveMonthlySlot = (
  rule: MonthlyDayRule,
  configuredHour: number,
  localYear: number,
  localMonth: number,
  localDay: number,
  localHour: number
): MonthlySlot => {
  const nowOrd = Date.UTC(localYear, localMonth - 1, localDay, localHour);
  const at = (year: number, month: number) => ({
    year,
    month,
    ord: Date.UTC(year, month - 1, slotDayFor(rule, year, month), configuredHour),
  });

  let slot = at(localYear, localMonth);
  if (slot.ord > nowOrd) {
    // This month's slot has not arrived yet, so the last one was in the month before.
    slot = at(localMonth === 1 ? localYear - 1 : localYear, localMonth === 1 ? 12 : localMonth - 1);
  }
  return { year: slot.year, month: slot.month, hoursElapsed: (nowOrd - slot.ord) / 3600000 };
};

/**
 * Whether the hourly job should post for this slot.
 *
 * The slot used to be matched by exact day+hour equality, so a single missed or
 * delayed tick silently cost the whole month. Firing on any tick at or shortly
 * after the slot fixes that, while the caller's per-slot dedupe key keeps it to
 * one post. The upper bound matters: without it, installing on the 20th with the
 * default 1st-of-month slot would post last month's compilation immediately.
 */
export const shouldFireMonthly = (slot: MonthlySlot, catchupHours: number): boolean =>
  slot.hoursElapsed >= 0 && slot.hoursElapsed <= catchupHours;

/** The calendar month a slot compiles: the complete month before the slot's own. */
export const monthCoveredBySlot = (slot: MonthlySlot): { year: number; month: number } => ({
  year: slot.month === 1 ? slot.year - 1 : slot.year,
  month: slot.month === 1 ? 12 : slot.month - 1,
});
