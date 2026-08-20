import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  isYouTubeQuotaBlocked,
  setYouTubeQuotaBlocked,
  checkAllStreamStatuses,
} from '../platforms.js';

describe('YouTube Quota & Circuit Breaker', () => {
  let store: Map<string, string>;
  let mockRedis: any;

  beforeEach(() => {
    store = new Map<string, string>();
    mockRedis = {
      get: vi.fn(async (key: string) => store.get(key)),
      set: vi.fn(async (key: string, val: string) => {
        store.set(key, val);
      }),
      del: vi.fn(async (key: string) => {
        store.delete(key);
      }),
      expire: vi.fn(async () => {}),
    };
    vi.restoreAllMocks();
  });

  it('correctly reports YouTube quota blocked state', async () => {
    expect(await isYouTubeQuotaBlocked(mockRedis)).toBe(false);

    await setYouTubeQuotaBlocked(mockRedis);

    expect(store.get('yt_quota_blocked')).toBe('true');
    expect(await isYouTubeQuotaBlocked(mockRedis)).toBe(true);
    expect(mockRedis.expire).toHaveBeenCalled();
  });

  it('skips YouTube status API calls when quota is marked blocked', async () => {
    await setYouTubeQuotaBlocked(mockRedis);

    const mockSettings = {
      get: vi.fn(async (key: string) => {
        if (key === 'youtubeChannel') return 'TestChannel';
        if (key === 'youtubeApiKey') return 'AIzaSyFakeKey';
        return undefined;
      }),
    };

    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    const results = await checkAllStreamStatuses({
      settings: mockSettings as any,
      redis: mockRedis,
    });

    expect(results).toEqual([]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
