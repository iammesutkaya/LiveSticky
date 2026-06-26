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

/**
 * Resolves a YouTube handle, URL, or custom name to a YouTube Channel ID (starts with UC...)
 */
async function resolveYouTubeChannelId(
  channel: string,
  apiKey: string,
  redis: any
): Promise<string | null> {
  const trimmed = channel.trim();

  // If it's already a channel ID (e.g. UC...)
  if (/^UC[a-zA-Z0-9_-]{22}$/.test(trimmed)) {
    return trimmed;
  }

  // Extract handle from URL or direct input
  let handle = trimmed;
  if (trimmed.includes('youtube.com/')) {
    const parts = trimmed.split('/');
    const lastPart = parts[parts.length - 1];
    if (lastPart && lastPart.startsWith('@')) {
      handle = lastPart;
    } else {
      // Look for channel ID in URL parts
      const channelIdx = parts.indexOf('channel');
      if (channelIdx !== -1 && channelIdx + 1 < parts.length) {
        const potentialId = parts[channelIdx + 1];
        if (potentialId) {
          return potentialId;
        }
      }
    }
  }

  if (!handle.startsWith('@')) {
    handle = `@${handle}`;
  }

  const cacheKey = `yt_resolved_id_${handle.toLowerCase()}`;
  const cachedId = await redis.get(cacheKey);
  if (cachedId) {
    return cachedId;
  }

  try {
    console.log(`YouTube channel ID cache miss. Resolving handle ${handle} via Search API...`);
    const searchUrl = `https://youtube.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(handle)}&type=channel&key=${apiKey}`;
    const res = await fetch(searchUrl);
    if (!res.ok) {
      console.error(`YouTube handle resolution request failed: ${res.statusText}`);
      return null;
    }

    const data = await res.json();
    if (data.items && data.items.length > 0) {
      const channelId = data.items[0].id.channelId;
      if (channelId) {
        // Cache the channel ID for 30 days (2592000 seconds)
        await redis.set(cacheKey, channelId);
        await redis.expire(cacheKey, 2592000);
        console.log(`Resolved YouTube handle ${handle} to channel ID: ${channelId}`);
        return channelId;
      }
    }
  } catch (err) {
    console.error(`Error resolving YouTube channel handle:`, err);
  }

  return null;
}

/**
 * Checks YouTube Live status via Data API v3
 */
async function fetchYouTubeStatus(
  channel: string,
  apiKey: string,
  redis: any
): Promise<UnifiedStreamInfo | null> {
  const channelId = await resolveYouTubeChannelId(channel, apiKey, redis);
  if (!channelId) {
    return null;
  }

  try {
    // Check if channel is live
    const liveSearchUrl = `https://youtube.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&eventType=live&type=video&key=${apiKey}`;
    const searchRes = await fetch(liveSearchUrl);
    if (!searchRes.ok) {
      console.error(`YouTube Live search request failed: ${searchRes.statusText}`);
      return null;
    }

    const searchData = await searchRes.json();
    if (!searchData.items || searchData.items.length === 0) {
      return null;
    }

    const liveItem = searchData.items[0];
    const videoId = liveItem.id.videoId;
    const title = liveItem.snippet.title || 'YouTube Livestream';
    const thumbnail = liveItem.snippet.thumbnails?.high?.url || liveItem.snippet.thumbnails?.medium?.url || '';
    const userName = liveItem.snippet.channelTitle || channel;

    // Fetch live details (viewers and actual start time)
    const videoDetailsUrl = `https://youtube.googleapis.com/youtube/v3/videos?part=liveStreamingDetails,snippet&id=${videoId}&key=${apiKey}`;
    const videoRes = await fetch(videoDetailsUrl);
    let viewers = 0;
    let startedAt = new Date().toISOString();

    if (videoRes.ok) {
      const videoData = await videoRes.json();
      if (videoData.items && videoData.items.length > 0) {
        const details = videoData.items[0].liveStreamingDetails;
        if (details) {
          viewers = details.concurrentViewers ? parseInt(details.concurrentViewers, 10) : 0;
          startedAt = details.actualStartTime || startedAt;
        }
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

/**
 * Checks Kick stream status via Kick's official API
 */
async function fetchKickStatus(
  channel: string,
  clientId: string,
  clientSecret: string,
  redis: any
): Promise<UnifiedStreamInfo | null> {
  const channelSlug = channel.trim().toLowerCase();
  let accessToken = await redis.get('kick_access_token');

  if (!accessToken) {
    try {
      console.log('Kick API token cache miss. Requesting Kick OAuth access token...');
      const tokenUrl = 'https://id.kick.com/oauth/token';
      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
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

      const tokenData = await response.json();
      accessToken = tokenData.access_token;
      const expiresIn = tokenData.expires_in || 3600;

      if (accessToken) {
        // Cache Kick token in Redis, expiring 1 minute early
        await redis.set('kick_access_token', accessToken);
        await redis.expire('kick_access_token', Math.max(expiresIn - 60, 60));
        console.log('Successfully cached Kick OAuth access token.');
      }
    } catch (tokenErr) {
      console.error('Error fetching Kick OAuth token:', tokenErr);
      return null;
    }
  }

  try {
    const channelUrl = `https://api.kick.com/public/v1/channels/${channelSlug}`;
    const res = await fetch(channelUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
      },
    });

    if (!res.ok) {
      console.error(`Kick channel API request failed: ${res.statusText}`);
      return null;
    }

    const channelData = await res.json();
    const isLive = channelData.is_live === true || channelData.livestream !== null;
    if (isLive && channelData.livestream) {
      const stream = channelData.livestream;
      const title = stream.title || 'Kick Livestream';
      const viewers = stream.viewers !== undefined ? parseInt(stream.viewers, 10) : 0;
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

/**
 * Checks Twitch stream status via Helix API
 */
async function fetchTwitchStatus(
  channel: string,
  clientId: string,
  clientSecret: string,
  redis: any
): Promise<UnifiedStreamInfo | null> {
  const channelName = channel.trim().toLowerCase();
  let token = await redis.get('twitch_access_token');

  if (!token) {
    try {
      console.log('Twitch token cache miss. Fetching new Twitch Access Token...');
      const tokenRes = await fetch(
        `https://id.twitch.tv/oauth2/token?client_id=${clientId}&client_secret=${clientSecret}&grant_type=client_credentials`,
        { method: 'POST' }
      );

      if (!tokenRes.ok) {
        console.error('Failed to get Twitch Token');
        return null;
      }

      const tokenData = await tokenRes.json();
      const accessToken = tokenData.access_token;

      if (!accessToken) {
        console.error('Twitch Access Token not found in response');
        return null;
      }

      token = accessToken;
      // Cache token for 24 hours (86400 seconds)
      await redis.set('twitch_access_token', token);
      await redis.expire('twitch_access_token', 86400);
      console.log('Successfully cached Twitch Access Token.');
    } catch (tokenError) {
      console.error('Error fetching Twitch token:', tokenError);
      return null;
    }
  }

  try {
    const streamRes = await fetch(`https://api.twitch.tv/helix/streams?user_login=${channelName}`, {
      headers: {
        'Client-ID': clientId,
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!streamRes.ok) {
      console.error(`Failed to fetch Twitch stream status: ${streamRes.statusText}`);
      return null;
    }

    const streamData = await streamRes.json();
    const isLive = streamData.data && streamData.data.length > 0;
    if (isLive) {
      const streamInfo = streamData.data[0];
      return {
        isLive: true,
        platform: 'twitch',
        user_name: streamInfo.user_name || channel,
        title: streamInfo.title || 'Twitch Stream',
        game_name: streamInfo.game_name || 'Just Chatting',
        viewer_count: streamInfo.viewer_count !== undefined ? streamInfo.viewer_count : 0,
        started_at: streamInfo.started_at || new Date().toISOString(),
        thumbnail_url: streamInfo.thumbnail_url || '',
        user_id: streamInfo.user_id,
      };
    }
  } catch (streamError) {
    console.error('Error checking Twitch stream status:', streamError);
  }

  return null;
}

/**
 * Polls status across configured platforms in order of priority: Twitch > YouTube > Kick
 */
export async function checkStreamStatus(context: any): Promise<UnifiedStreamInfo | null> {
  const twitchChannel = await context.settings.get('twitchChannel') as string | undefined;
  const twitchClientId = await context.settings.get('twitchClientId') as string | undefined;
  const twitchClientSecret = await context.settings.get('twitchClientSecret') as string | undefined;

  const youtubeChannel = await context.settings.get('youtubeChannel') as string | undefined;
  const youtubeApiKey = await context.settings.get('youtubeApiKey') as string | undefined;

  const kickChannel = await context.settings.get('kickChannel') as string | undefined;
  const kickClientId = await context.settings.get('kickClientId') as string | undefined;
  const kickClientSecret = await context.settings.get('kickClientSecret') as string | undefined;

  // 1. Check Twitch if configured
  if (twitchChannel && twitchClientId && twitchClientSecret) {
    const twitchStatus = await fetchTwitchStatus(twitchChannel, twitchClientId, twitchClientSecret, context.redis);
    if (twitchStatus) {
      return twitchStatus;
    }
  }

  // 2. Check YouTube if configured
  if (youtubeChannel && youtubeApiKey) {
    const youtubeStatus = await fetchYouTubeStatus(youtubeChannel, youtubeApiKey, context.redis);
    if (youtubeStatus) {
      return youtubeStatus;
    }
  }

  // 3. Check Kick if configured
  if (kickChannel && kickClientId && kickClientSecret) {
    const kickStatus = await fetchKickStatus(kickChannel, kickClientId, kickClientSecret, context.redis);
    if (kickStatus) {
      return kickStatus;
    }
  }

  return null;
}
