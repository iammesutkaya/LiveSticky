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
 * Format a number (or numeric string) with locale-aware commas (e.g. "15420" → "15,420").
 */
export function formatNumber(numStr: string | number | null | undefined): string {
  const num = parseInt(String(numStr ?? ''), 10);
  if (isNaN(num)) return String(numStr ?? '0') || '0';
  return num.toLocaleString();
}

/**
 * Compute a human-readable uptime string from a started-at ISO timestamp.
 * Returns '' if startedAt is falsy.
 */
export function computeUptime(startedAt: string | null | undefined): string {
  if (!startedAt) return '';
  const startTime = new Date(startedAt).getTime();
  if (isNaN(startTime)) return '';
  const elapsedMs = Date.now() - startTime;
  if (elapsedMs < 0) return '';
  const hours = Math.floor(elapsedMs / 3600000);
  const minutes = Math.floor((elapsedMs % 3600000) / 60000);
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}
