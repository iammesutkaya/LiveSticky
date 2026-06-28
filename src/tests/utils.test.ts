import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { formatTimeAgo, formatNumber, computeUptime } from '../client/utils.js';

describe('formatTimeAgo', () => {
  const now = new Date('2024-01-15T12:00:00Z').getTime();

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns empty string for null', () => {
    expect(formatTimeAgo(null)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(formatTimeAgo(undefined)).toBe('');
  });

  it('returns empty string for invalid date', () => {
    expect(formatTimeAgo('not-a-date')).toBe('');
  });

  it('returns "just now" for timestamps under 1 minute ago', () => {
    const ts = new Date(now - 30000).toISOString();
    expect(formatTimeAgo(ts)).toBe('just now');
  });

  it('returns minutes for timestamps under 1 hour ago', () => {
    const ts = new Date(now - 25 * 60000).toISOString();
    expect(formatTimeAgo(ts)).toBe('25m ago');
  });

  it('returns hours and minutes for timestamps under 24 hours ago', () => {
    const ts = new Date(now - (3 * 3600000 + 40 * 60000)).toISOString();
    expect(formatTimeAgo(ts)).toBe('3h 40m ago');
  });

  it('omits minutes when exactly on the hour', () => {
    const ts = new Date(now - 5 * 3600000).toISOString();
    expect(formatTimeAgo(ts)).toBe('5h ago');
  });

  it('returns days and hours for timestamps over 24 hours ago', () => {
    const ts = new Date(now - (2 * 86400000 + 6 * 3600000)).toISOString();
    expect(formatTimeAgo(ts)).toBe('2d 6h ago');
  });

  it('omits hours when exactly on the day', () => {
    const ts = new Date(now - 3 * 86400000).toISOString();
    expect(formatTimeAgo(ts)).toBe('3d ago');
  });

  it('returns empty string for future timestamps', () => {
    const ts = new Date(now + 60000).toISOString();
    expect(formatTimeAgo(ts)).toBe('');
  });
});

describe('formatNumber', () => {
  it('formats plain integers with commas', () => {
    expect(formatNumber('15420')).toBe('15,420');
  });

  it('handles numeric input', () => {
    expect(formatNumber(1000)).toBe('1,000');
  });

  it('handles zero', () => {
    expect(formatNumber('0')).toBe('0');
  });

  it('handles small numbers', () => {
    expect(formatNumber('999')).toBe('999');
  });

  it('falls back for null', () => {
    expect(formatNumber(null)).toBe('0');
  });

  it('falls back for non-numeric string', () => {
    expect(formatNumber('abc')).toBe('abc');
  });
});

describe('computeUptime', () => {
  const now = new Date('2024-01-15T12:00:00Z').getTime();

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns empty string for null', () => {
    expect(computeUptime(null)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(computeUptime(undefined)).toBe('');
  });

  it('returns minutes only for short uptimes', () => {
    const startedAt = new Date(now - 45 * 60000).toISOString();
    expect(computeUptime(startedAt)).toBe('45m');
  });

  it('returns hours and minutes for long uptimes', () => {
    const startedAt = new Date(now - (2 * 3600000 + 30 * 60000)).toISOString();
    expect(computeUptime(startedAt)).toBe('2h 30m');
  });

  it('returns empty string for future timestamps', () => {
    const startedAt = new Date(now + 60000).toISOString();
    expect(computeUptime(startedAt)).toBe('');
  });
});
