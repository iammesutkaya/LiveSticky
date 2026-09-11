/**
 * Self-healing recovery filters.
 *
 * When Redis loses a post pointer (cold start, app update, manual refresh),
 * LiveSticky looks for the post it should already own. Adopting the wrong one
 * is destructive: the recovered post gets its body overwritten and, for the
 * offline post, its comments removed. These predicates are the guard, kept
 * here as pure functions so they can be tested without the Devvit runtime.
 */

export interface RecoverablePost {
  authorId?: string;
  authorName?: string;
  title?: string;
  subredditName?: string;
  removed?: boolean;
  createdAt?: Date;
}

export interface RecoveryFilter {
  /** The app account. A post authored by anyone else is never ours to edit. */
  appUserId?: string;
  appUserName?: string;
  subredditName: string;
  /** Case-insensitive substring the title must contain. */
  keyword: string;
  /**
   * Earliest acceptable creation time. Set it for posts that belong to a single
   * stream session (the live thread); leave it unset for the long-lived posts
   * that are reused forever (offline post, highlights post).
   */
  notBefore?: Date;
}

export const isOwnedByApp = (post: RecoverablePost, filter: RecoveryFilter): boolean =>
  (filter.appUserId !== undefined && post.authorId === filter.appUserId) ||
  (filter.appUserName !== undefined && post.authorName === filter.appUserName);

export const isRecentEnough = (post: RecoverablePost, filter: RecoveryFilter): boolean => {
  if (!filter.notBefore) return true;
  if (!(post.createdAt instanceof Date) || isNaN(post.createdAt.getTime())) return false;
  return post.createdAt.getTime() >= filter.notBefore.getTime();
};

/**
 * Every condition a post must satisfy before LiveSticky treats it as its own.
 * Applied to both recovery sources: the app account's post listing and the
 * search fallback, whose fuzzy matching returns posts the query never named.
 */
export const isRecoveryCandidate = (post: RecoverablePost, filter: RecoveryFilter): boolean =>
  !post.removed &&
  isOwnedByApp(post, filter) &&
  (post.subredditName || '').toLowerCase() === filter.subredditName.toLowerCase() &&
  (post.title || '').toLowerCase().includes(filter.keyword.toLowerCase()) &&
  isRecentEnough(post, filter);
