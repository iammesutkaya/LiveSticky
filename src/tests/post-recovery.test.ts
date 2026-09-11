import { describe, it, expect } from 'vitest';
import { isRecoveryCandidate, type RecoveryCandidate } from '../post-recovery.js';

const streamStart = new Date('2026-09-10T18:00:00Z');

const post = (over: Partial<RecoveryCandidate> = {}): RecoveryCandidate => ({
  id: 't3_live',
  title: 'HasanAbi is streaming - politics',
  subredditName: 'Hasan_Piker',
  removed: false,
  createdAt: new Date('2026-09-10T18:01:00Z'),
  ...over,
});

describe('isRecoveryCandidate', () => {
  const liveFilter = {
    keyword: null,
    subredditName: 'Hasan_Piker',
    excludeIds: new Set(['t3_clips', 't3_offline', 't3_dash']),
    notBefore: streamStart,
  };

  it('accepts the live thread created during this stream, whatever the mod titled it', () => {
    expect(isRecoveryCandidate(post(), liveFilter)).toBe(true);
  });

  it('never adopts the Top Clips post the app already manages', () => {
    const clips = post({ id: 't3_clips', title: 'Top Clips - HasanAbi' });
    expect(isRecoveryCandidate(clips, liveFilter)).toBe(false);
  });

  it('rejects the previous stream\'s concluded thread', () => {
    const yesterday = post({ id: 't3_old', createdAt: new Date('2026-09-09T20:00:00Z') });
    expect(isRecoveryCandidate(yesterday, liveFilter)).toBe(false);
  });

  it('rejects removed posts and other subreddits', () => {
    expect(isRecoveryCandidate(post({ removed: true }), liveFilter)).toBe(false);
    expect(isRecoveryCandidate(post({ subredditName: 'vinesauce' }), liveFilter)).toBe(false);
  });

  it('still enforces the keyword when one is given (offline / Top Clips lookups)', () => {
    const clipsFilter = { keyword: 'top clips', subredditName: 'Hasan_Piker' };
    expect(isRecoveryCandidate(post({ title: 'Top Clips - HasanAbi' }), clipsFilter)).toBe(true);
    expect(isRecoveryCandidate(post(), clipsFilter)).toBe(false);
  });

  it('matches the subreddit case-insensitively', () => {
    expect(isRecoveryCandidate(post({ subredditName: 'hasan_piker' }), liveFilter)).toBe(true);
  });
});
