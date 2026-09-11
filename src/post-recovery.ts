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
  subredditName?: string;
  removed?: boolean;
  createdAt?: Date;
}

export interface RecoveryFilter {
  /** Substring the title must contain, lowercased. `null` disables title matching. */
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
  if (f.keyword !== null && !(p.title || '').toLowerCase().includes(f.keyword)) return false;
  return true;
};
