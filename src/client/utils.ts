/**
 * Pure utility functions shared between the dashboard client and tests.
 * No DOM, no Devvit, no side effects.
 */

/**
 * Format an ISO timestamp into a coarse "X ago" string (e.g. "3h 40m ago").
 * Returns '' if the timestamp is missing or unparseable.
 */
export function formatTimeAgo(iso: string | null | undefined): string {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  if (isNaN(then)) return '';
  const diffMs = Date.now() - then;
  if (diffMs < 0) return '';

  const totalMinutes = Math.floor(diffMs / 60000);
  if (totalMinutes < 1) return 'just now';
  if (totalMinutes < 60) return `${totalMinutes}m ago`;

  const totalHours = Math.floor(totalMinutes / 60);
  if (totalHours < 24) {
    const mins = totalMinutes % 60;
    return mins > 0 ? `${totalHours}h ${mins}m ago` : `${totalHours}h ago`;
  }

  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  return hours > 0 ? `${days}d ${hours}h ago` : `${days}d ago`;
}

/**
 * Format a viewer count with K/M abbreviations (e.g. 15420 → "15.4K", 842 → "842").
 * Trailing ".0" is stripped so "1.0K" becomes "1K".
 */
export function formatNumber(numStr: string | number | null | undefined): string {
  const num = parseInt(String(numStr ?? ''), 10);
  if (isNaN(num)) return String(numStr ?? '0') || '0';
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  return num.toString();
}
