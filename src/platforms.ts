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
  del(key: string): Promise<unknown>;
}

export interface SettingsClient {
  get<T = string>(name: string): Promise<T | undefined>;
}

export interface PlatformContext {
  settings: SettingsClient;
  redis: RedisClient;
  onError?: (platform: string, msg: string) => Promise<void>;
}

/**
 * Every upstream call goes through here so a hung platform API can never hold
 * the 2-minute cron open. 10s is generous for all three providers.
 */
export const FETCH_TIMEOUT_MS = 10000;

export const fetchWithTimeout = (
  input: string,
  init: RequestInit = {}
): Promise<Response> =>
  fetch(input, { ...init, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });

export function sanitizeHandle(input: string | string[] | unknown, platformUrl: string): string {
  if (!input) return '';
  const rawStr = Array.isArray(input) ? String(input[0] ?? '') : String(input);
  let clean = rawStr.trim().toLowerCase();
  // Strip trailing slashes
  while (clean.endsWith('/')) {
    clean = clean.slice(0, -1);
  }
  if (clean.includes(platformUrl)) {
    const parts = clean.split(platformUrl)[1]?.split('/');
    if (parts && parts[0]) return parts[0];
  }
  return clean;
}

// ---------------------------------------------------------------------------
// YouTube response shapes (partial - only the fields we use)
// ---------------------------------------------------------------------------

interface YouTubeChannelContentItem {
  id?: string;
  contentDetails?: { relatedPlaylists?: { uploads?: string } };
}

interface YouTubePlaylistItem {
  contentDetails?: { videoId?: string };
}

interface YouTubeVideoItem {
  id?: string;
  snippet?: {
    title?: string;
    channelTitle?: string;
    liveBroadcastContent?: string;
    thumbnails?: {
      high?: { url?: string };
      medium?: { url?: string };
    };
  };
  liveStreamingDetails?: {
    concurrentViewers?: string;
    actualStartTime?: string;
    actualEndTime?: string;
  };
}

// ---------------------------------------------------------------------------
// YouTube channel-ID resolution
// ---------------------------------------------------------------------------

/**
 * Calculates seconds until midnight Pacific Time (PST/PDT), when YouTube's daily API quota resets.
 * Defaults to 12 hours (43200 seconds) if calculation fails.
 */
function getSecondsUntilYouTubeQuotaReset(): number {
  try {
    const now = new Date();
    const nowPtString = now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' });
    const nowPt = new Date(nowPtString);
    const nextMidnightPt = new Date(nowPt);
    nextMidnightPt.setHours(24, 0, 0, 0);
    const diffSeconds = Math.floor((nextMidnightPt.getTime() - nowPt.getTime()) / 1000);
    if (diffSeconds > 0 && diffSeconds <= 86400) {
      return diffSeconds;
    }
  } catch (err) {
    console.error('Error calculating YouTube quota reset time:', err);
  }
  return 43200; // 12 hours fallback
}

export async function isYouTubeQuotaBlocked(redis: RedisClient): Promise<boolean> {
  const blocked = await redis.get('yt_quota_blocked');
  return blocked === 'true';
}

export async function setYouTubeQuotaBlocked(redis: RedisClient): Promise<void> {
  const ttl = getSecondsUntilYouTubeQuotaReset();
  await redis.set('yt_quota_blocked', 'true');
  await redis.expire('yt_quota_blocked', ttl);
  console.warn(`YouTube API quota marked blocked in Redis for ${ttl} seconds.`);
}

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
    // Remove trailing slash if any to avoid empty last parts
    const cleanUrl = trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed;
    const parts = cleanUrl.split('/');
    
    // Check if any part starts with '@'
    const handlePart = parts.find(p => p.startsWith('@'));
    if (handlePart) {
      handle = handlePart;
    } else {
      const channelIdx = parts.indexOf('channel');
      if (channelIdx !== -1 && channelIdx + 1 < parts.length) {
        const potentialId = parts[channelIdx + 1];
        if (potentialId) return potentialId;
      } else {
        // Fallback to the last part if it's not a channel URL
        const lastPart = parts[parts.length - 1];
        if (lastPart) handle = lastPart;
      }
    }
  }

  if (!handle.startsWith('@')) {
    handle = `@${handle}`;
  }

  const cacheKey = `yt_resolved_id_${handle.toLowerCase()}`;
  const cachedId = await redis.get(cacheKey);
  if (cachedId) {
    if (cachedId === 'NOT_FOUND') return null;
    return cachedId;
  }

  if (await isYouTubeQuotaBlocked(redis)) return null;

  // Cheap path first: channels.list?forHandle costs 1 quota unit, vs 100 for
  // search.list. Most handles resolve here, so search becomes a rare fallback.
  try {
    console.log(`YouTube channel ID cache miss. Resolving handle ${handle} via forHandle (1 unit)...`);
    const url = `https://youtube.googleapis.com/youtube/v3/channels?part=id&forHandle=${encodeURIComponent(handle)}`;
    const res = await fetchWithTimeout(url, { headers: { 'x-goog-api-key': apiKey } });
    if (res.status === 403) {
      await setYouTubeQuotaBlocked(redis);
      return null;
    }
    if (res.ok) {
      const data = await res.json() as { items?: Array<{ id?: string }> };
      const channelId = data.items?.[0]?.id;
      if (channelId) {
        await redis.set(cacheKey, channelId);
        await redis.expire(cacheKey, 2592000); // 30 days
        console.log(`Resolved YouTube handle ${handle} to channel ID via forHandle: ${channelId}`);
        return channelId;
      }
    }
  } catch (err) {
    console.error('YouTube forHandle resolution failed, falling back to search:', err);
  }

  // Fallback: search.list (100 quota units) - only when forHandle didn't match
  // (e.g. the setting holds a display name rather than an exact @handle).
  try {
    console.log(`forHandle did not resolve ${handle}. Falling back to Search API (100 units)...`);
    const searchUrl = `https://youtube.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(handle)}&type=channel`;
    const res = await fetchWithTimeout(searchUrl, {
      headers: { 'x-goog-api-key': apiKey },
    });
    if (res.status === 403) {
      await setYouTubeQuotaBlocked(redis);
      return null;
    }
    if (!res.ok) {
      console.error(`YouTube handle resolution request failed: ${res.statusText}`);
      await redis.set(cacheKey, 'NOT_FOUND');
      await redis.expire(cacheKey, 21600); // 6 hours
      return null;
    }

    const data = await res.json() as { items?: Array<{ id?: { channelId?: string } }> };
    const channelId = data.items?.[0]?.id?.channelId;
    if (channelId) {
      await redis.set(cacheKey, channelId);
      await redis.expire(cacheKey, 2592000); // 30 days
      console.log(`Resolved YouTube handle ${handle} to channel ID via search: ${channelId}`);
      return channelId;
    }
  } catch (err) {
    console.error(`Error resolving YouTube channel handle:`, err);
  }

  // Cache NOT_FOUND for 6 hours so we don't repeat failed search lookups every 2 minutes
  await redis.set(cacheKey, 'NOT_FOUND');
  await redis.expire(cacheKey, 21600); // 6 hours
  return null;
}

/**
 * Resolves a channel to its "uploads" playlist ID (where live broadcasts also
 * appear). Cached 30 days in Redis since it never changes for a channel. Costs
 * 1 quota unit on a cache miss.
 */
async function resolveYouTubeUploadsPlaylist(
  channel: string,
  apiKey: string,
  redis: RedisClient
): Promise<string | null> {
  const channelId = await resolveYouTubeChannelId(channel, apiKey, redis);
  if (!channelId) return null;

  const cacheKey = `yt_uploads_${channelId}`;
  const cached = await redis.get(cacheKey);
  if (cached) {
    if (cached === 'NOT_FOUND') return null;
    return cached;
  }

  if (await isYouTubeQuotaBlocked(redis)) return null;

  try {
    const url = `https://youtube.googleapis.com/youtube/v3/channels?part=contentDetails&id=${channelId}`;
    const res = await fetchWithTimeout(url, { headers: { 'x-goog-api-key': apiKey } });
    if (res.status === 403) {
      await setYouTubeQuotaBlocked(redis);
      return null;
    }
    if (!res.ok) {
      console.error(`YouTube uploads-playlist request failed: ${res.statusText}`);
      await redis.set(cacheKey, 'NOT_FOUND');
      await redis.expire(cacheKey, 21600); // 6 hours
      return null;
    }
    const data = await res.json() as { items?: YouTubeChannelContentItem[] };
    const uploads = data.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
    if (uploads) {
      await redis.set(cacheKey, uploads);
      await redis.expire(cacheKey, 2592000); // 30 days
      return uploads;
    }
  } catch (err) {
    console.error('Error resolving YouTube uploads playlist:', err);
  }

  await redis.set(cacheKey, 'NOT_FOUND');
  await redis.expire(cacheKey, 21600); // 6 hours
  return null;
}

// ---------------------------------------------------------------------------
// YouTube live status
// ---------------------------------------------------------------------------

async function fetchYouTubeStatus(
  channel: string,
  apiKey: string,
  redis: RedisClient,
  onError?: (platform: string, msg: string) => Promise<void>
): Promise<UnifiedStreamInfo | null> {
  // A live broadcast appears in the channel's public uploads playlist, so we can
  // detect it with two 1-unit calls (playlistItems + videos) instead of the
  // 100-unit search.list call. ~2 quota units per poll vs ~100.
  if (await isYouTubeQuotaBlocked(redis)) return null;

  const uploadsPlaylist = await resolveYouTubeUploadsPlaylist(channel, apiKey, redis);
  if (!uploadsPlaylist) return null;

  try {
    // 1 unit: the most recent uploads - a live stream sits at the top.
    const plUrl = `https://youtube.googleapis.com/youtube/v3/playlistItems?part=contentDetails&maxResults=5&playlistId=${uploadsPlaylist}`;
    const plRes = await fetchWithTimeout(plUrl, { headers: { 'x-goog-api-key': apiKey } });
    if (plRes.status === 403) {
      console.error('YouTube API quota exceeded or forbidden (403).');
      await setYouTubeQuotaBlocked(redis);
      if (onError) await onError('YouTube', 'YouTube API quota exceeded (HTTP 403). LiveSticky cannot fetch your stream status until your quota resets.');
      return null;
    }
    if (!plRes.ok) {
      console.error(`YouTube playlistItems request failed: ${plRes.statusText}`);
      return null;
    }
    const plData = await plRes.json() as { items?: YouTubePlaylistItem[] };
    const videoIds = (plData.items ?? [])
      .map((i) => i.contentDetails?.videoId)
      .filter((id): id is string => !!id);
    if (videoIds.length === 0) return null;

    // 1 unit: resolve live status + viewer details for those candidate videos.
    const vUrl = `https://youtube.googleapis.com/youtube/v3/videos?part=snippet,liveStreamingDetails&id=${videoIds.join(',')}`;
    const vRes = await fetchWithTimeout(vUrl, { headers: { 'x-goog-api-key': apiKey } });
    if (!vRes.ok) {
      if (vRes.status === 403) {
        console.error('YouTube API quota exceeded or forbidden (403).');
        await setYouTubeQuotaBlocked(redis);
        if (onError) await onError('YouTube', 'YouTube API quota exceeded (HTTP 403). LiveSticky cannot fetch your stream status until your quota resets.');
      }
      return null;
    }
    const vData = await vRes.json() as { items?: YouTubeVideoItem[] };

    // liveBroadcastContent flips to 'none' once a stream ends (the VOD remains
    // in uploads), so this cleanly excludes finished streams.
    const liveItem = (vData.items ?? []).find(
      (i) => i.snippet?.liveBroadcastContent === 'live' && !i.liveStreamingDetails?.actualEndTime
    );
    if (!liveItem) return null;

    const videoId = liveItem.id;
    const staticThumbnail =
      liveItem.snippet?.thumbnails?.high?.url ??
      liveItem.snippet?.thumbnails?.medium?.url ??
      '';
    const thumbnail = videoId ? `https://i.ytimg.com/vi/${videoId}/hqlive.jpg` : staticThumbnail;
    const userName = liveItem.snippet?.channelTitle || channel;
    const title = liveItem.snippet?.title || '';
    const details = liveItem.liveStreamingDetails;
    const parsedViewers = details?.concurrentViewers ? parseInt(details.concurrentViewers, 10) : 0;
    const viewers = Number.isNaN(parsedViewers) ? 0 : parsedViewers;
    const startedAt = details?.actualStartTime || new Date().toISOString();

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
  redis: RedisClient,
  onError?: (platform: string, msg: string) => Promise<void>
): Promise<UnifiedStreamInfo | null> {
  const channelSlug = sanitizeHandle(channel, 'kick.com/');
  let accessToken = await redis.get('kick_access_token');

  if (!accessToken) {
    try {
      console.log('Kick API token cache miss. Requesting Kick OAuth access token...');
      const response = await fetchWithTimeout('https://id.kick.com/oauth/token', {
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
    const res = await fetchWithTimeout(`https://api.kick.com/public/v1/channels/${channelSlug}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    });

    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        // Drop the cached token so the next tick re-authenticates instead of
        // replaying a dead one until its TTL expires.
        await redis.del('kick_access_token');
        console.error(`Kick API Unauthorized (HTTP ${res.status}). Invalidated cached token.`);
        if (onError) await onError('Kick', `Kick API Unauthorized (HTTP ${res.status}). Please check your Kick Client ID and Secret in LiveSticky settings.`);
      }
      return null;
    }

    const channelData = await res.json() as KickChannelResponse;
    const isLive = channelData.is_live === true || channelData.livestream != null;
    if (isLive && channelData.livestream) {
      const stream = channelData.livestream;
      const title = stream.title || 'Kick Livestream';
      const parsedViewers = stream.viewers !== undefined ? parseInt(String(stream.viewers), 10) : 0;
      const viewers = Number.isNaN(parsedViewers) ? 0 : parsedViewers;
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
// Twitch - shared token management (exported so livesticky.ts can reuse it)
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
  redis: RedisClient,
  onError?: (platform: string, msg: string) => Promise<void>
): Promise<string | null> {
  const cached = await redis.get('twitch_access_token');
  if (cached) return cached;

  try {
    console.log('Twitch token cache miss. Fetching new Twitch Access Token...');
    const tokenRes = await fetchWithTimeout(
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
      console.error(`Failed to refresh Twitch token: ${tokenRes.status}`);
      if (tokenRes.status === 401 || tokenRes.status === 403) {
        if (onError) await onError('Twitch', `Twitch Auth Error (HTTP ${tokenRes.status}). Please verify your Twitch Client ID and Client Secret in LiveSticky settings.`);
      }
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
  redis: RedisClient,
  onError?: (platform: string, msg: string) => Promise<void>
): Promise<UnifiedStreamInfo | null> {
  const channelName = sanitizeHandle(channel, 'twitch.tv/');
  try {
    const token = await getOrRefreshTwitchToken(clientId, clientSecret, redis, onError);
    if (!token) return null;

    const streamRes = await fetchWithTimeout(
      `https://api.twitch.tv/helix/streams?user_login=${channelName}`,
      {
        headers: {
          'Client-ID': clientId,
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!streamRes.ok) {
      if (streamRes.status === 401 || streamRes.status === 403) {
        console.warn(`[Twitch] Token returned ${streamRes.status}. Invalidating cached token.`);
        await redis.del('twitch_access_token');
      }
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
 * Polls EVERY configured platform in parallel and returns all that are
 * currently live, ordered Twitch > YouTube > Kick.
 *
 * This is used by the multistream dashboard, which needs the full set of
 * simultaneously-live platforms so viewers can choose which one to watch
 * (rather than short-circuiting at the first live platform).
 *
 * NOTE: when a YouTube channel is configured this calls the YouTube Data API on
 * every check (~100 quota units), even if another platform is already live - 
 * that's the cost of knowing whether YouTube is *also* live for multistreaming.
 */
export async function checkAllStreamStatuses(
  context: PlatformContext
): Promise<UnifiedStreamInfo[]> {
  const [
    rawTwitchChannel,
    rawTwitchClientId,
    rawTwitchClientSecret,
    rawYoutubeChannel,
    rawYoutubeApiKey,
    rawKickChannel,
    rawKickClientId,
    rawKickClientSecret,
    primaryPlatformRaw,
  ] = await Promise.all([
    context.settings.get('twitchChannel'),
    context.settings.get('twitchClientId'),
    context.settings.get('twitchClientSecret'),
    context.settings.get('youtubeChannel'),
    context.settings.get('youtubeApiKey'),
    context.settings.get('kickChannel'),
    context.settings.get('kickClientId'),
    context.settings.get('kickClientSecret'),
    context.settings.get('primaryPlatform'),
  ]);

  const normalizeStr = (val: unknown): string => {
    if (!val) return '';
    if (Array.isArray(val)) return String(val[0] ?? '').trim();
    return String(val).trim();
  };

  const twitchChannel = normalizeStr(rawTwitchChannel);
  const twitchClientId = normalizeStr(rawTwitchClientId);
  const twitchClientSecret = normalizeStr(rawTwitchClientSecret);
  const youtubeChannel = normalizeStr(rawYoutubeChannel);
  const youtubeApiKey = normalizeStr(rawYoutubeApiKey);
  const kickChannel = normalizeStr(rawKickChannel);
  const kickClientId = normalizeStr(rawKickClientId);
  const kickClientSecret = normalizeStr(rawKickClientSecret);

  const primaryPlatform = normalizeStr(primaryPlatformRaw);

  // Build the checks in priority order so the resulting array stays
  // Twitch > YouTube > Kick after the nulls are filtered out.
  const checks: Array<Promise<UnifiedStreamInfo | null>> = [];

  if (twitchChannel && twitchClientId && twitchClientSecret) {
    checks.push(fetchTwitchStatus(twitchChannel, twitchClientId, twitchClientSecret, context.redis, context.onError));
  }
  if (youtubeChannel && youtubeApiKey) {
    checks.push(fetchYouTubeStatus(youtubeChannel, youtubeApiKey, context.redis, context.onError));
  }
  if (kickChannel && kickClientId && kickClientSecret) {
    checks.push(fetchKickStatus(kickChannel, kickClientId, kickClientSecret, context.redis, context.onError));
  }

  const results = await Promise.all(checks);
  const validResults = results.filter((r): r is UnifiedStreamInfo => r !== null);
  
  if (primaryPlatform) {
    validResults.sort((a, b) => {
      // If a is the primary platform, it comes first
      if (a.platform.toLowerCase() === primaryPlatform.toLowerCase()) return -1;
      // If b is the primary platform, it comes first
      if (b.platform.toLowerCase() === primaryPlatform.toLowerCase()) return 1;
      // Otherwise, maintain original order (Twitch > YouTube > Kick)
      return 0;
    });
  }

  return validResults;
}

// ---------------------------------------------------------------------------
// Channel avatar refresh - cached 12 hours in Redis
// ---------------------------------------------------------------------------

interface TwitchUsersResponse {
  data?: Array<{ profile_image_url?: string }>;
}

interface YouTubeChannelItem {
  snippet?: { thumbnails?: { high?: { url?: string }; medium?: { url?: string } } };
}

interface YouTubeChannelsResponse {
  items?: YouTubeChannelItem[];
}

interface KickChannelImagesResponse {
  user?: { profile_pic?: string };
}

const IMAGE_TTL = 43200; // 12 hours

/**
 * Fetches and caches the avatar URL for the active platform.
 * Skips the API call if the cached avatar key is still alive in Redis.
 * Priority: Twitch > YouTube > Kick.
 */
export async function refreshChannelImages(context: PlatformContext): Promise<void> {
  const cached = await context.redis.get('dashboard_avatar_url');
  if (cached !== undefined) return; // still within TTL

  const [
    twitchChannel, twitchClientId, twitchClientSecret,
    youtubeChannel, youtubeApiKey,
    kickChannel, kickClientId, kickClientSecret,
    customAvatarUrl,
    primaryPlatformRaw,
  ] = await Promise.all([
    context.settings.get('twitchChannel') as Promise<string | undefined>,
    context.settings.get('twitchClientId') as Promise<string | undefined>,
    context.settings.get('twitchClientSecret') as Promise<string | undefined>,
    context.settings.get('youtubeChannel') as Promise<string | undefined>,
    context.settings.get('youtubeApiKey') as Promise<string | undefined>,
    context.settings.get('kickChannel') as Promise<string | undefined>,
    context.settings.get('kickClientId') as Promise<string | undefined>,
    context.settings.get('kickClientSecret') as Promise<string | undefined>,
    context.settings.get('customAvatarUrl') as Promise<string | undefined>,
    context.settings.get('primaryPlatform') as Promise<unknown>,
  ]);

  const primaryPlatform = Array.isArray(primaryPlatformRaw)
    ? (primaryPlatformRaw[0] as string | undefined)
    : (primaryPlatformRaw as string | undefined);

  let avatarUrl = customAvatarUrl?.trim() ?? '';

  const fetchOrder = primaryPlatform === 'YouTube' ? ['youtube', 'twitch', 'kick']
    : primaryPlatform === 'Kick' ? ['kick', 'twitch', 'youtube']
    : ['twitch', 'youtube', 'kick'];

  if (!avatarUrl) {
    for (const p of fetchOrder) {
      if (p === 'twitch' && twitchChannel && twitchClientId && twitchClientSecret) {
        try {
          const token = await getOrRefreshTwitchToken(twitchClientId, twitchClientSecret, context.redis);
          if (token) {
            const res = await fetchWithTimeout(
              `https://api.twitch.tv/helix/users?login=${encodeURIComponent(twitchChannel.trim().toLowerCase())}`,
              { headers: { 'Client-ID': twitchClientId, Authorization: `Bearer ${token}` } }
            );
            if (res.ok) {
              const data = await res.json() as TwitchUsersResponse;
              const user = data.data?.[0];
              avatarUrl = user?.profile_image_url ?? '';
            }
          }
        } catch (err) {
          console.error('Failed to fetch Twitch user images:', err);
        }
        if (avatarUrl) break;
      } else if (p === 'youtube' && youtubeChannel && youtubeApiKey) {
        try {
          if (!(await isYouTubeQuotaBlocked(context.redis))) {
            const channelId = await resolveYouTubeChannelId(youtubeChannel, youtubeApiKey, context.redis);
            if (channelId) {
              const res = await fetchWithTimeout(
                `https://youtube.googleapis.com/youtube/v3/channels?part=snippet&id=${channelId}`,
                { headers: { 'x-goog-api-key': youtubeApiKey } }
              );
              if (res.status === 403) {
                await setYouTubeQuotaBlocked(context.redis);
              } else if (res.ok) {
                const data = await res.json() as YouTubeChannelsResponse;
                const item = data.items?.[0];
                avatarUrl = item?.snippet?.thumbnails?.high?.url
                  ?? item?.snippet?.thumbnails?.medium?.url
                  ?? '';
              }
            }
          }
        } catch (err) {
          console.error('Failed to fetch YouTube channel images:', err);
        }
        if (avatarUrl) break;
      } else if (p === 'kick' && kickChannel && kickClientId && kickClientSecret) {
        try {
          let accessToken = await context.redis.get('kick_access_token');
          if (!accessToken) {
            const tokenRes = await fetchWithTimeout('https://id.kick.com/oauth/token', {
              method: 'POST',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              body: new URLSearchParams({
                client_id: kickClientId,
                client_secret: kickClientSecret,
                grant_type: 'client_credentials',
              }).toString(),
            });
            if (tokenRes.ok) {
              const tokenData = await tokenRes.json() as { access_token?: string; expires_in?: number };
              if (tokenData.access_token) {
                accessToken = tokenData.access_token;
                const expiresIn = tokenData.expires_in ?? 3600;
                await context.redis.set('kick_access_token', accessToken);
                await context.redis.expire('kick_access_token', Math.max(expiresIn - 60, 60));
              }
            }
          }
          if (accessToken) {
            const res = await fetchWithTimeout(
              `https://api.kick.com/public/v1/channels/${encodeURIComponent(kickChannel.trim().toLowerCase())}`,
              { headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' } }
            );
            if (res.ok) {
              const data = await res.json() as KickChannelImagesResponse;
              avatarUrl = data.user?.profile_pic ?? '';
            }
          }
        } catch (err) {
          console.error('Failed to fetch Kick channel images:', err);
        }
        if (avatarUrl) break;
      }
    }

  }

  // Write avatar key with TTL: 12h on success, 5 min on failure so the next cron
  // tick retries quickly rather than waiting the full cache window.
  const avatarTtl = avatarUrl ? IMAGE_TTL : 300;
  await Promise.all([
    context.redis.set('dashboard_avatar_url', avatarUrl),
    context.redis.expire('dashboard_avatar_url', avatarTtl),
  ]);
}
