import { describe, it, expect, vi, afterEach } from 'vitest';
import { checkAllStreamStatuses, type RedisClient, type SettingsClient } from '../platforms.js';

/** In-memory stand-in for the Devvit Redis client. */
const fakeRedis = (seed: Record<string, string> = {}) => {
  const store = new Map(Object.entries(seed));
  const client: RedisClient & { store: Map<string, string> } = {
    store,
    get: async (k) => store.get(k),
    set: async (k, v) => void store.set(k, v),
    expire: async () => undefined,
    del: async (k) => void store.delete(k),
  };
  return client;
};

const fakeSettings = (values: Record<string, unknown>): SettingsClient => ({
  get: async <T>(name: string) => values[name] as T | undefined,
});

const twitchConfigured = {
  twitchChannel: 'stickyfox',
  twitchClientId: 'id',
  twitchClientSecret: 'secret',
};

const kickConfigured = {
  kickChannel: 'stickyfox',
  kickClientId: 'id',
  kickClientSecret: 'secret',
};

const response = (status: number, body: unknown = {}) =>
  ({ ok: status >= 200 && status < 300, status, statusText: String(status), json: async () => body }) as Response;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('cached platform tokens', () => {
  it('drops the Twitch token when the API rejects it, so the next tick re-authenticates', async () => {
    const redis = fakeRedis({ twitch_access_token: 'stale-token' });
    vi.stubGlobal('fetch', vi.fn(async () => response(401)));

    await checkAllStreamStatuses({ settings: fakeSettings(twitchConfigured), redis });

    expect(redis.store.has('twitch_access_token')).toBe(false);
  });

  it('drops the Kick token when the API rejects it', async () => {
    const redis = fakeRedis({ kick_access_token: 'stale-token' });
    vi.stubGlobal('fetch', vi.fn(async () => response(401)));

    await checkAllStreamStatuses({ settings: fakeSettings(kickConfigured), redis });

    expect(redis.store.has('kick_access_token')).toBe(false);
  });

  it('keeps a working token cached', async () => {
    const redis = fakeRedis({ twitch_access_token: 'good-token' });
    vi.stubGlobal('fetch', vi.fn(async () => response(200, { data: [] })));

    await checkAllStreamStatuses({ settings: fakeSettings(twitchConfigured), redis });

    expect(redis.store.get('twitch_access_token')).toBe('good-token');
  });
});

describe('checkAllStreamStatuses', () => {
  it('returns nothing when no platform is configured, without calling out', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    const live = await checkAllStreamStatuses({ settings: fakeSettings({}), redis: fakeRedis() });

    expect(live).toEqual([]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('reports a live Twitch stream with its metadata', async () => {
    const redis = fakeRedis({ twitch_access_token: 'good-token' });
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        response(200, {
          data: [
            {
              user_name: 'StickyFox',
              title: 'Building on Devvit',
              game_name: 'Software & Game Dev',
              viewer_count: 1414,
              started_at: '2026-08-26T10:00:00Z',
              thumbnail_url: 'https://static-cdn.jtvnw.net/a-{width}x{height}.jpg',
              user_id: '12345',
            },
          ],
        })
      )
    );

    const live = await checkAllStreamStatuses({
      settings: fakeSettings(twitchConfigured),
      redis,
    });

    expect(live).toHaveLength(1);
    expect(live[0]).toMatchObject({
      platform: 'twitch',
      user_name: 'StickyFox',
      viewer_count: 1414,
      user_id: '12345',
    });
  });

  it('puts the mod-chosen primary platform first when several are live', async () => {
    const redis = fakeRedis({ twitch_access_token: 't', kick_access_token: 'k' });
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (url.includes('api.twitch.tv')) {
          return response(200, { data: [{ user_name: 'fox', started_at: '2026-08-26T10:00:00Z' }] });
        }
        return response(200, {
          is_live: true,
          livestream: { title: 'Kick stream', viewers: 310, created_at: '2026-08-26T11:00:00Z' },
          user: { username: 'fox' },
        });
      })
    );

    const live = await checkAllStreamStatuses({
      settings: fakeSettings({ ...twitchConfigured, ...kickConfigured, primaryPlatform: 'kick' }),
      redis,
    });

    expect(live.map((s) => s.platform)).toEqual(['kick', 'twitch']);
  });
});
