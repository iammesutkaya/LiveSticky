import { describe, it, expect } from 'vitest';
import { isRecoveryCandidate, type RecoverablePost, type RecoveryFilter } from '../recovery.js';

const APP = { appUserId: 't2_app', appUserName: 'live-sticky' };
const SESSION_START = new Date('2026-09-11T18:00:00Z');

const post = (over: Partial<RecoverablePost> = {}): RecoverablePost => ({
  authorId: 't2_app',
  authorName: 'live-sticky',
  title: '🚨 HasanAbi is LIVE! 🚨 - politics stream',
  subredditName: 'hasanabi',
  removed: false,
  createdAt: new Date('2026-09-11T18:03:00Z'),
  ...over,
});

const liveFilter: RecoveryFilter = {
  ...APP,
  subredditName: 'hasanabi',
  keyword: 'is LIVE',
  notBefore: SESSION_START,
};

const reusableFilter: RecoveryFilter = {
  ...APP,
  subredditName: 'hasanabi',
  keyword: 'Top Clips',
};

describe('self-healing recovery candidates', () => {
  it('accepts the live thread created during the current session', () => {
    expect(isRecoveryCandidate(post(), liveFilter)).toBe(true);
  });

  it('rejects the previous stream\'s concluded live thread', () => {
    // The regression that stopped new live threads from ever being posted:
    // live_post_id is cleared at the end of every stream, so recovery runs on
    // every go-live and kept adopting yesterday's thread.
    const yesterday = post({ createdAt: new Date('2026-09-10T18:03:00Z') });
    expect(isRecoveryCandidate(yesterday, liveFilter)).toBe(false);
  });

  it('rejects a highlights post returned by a fuzzy search for the live thread', () => {
    // Reddit search for "is LIVE" also returns the app's other posts. Accepting
    // one overwrote the Top Clips body with live stats and pinned it.
    const topClips = post({ title: '🎬 Top Clips - HasanAbi' });
    expect(isRecoveryCandidate(topClips, liveFilter)).toBe(false);
  });

  it('rejects a post written by anyone other than the app account', () => {
    const impostor = post({ authorId: 't2_someone', authorName: 'a_mod' });
    expect(isRecoveryCandidate(impostor, liveFilter)).toBe(false);
  });

  it('rejects a post from another subreddit', () => {
    expect(isRecoveryCandidate(post({ subredditName: 'livestreamfail' }), liveFilter)).toBe(false);
  });

  it('rejects a removed post', () => {
    expect(isRecoveryCandidate(post({ removed: true }), liveFilter)).toBe(false);
  });

  it('accepts a post created exactly at the session start boundary', () => {
    expect(isRecoveryCandidate(post({ createdAt: SESSION_START }), liveFilter)).toBe(true);
  });

  it('rejects a candidate with no usable timestamp when a bound is set', () => {
    expect(isRecoveryCandidate(post({ createdAt: undefined }), liveFilter)).toBe(false);
    expect(isRecoveryCandidate(post({ createdAt: new Date('nope') }), liveFilter)).toBe(false);
  });

  it('applies no time bound to reusable posts, however old', () => {
    const ancient = post({
      title: '🎬 Top Clips - HasanAbi',
      createdAt: new Date('2025-01-04T12:00:00Z'),
    });
    expect(isRecoveryCandidate(ancient, reusableFilter)).toBe(true);
  });

  it('matches titles case-insensitively', () => {
    expect(isRecoveryCandidate(post({ title: 'hasanabi IS live now' }), liveFilter)).toBe(true);
  });
});
