/**
 * Candidate test for self-healing post recovery.
 *
 * Pure so it can be tested without the Devvit runtime. The live thread is the
 * reason this is strict: its title is mod-configurable, so a title keyword
 * cannot identify it, and an author-only match adopted whichever post of ours
 * happened to rank first in search - in practice the "Top Clips" post from the
 * previous stream, which then got edited and pinned as the live thread.
 */
export interface RecoveryCandidate {
  id?: string;
  title?: string;
  body?: string;
  subredditName?: string;
  removed?: boolean;
  createdAt?: Date;
}

/**
 * Invisible markers stamped into the body of every post this app manages, so
 * recovery can identify its own work instead of guessing from the title (which
 * mods can rename) or from a list of ids to avoid (which can never be complete -
 * the monthly clips post is not tracked in Redis at all).
 *
 * An empty-label link renders as nothing on every Reddit client.
 */
export const POST_MARKERS = {
  live: '[](#ls-live)',
  offline: '[](#ls-offline)',
  clips: '[](#ls-clips)',
  monthly: '[](#ls-monthly)',
} as const;

export type ManagedPostKind = keyof typeof POST_MARKERS;

/** Append the marker for `kind` unless the body already carries it. */
export const withMarker = (body: string, kind: ManagedPostKind): string =>
  body.includes(POST_MARKERS[kind]) ? body : `${body}\n\n${POST_MARKERS[kind]}`;

export interface RecoveryFilter {
  /**
   * Marker the body must carry. Posts created before this app started stamping
   * markers have none, so they simply never match - recovery then finds nothing
   * and a fresh post is created, which is the safe direction.
   */
  marker?: ManagedPostKind;
  /**
   * Substring the title must contain, lowercased. `null` disables title matching.
   * Kept as a legacy path for recycled posts (offline, clips) whose bodies predate
   * markers; the live post does not use it, because its title is mod-configurable.
   */
  keyword: string | null;
  subredditName: string;
  /** Post ids this app already manages elsewhere - never adopt one of these. */
  excludeIds?: Set<string>;
  /** Reject anything created before this instant (e.g. the current stream's start). */
  notBefore?: Date;
}

export const isRecoveryCandidate = (p: RecoveryCandidate, f: RecoveryFilter): boolean => {
  if (p.removed) return false;
  if ((p.subredditName || '').toLowerCase() !== f.subredditName.toLowerCase()) return false;
  if (f.excludeIds?.has(p.id || '')) return false;
  if (f.notBefore && !(p.createdAt && p.createdAt.getTime() >= f.notBefore.getTime())) return false;

  // A marker is proof. A title keyword is only a hint, and is accepted alone for
  // the recycled posts that may still be unmarked from an older app version.
  const markerHit = !!f.marker && (p.body || '').includes(POST_MARKERS[f.marker]);
  if (markerHit) return true;
  if (f.marker && f.keyword === null) return false;
  if (f.keyword !== null && !(p.title || '').toLowerCase().includes(f.keyword)) return false;
  return true;
};
