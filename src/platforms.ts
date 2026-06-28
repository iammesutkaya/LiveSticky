export interface UnifiedStreamInfo {
  isLive: boolean;
  platform: 'twitch' | 'youtube' | 'kick';
  user_name: string;
  title: string;
  game_name: string;
  viewer_count: number;
  started_at: string;
  thumbnail_url: string;
  user_id?: string;
}

// ---------------------------------------------------------------------------
// Minimal interfaces so this module can be tested without the Devvit runtime
// ---------------------------------------------------------------------------

export interface RedisClient {
  get(key: string): Promise<string | undefined>;
  set(key: string, value: string): Promise<unknown>;
  expire(key: string, seconds: number): Promise<unknown>;
}

export interface SettingsClient {
  get<T = string>(name: string): Promise<T | undefined>;
}

export interface PlatformContext {
  settings: SettingsClient;
  redis: RedisClient;
}

// ---------------------------------------------------------------------------
// YouTube response shapes (partial — only the fields we use)
// ---------------------------------------------------------------------------

interface YouTubeSearchItem {
  id: { channelId?: string; videoId?: string };
  snippet: {
    title?: string;
    channelTitle?: string;
    thumbnails?: {
      high?: { url?: string };
      medium?: { url?: string };
    };
  };
}

interface YouTubeLiveDetails {
  concurrentViewers?: string;
  actualStartTime?: string;
}

interface YouTubeVideoItem {
  liveStreamingDetails?: YouTubeLiveDetails;
}

// ---------------------------------------------------------------------------
// YouTube channel-ID resolution
// ---------------------------------------------------------------------------

async function resolveYouTubeChannelId(
  channel: string,
  apiKey: string,
  redis: RedisClient
): Promise<string | null> {
  const trimmed = channel.trim();

  if (/^UC[a-zA-Z0-9_-]{22}$/.test(trimmed)) {
    return trimmed;
  }

  let handle = trimmed;
  if (trimmed.includes('youtube.com/')) {
    const parts = trimmed.split('/');
    const lastPart = parts[parts.length - 1];
    if (lastPart && lastPart.startsWith('@')) {
      handle = lastPart;
    } else {
      const channelIdx = parts.indexOf('channel');
      if (channelIdx !== -1 && channelIdx + 1 < parts.length) {
        const potentialId = parts[channelIdx + 1];
        if (potentialId) return potentialId;
      }
    }
  }

  if (!handle.startsWith('@')) {
    handle = `@${handle}`;
  }

  const cacheKey = `yt_resolved_id_${handle.toLowerCase()}`;
  const cachedId = await redis.get(cacheKey);
  if (cachedId) return cachedId;

  try {
    console.log(`YouTube channel ID cache miss. Resolving handle ${handle} via Search API...`);
    const searchUrl = `https://youtube.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(handle)}&type=channel`;
    const res = await fetch(searchUrl, {
      headers: { 'x-goog-api-key': apiKey },
    });
    if (!res.ok) {
      console.error(`YouTube handle resolution request failed: ${res.statusText}`);
      return null;
    }

    const data = await res.json() as { items?: YouTubeSearchItem[] };
    if (data.items && data.items.length > 0) {
      const channelId = data.items[0]?.id.channelId;
      if (channelId) {
        await redis.set(cacheKey, channelId);
        await redis.expire(cacheKey, 2592000); // 30 days
        console.log(`Resolved YouTube handle ${handle} to channel ID: ${channelId}`);
        return channelId;
      }
    }
  } catch (err) {
    console.error(`Error resolving YouTube channel handle:`, err);
  }

  return null;
}

// ---------------------------------------------------------------------------
// YouTube live status
// ---------------------------------------------------------------------------

async function fetchYouTubeStatus(
  channel: string,
  apiKey: string,
  redis: RedisClient
): Promise<UnifiedStreamInfo | null> {
  const channelId = await resolveYouTubeChannelId(channel, apiKey, redis);
  if (!channelId) return null;

  try {
    const liveSearchUrl = `https://youtube.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&eventType=live&type=video`;
    const searchRes = await fetch(liveSearchUrl, {
      headers: { 'x-goog-api-key': apiKey },
    });
    if (!searchRes.ok) {
      console.error(`YouTube Live search request failed: ${searchRes.statusText}`);
      return null;
    }

    const searchData = await searchRes.json() as { items?: YouTubeSearchItem[] };
    if (!searchData.items || searchData.items.length === 0) return null;

    const liveItem = searchData.items[0];
    if (!liveItem) return null;
    const videoId = liveItem.id.videoId;
    const title = liveItem.snippet.title || 'YouTube Livestream';
    const thumbnail =
      liveItem.snippet.thumbnails?.high?.url ??
      liveItem.snippet.thumbnails?.medium?.url ??
      '';
    const userName = liveItem.snippet.channelTitle || channel;

    const videoDetailsUrl = `https://youtube.googleapis.com/youtube/v3/videos?part=liveStreamingDetails,snippet&id=${videoId}`;
    const videoRes = await fetch(videoDetailsUrl, {
      headers: { 'x-goog-api-key': apiKey },
    });
    let viewers = 0;
    let startedAt = new Date().toISOString();

    if (videoRes.ok) {
      const videoData = await videoRes.json() as { items?: YouTubeVideoItem[] };
      const details = videoData.items?.[0]?.liveStreamingDetails;
      if (details) {
        viewers = details.concurrentViewers ? parseInt(details.concurrentViewers, 10) : 0;
        startedAt = details.actualStartTime || startedAt;
      }
    }

    return {
      isLive: true,
      platform: 'youtube',
      user_name: userName,
      title,
      game_name: 'YouTube Live',
      viewer_count: viewers,
      started_at: startedAt,
      thumbnail_url: thumbnail,
    };
  } catch (err) {
    console.error(`Error checking YouTube livestream status:`, err);
  }

  return null;
}

// ---------------------------------------------------------------------------
// Kick live status
// ---------------------------------------------------------------------------

interface KickLivestream {
  title?: string;
  viewers?: string | number;
  created_at?: string;
  category?: { name?: string };
  thumbnail?: { url?: string };
}

interface KickChannelResponse {
  is_live?: boolean;
  livestream?: KickLivestream | null;
  user?: { username?: string };
}

async function fetchKickStatus(
  channel: string,
  clientId: string,
  clientSecret: string,
  redis: RedisClient
): Promise<UnifiedStreamInfo | null> {
  const channelSlug = channel.trim().toLowerCase();
  let accessToken = await redis.get('kick_access_token');

  if (!accessToken) {
    try {
      console.log('Kick API token cache miss. Requesting Kick OAuth access token...');
      const response = await fetch('https://id.kick.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: 'client_credentials',
        }).toString(),
      });

      if (!response.ok) {
        console.error(`Failed to retrieve Kick OAuth token: ${response.statusText}`);
        return null;
      }

      const tokenData = await response.json() as { access_token?: string; expires_in?: number };
      accessToken = tokenData.access_token;
      const expiresIn = tokenData.expires_in ?? 3600;

      if (accessToken) {
        await redis.set('kick_access_token', accessToken);
        await redis.expire('kick_access_token', Math.max(expiresIn - 60, 60));
        console.log('Successfully cached Kick OAuth access token.');
      }
    } catch (tokenErr) {
      console.error('Error fetching Kick OAuth token:', tokenErr);
      return null;
    }
  }

  if (!accessToken) return null;

  try {
    const res = await fetch(`https://api.kick.com/public/v1/channels/${channelSlug}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    });

    if (!res.ok) {
      console.error(`Kick channel API request failed: ${res.statusText}`);
      return null;
    }

    const channelData = await res.json() as KickChannelResponse;
    const isLive = channelData.is_live === true || channelData.livestream != null;
    if (isLive && channelData.livestream) {
      const stream = channelData.livestream;
      const title = stream.title || 'Kick Livestream';
      const viewers =
        stream.viewers !== undefined ? parseInt(String(stream.viewers), 10) : 0;
      const startedAt = stream.created_at || new Date().toISOString();
      const gameName = stream.category?.name || 'Kick Stream';
      const thumbnail = stream.thumbnail?.url || '';
      const userName = channelData.user?.username || channel;

      return {
        isLive: true,
        platform: 'kick',
        user_name: userName,
        title,
        game_name: gameName,
        viewer_count: viewers,
        started_at: startedAt,
        thumbnail_url: thumbnail,
      };
    }
  } catch (err) {
    console.error('Error checking Kick livestream status:', err);
  }

  return null;
}

// ---------------------------------------------------------------------------
// Twitch — shared token management (exported so livesticky.ts can reuse it)
// ---------------------------------------------------------------------------

interface TwitchTokenResponse {
  access_token?: string;
}

/**
 * Returns a valid Twitch App Access Token, fetching a new one if the cache is
 * empty. Shared by both the stream-status poller and the post-stream highlights
 * path so there is exactly one place that manages Twitch credentials.
 */
export async function getOrRefreshTwitchToken(
  clientId: string,
  clientSecret: string,
  redis: RedisClient
): Promise<string | null> {
  const cached = await redis.get('twitch_access_token');
  if (cached) return cached;

  try {
    console.log('Twitch token cache miss. Fetching new Twitch Access Token...');
    const tokenRes = await fetch(
      'https://id.twitch.tv/oauth2/token',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: 'client_credentials',
        }).toString(),
      }
    );

    if (!tokenRes.ok) {
      console.error('Failed to get Twitch Token');
      return null;
    }

    const tokenData = await tokenRes.json() as TwitchTokenResponse;
    const token = tokenData.access_token;
    if (!token) {
      console.error('Twitch Access Token not found in response');
      return null;
    }

    await redis.set('twitch_access_token', token);
    await redis.expire('twitch_access_token', 86400);
    console.log('Successfully cached Twitch Access Token.');
    return token;
  } catch (err) {
    console.error('Error fetching Twitch token:', err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Twitch live status
// ---------------------------------------------------------------------------

interface TwitchStreamData {
  user_name?: string;
  title?: string;
  game_name?: string;
  viewer_count?: number;
  started_at?: string;
  thumbnail_url?: string;
  user_id?: string;
}

interface TwitchStreamsResponse {
  data?: TwitchStreamData[];
}

async function fetchTwitchStatus(
  channel: string,
  clientId: string,
  clientSecret: string,
  redis: RedisClient
): Promise<UnifiedStreamInfo | null> {
  const channelName = channel.trim().toLowerCase();
  const token = await getOrRefreshTwitchToken(clientId, clientSecret, redis);
  if (!token) return null;

  try {
    const streamRes = await fetch(
      `https://api.twitch.tv/helix/streams?user_login=${channelName}`,
      {
        headers: {
          'Client-ID': clientId,
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!streamRes.ok) {
      console.error(`Failed to fetch Twitch stream status: ${streamRes.statusText}`);
      return null;
    }

    const streamData = await streamRes.json() as TwitchStreamsResponse;
    const isLive = streamData.data && streamData.data.length > 0;
    if (isLive && streamData.data) {
      const info = streamData.data[0];
      if (!info) return null;
      return {
        isLive: true,
        platform: 'twitch',
        user_name: info.user_name || channel,
        title: info.title || 'Twitch Stream',
        game_name: info.game_name || 'Just Chatting',
        viewer_count: info.viewer_count ?? 0,
        started_at: info.started_at || new Date().toISOString(),
        thumbnail_url: info.thumbnail_url || '',
        user_id: info.user_id,
      };
    }
  } catch (err) {
    console.error('Error checking Twitch stream status:', err);
  }

  return null;
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * Polls status across configured platforms in order of priority: Twitch > YouTube > Kick
 */
export async function checkStreamStatus(
  context: PlatformContext
): Promise<UnifiedStreamInfo | null> {
  const [
    twitchChannel,
    twitchClientId,
    twitchClientSecret,
    youtubeChannel,
    youtubeApiKey,
    kickChannel,
    kickClientId,
    kickClientSecret,
  ] = await Promise.all([
    context.settings.get('twitchChannel') as Promise<string | undefined>,
    context.settings.get('twitchClientId') as Promise<string | undefined>,
    context.settings.get('twitchClientSecret') as Promise<string | undefined>,
    context.settings.get('youtubeChannel') as Promise<string | undefined>,
    context.settings.get('youtubeApiKey') as Promise<string | undefined>,
    context.settings.get('kickChannel') as Promise<string | undefined>,
    context.settings.get('kickClientId') as Promise<string | undefined>,
    context.settings.get('kickClientSecret') as Promise<string | undefined>,
  ]);

  if (twitchChannel && twitchClientId && twitchClientSecret) {
    const twitchStatus = await fetchTwitchStatus(
      twitchChannel, twitchClientId, twitchClientSecret, context.redis
    );
    if (twitchStatus) return twitchStatus;
  }

  if (youtubeChannel && youtubeApiKey) {
    const youtubeStatus = await fetchYouTubeStatus(youtubeChannel, youtubeApiKey, context.redis);
    if (youtubeStatus) return youtubeStatus;
  }

  if (kickChannel && kickClientId && kickClientSecret) {
    const kickStatus = await fetchKickStatus(
      kickChannel, kickClientId, kickClientSecret, context.redis
    );
    if (kickStatus) return kickStatus;
  }

  return null;
}
