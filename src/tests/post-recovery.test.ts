import { describe, it, expect } from 'vitest';
import { isRecoveryCandidate, withMarker, POST_MARKERS, type RecoveryCandidate } from '../post-recovery.js';

const streamStart = new Date('2026-09-10T18:00:00Z');

const post = (over: Partial<RecoveryCandidate> = {}): RecoveryCandidate => ({
  id: 't3_live',
  title: 'HasanAbi is streaming - politics',
  subredditName: 'Hasan_Piker',
  removed: false,
  createdAt: new Date('2026-09-10T18:01:00Z'),
  body: withMarker('live for 3h', 'live'),
  ...over,
});

describe('isRecoveryCandidate', () => {
  const liveFilter = {
    marker: 'live' as const,
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

  it('never adopts another app post that no exclude list knows about', () => {
    // The monthly clips post is not tracked in Redis, so it can never be excluded
    // by id. It carries its own marker, so the live lookup must still reject it.
    const monthly = post({
      id: 't3_monthly',
      title: 'Top 20 Clips of August - HasanAbi',
      body: withMarker('the best of August', 'monthly'),
    });
    expect(isRecoveryCandidate(monthly, liveFilter)).toBe(false);
  });

  it('rejects an unmarked post rather than guessing, even if everything else fits', () => {
    expect(isRecoveryCandidate(post({ body: 'no marker here' }), liveFilter)).toBe(false);
  });

  it('accepts a concluded thread only while it still carries the live marker', () => {
    // The concluding edit rewrites the body without one.
    const concluded = post({ body: 'The stream has concluded.' });
    expect(isRecoveryCandidate(concluded, liveFilter)).toBe(false);
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
    expect(isRecoveryCandidate(post({ title: 'something else' }), clipsFilter)).toBe(false);
  });

  it('accepts a marked recycled post whose title a mod has renamed', () => {
    const clipsFilter = { marker: 'clips' as const, keyword: 'top clips', subredditName: 'Hasan_Piker' };
    const renamed = post({ title: 'Best bits of the week', body: withMarker('clips', 'clips') });
    expect(isRecoveryCandidate(renamed, clipsFilter)).toBe(true);
  });

  it('falls back to the title for a recycled post left unmarked by an older version', () => {
    const clipsFilter = { marker: 'clips' as const, keyword: 'top clips', subredditName: 'Hasan_Piker' };
    const legacy = post({ title: 'Top Clips - HasanAbi', body: 'written before markers existed' });
    expect(isRecoveryCandidate(legacy, clipsFilter)).toBe(true);
  });

  it('renders the marker as an empty link so readers never see it', () => {
    expect(POST_MARKERS.live).toBe('[](#ls-live)');
    expect(withMarker('body', 'live')).toBe('body\n\n[](#ls-live)');
    expect(withMarker(withMarker('body', 'live'), 'live')).toBe('body\n\n[](#ls-live)');
  });

  it('matches the subreddit case-insensitively', () => {
    expect(isRecoveryCandidate(post({ subredditName: 'hasan_piker' }), liveFilter)).toBe(true);
  });
});
