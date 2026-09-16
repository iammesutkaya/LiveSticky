/**
 * Pure scheduling rules for the monthly top-20 job.
 *
 * No Devvit imports here so the decision stays unit-testable: the job itself
 * only runs inside the hourly scheduler, where the interesting cases (a missed
 * tick, a fresh mid-month install) are impossible to reproduce by hand.
 */

/**
 * Whether the hourly monthly job should post on this tick.
 *
 * The slot used to be matched by exact day+hour equality, so a single missed or
 * delayed tick silently cost the whole month. Firing on any tick at or shortly
 * after the slot fixes that, while the caller's per-month dedupe key keeps it to
 * one post. The upper bound matters: without it, installing on the 20th with the
 * default 1st-of-month slot would post last month's compilation immediately.
 *
 * All values are in the streamer's local timezone, within one calendar month.
 */
export const shouldFireMonthly = (
  localDay: number,
  localHour: number,
  configuredDay: number,
  configuredHour: number,
  catchupHours: number
): boolean => {
  const elapsed = (localDay - configuredDay) * 24 + (localHour - configuredHour);
  return elapsed >= 0 && elapsed <= catchupHours;
};
