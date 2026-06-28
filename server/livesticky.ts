/**
 * LiveSticky core logic — Devvit Web server.
 *
 * This module contains the stream-status checking, post management, sidebar
 * widget, highlights, and dashboard logic. It was migrated from the former
 * Blocks entrypoint (src/main.ts) so the app can run as a pure Devvit Web app
 * (no Blocks runtime), which is required for the custom-post webview dashboard
 * to render.
 */
import { reddit, redis, settings } from '@devvit/web/server';
import { getDevvitConfig } from '@devvit/shared-types/server/get-devvit-config.js';
import {
  LinksAndCommentsDefinition,
  type LinksAndComments,
} from '@devvit/protos/types/devvit/plugin/redditapi/linksandcomments/linksandcomments_svc.js';
import { HighlightedPostLabel } from '@devvit/protos/types/devvit/plugin/redditapi/common/common_msg.js';
import { checkStreamStatus, UnifiedStreamInfo } from '../src/platforms.js';
import {
  DEFAULT_LIVE_POST_BODY,
  DEFAULT_CONCLUDING_POST_BODY,
  DEFAULT_OFFLINE_POST_BODY,
  DEFAULT_LIVE_SIDEBAR,
  DEFAULT_OFFLINE_SIDEBAR,
  DEFAULT_HIGHLIGHTS_POST_HEADER,
  DEFAULT_HIGHLIGHTS_POST_FOOTER,
  DEFAULT_LIVE_POST_TITLE,
  DEFAULT_OFFLINE_POST_TITLE,
  DEFAULT_HIGHLIGHTS_POST_TITLE,
} from '../src/templates.js';

// ---------------------------------------------------------------------------
// Placeholder / URL helpers
// ---------------------------------------------------------------------------

const removeYoutubeLink = (text: string): string =>
  text
    .split('\n')
    .map((line) => {
      if (line.includes('{youtube_url}')) {
        const cleaned = line.replace(
          /\s*([|•·\-‐‑⁃]|\s{2,})\s*(🟥\s*)?(\*\*)?\[.*?\]\(\{youtube_url\}\)(\*\*)?/gi,
          ''
        );
        return cleaned.includes('{youtube_url}') ? null : cleaned;
      }
      return line;
    })
    .filter((line) => line !== null)
    .join('\n');

const removeTwitchLink = (text: string): string =>
  text
    .split('\n')
    .map((line) => {
      if (line.includes('twitch.tv/{channel}') || line.includes('{twitch_url}')) {
        const cleaned = line
          .replace(
            /\s*([|•·\-‐‑⁃]|\s{2,})?\s*(🟪\s*)?(\*\*)?\[.*?\]\((https:\/\/twitch\.tv\/\{channel\}|\{twitch_url\})\)(\*\*)?/gi,
            ''
          )
          .replace(/^\s*([|•·\-‐‑⁃])\s*/, '')
          .replace(/\s*([|•·\-‐‑⁃])\s*$/, '');
        return cleaned.includes('twitch.tv/{channel}') || cleaned.includes('{twitch_url}')
          ? null
          : cleaned;
      }
      return line;
    })
    .filter((line) => line !== null)
    .join('\n');

const removeKickLink = (text: string): string =>
  text
    .split('\n')
    .map((line) => {
      if (line.includes('{kick_url}')) {
        const cleaned = line.replace(
          /\s*([|•·\-‐‑⁃]|\s{2,})\s*(🟩\s*)?(\*\*)?\[.*?\]\(\{kick_url\}\)(\*\*)?/gi,
          ''
        );
        return cleaned.includes('{kick_url}') ? null : cleaned;
      }
      return line;
    })
    .filter((line) => line !== null)
    .join('\n');

export const buildYouTubeUrl = (channel?: string | null): string | undefined => {
  const trimmed = channel?.trim();
  if (!trimmed) return undefined;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^UC[a-zA-Z0-9_-]{22}$/.test(trimmed)) {
    return `https://www.youtube.com/channel/${trimmed}`;
  }
  return `https://www.youtube.com/@${trimmed.replace(/^@/, '')}`;
};

export const buildKickUrl = (channel?: string | null): string | undefined => {
  const trimmed = channel?.trim();
  return trimmed ? `https://kick.com/${trimmed}` : undefined;
};

const get = <T = string>(name: string) => settings.get<T>(name);

// ---------------------------------------------------------------------------
// Body / sidebar formatters
// ---------------------------------------------------------------------------

const formatLivePostBody = (
  streamInfo: any,
  channelName: string,
  twitchUrl?: string,
  youtubeUrl?: string,
  kickUrl?: string,
  customBody?: string,
  footer?: string
): string => {
  const title = streamInfo.title || 'Live Stream';
  const gameName = streamInfo.game_name || 'Just Chatting';
  const viewerCount =
    streamInfo.viewer_count !== undefined ? streamInfo.viewer_count.toLocaleString() : '0';
  const startedAt = streamInfo.started_at ? new Date(streamInfo.started_at) : new Date();

  const elapsedMs = Date.now() - startedAt.getTime();
  const hours = Math.floor(elapsedMs / 3600000);
  const minutes = Math.floor((elapsedMs % 3600000) / 60000);
  const uptimeText = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

  const displayName = streamInfo.user_name || channelName;
  const content = customBody || DEFAULT_LIVE_POST_BODY;

  let result = content
    .replace(/{channel}/g, channelName)
    .replace(/{display_name}/g, displayName)
    .replace(/{game}/g, gameName)
    .replace(/{viewers}/g, viewerCount)
    .replace(/{uptime}/g, uptimeText)
    .replace(/{title}/g, title);

  result = twitchUrl ? result.replace(/{twitch_url}/g, twitchUrl) : removeTwitchLink(result);
  result = youtubeUrl ? result.replace(/{youtube_url}/g, youtubeUrl) : removeYoutubeLink(result);
  result = kickUrl ? result.replace(/{kick_url}/g, kickUrl) : removeKickLink(result);

  if (footer) result += `\n\n${footer}`;
  return result;
};

const formatOfflinePostBody = (
  channelName: string,
  twitchUrl?: string,
  youtubeUrl?: string,
  kickUrl?: string,
  customBody?: string,
  footer?: string,
  defaultTemplate: string = DEFAULT_OFFLINE_POST_BODY,
  displayName?: string,
  title?: string
): string => {
  const content = customBody || defaultTemplate;
  let result = content.replace(/{channel}/g, channelName);

  result = twitchUrl ? result.replace(/{twitch_url}/g, twitchUrl) : removeTwitchLink(result);
  if (displayName) result = result.replace(/{display_name}/g, displayName);
  if (title) result = result.replace(/{title}/g, title);
  result = youtubeUrl ? result.replace(/{youtube_url}/g, youtubeUrl) : removeYoutubeLink(result);
  result = kickUrl ? result.replace(/{kick_url}/g, kickUrl) : removeKickLink(result);

  if (footer) result += `\n\n${footer}`;
  return result;
};

const formatSidebarWidgetText = (
  isLive: boolean,
  streamInfo: any,
  displayName: string,
  channelName: string,
  twitchUrl?: string,
  youtubeUrl?: string,
  kickUrl?: string,
  customLiveText?: string,
  customOfflineText?: string,
  liveFooter?: string,
  offlineFooter?: string
): string => {
  if (isLive && streamInfo) {
    const title = streamInfo.title || 'Live Stream';
    const gameName = streamInfo.game_name || 'Just Chatting';
    const viewerCount =
      streamInfo.viewer_count !== undefined ? streamInfo.viewer_count.toLocaleString() : '0';

    let uptimeStr = '';
    if (streamInfo.started_at) {
      const startTime = new Date(streamInfo.started_at).getTime();
      const diffMs = Date.now() - startTime;
      const diffHrs = Math.floor(diffMs / 3600000);
      const diffMins = Math.floor((diffMs % 3600000) / 60000);
      uptimeStr = diffHrs > 0 ? `${diffHrs}h ${diffMins}m` : `${diffMins}m`;
    }

    const content = customLiveText || DEFAULT_LIVE_SIDEBAR;
    let result = content
      .replace(/{channel}/g, channelName)
      .replace(/{display_name}/g, displayName)
      .replace(/{game}/g, gameName)
      .replace(/{viewers}/g, viewerCount)
      .replace(/{uptime}/g, uptimeStr)
      .replace(/{title}/g, title);

    result = twitchUrl ? result.replace(/{twitch_url}/g, twitchUrl) : removeTwitchLink(result);
    result = youtubeUrl ? result.replace(/{youtube_url}/g, youtubeUrl) : removeYoutubeLink(result);
    result = kickUrl ? result.replace(/{kick_url}/g, kickUrl) : removeKickLink(result);

    if (liveFooter) result += `\n\n${liveFooter}`;
    return result;
  }

  const content = customOfflineText || DEFAULT_OFFLINE_SIDEBAR;
  let result = content.replace(/{channel}/g, channelName).replace(/{display_name}/g, displayName);

  result = twitchUrl ? result.replace(/{twitch_url}/g, twitchUrl) : removeTwitchLink(result);
  result = youtubeUrl ? result.replace(/{youtube_url}/g, youtubeUrl) : removeYoutubeLink(result);
  result = kickUrl ? result.replace(/{kick_url}/g, kickUrl) : removeKickLink(result);

  if (offlineFooter) result += `\n\n${offlineFooter}`;
  return result;
};

// ---------------------------------------------------------------------------
// Sticky offline post
// ---------------------------------------------------------------------------

const ensureStickyOfflinePost = async (
  channel: string,
  twitchUrl?: string,
  youtubeUrl?: string,
  kickUrl?: string
) => {
  const cachedDisplayName = await redis.get('twitch_display_name');
  const displayName = cachedDisplayName || channel;
  const customOfflineBody = await get('offlinePostBody');
  const offlinePostFooter = await get('offlinePostFooter');
  const concludingBody = formatOfflinePostBody(
    channel,
    twitchUrl,
    youtubeUrl,
    kickUrl,
    customOfflineBody,
    offlinePostFooter,
    DEFAULT_OFFLINE_POST_BODY,
    displayName
  );
  const customOfflineTitle = await get('offlinePostTitle');
  const templateTitle = customOfflineTitle || DEFAULT_OFFLINE_POST_TITLE;
  const offlinePostTitle = templateTitle.replace(/{display_name}/g, displayName);
  const offlinePostId = await redis.get('offline_post_id');
  let offlinePostExists = false;

  if (offlinePostId) {
    try {
      const offlinePost = await reddit.getPostById(offlinePostId);
      try {
        const comments = await offlinePost.comments.all();
        for (const comment of comments) {
          try {
            await comment.remove();
          } catch (commentError) {
            console.error(`Failed to remove comment ${comment.id}:`, commentError);
          }
        }
        console.log(`Cleared comments for existing offline post: ${offlinePostId}`);
      } catch (commentFetchError) {
        console.error('Failed to fetch/remove comments:', commentFetchError);
      }

      await offlinePost.edit({ text: concludingBody });
      await pinPostWithFallback(offlinePostId);
      console.log(`Successfully updated and stickied existing offline post: ${offlinePostId}`);
      offlinePostExists = true;
    } catch (fetchError) {
      console.error('Failed to fetch/sticky existing offline post, will recreate:', fetchError);
    }
  }

  if (!offlinePostExists) {
    try {
      const subreddit = await reddit.getCurrentSubreddit();
      const offlinePost = await reddit.submitPost({
        title: offlinePostTitle,
        subredditName: subreddit.name,
        text: concludingBody,
      });
      await pinPostWithFallback(offlinePost.id);
      await redis.set('offline_post_id', offlinePost.id);
      console.log(`Successfully created, stickied, and cached new offline post: ${offlinePost.id}`);
    } catch (createError) {
      console.error('Failed to create new offline post:', createError);
    }
  }

  await redis.set('is_offline_post_pinned', 'true');
};

// ---------------------------------------------------------------------------
// Stream highlights (Twitch clips)
// ---------------------------------------------------------------------------

const postStreamHighlights = async (
  clientId: string,
  token: string,
  broadcasterId: string,
  startedAt: string,
  streamTitle: string,
  channelName: string,
  displayName: string,
  customHeader?: string,
  customFooter?: string,
  flairTemplateId?: string,
  customTitle?: string
) => {
  try {
    console.log(`Fetching top clips for broadcaster ${broadcasterId} since ${startedAt}...`);
    const endedAt = new Date().toISOString();
    const url = `https://api.twitch.tv/helix/clips?broadcaster_id=${broadcasterId}&started_at=${startedAt}&ended_at=${endedAt}&first=20`;

    const res = await fetch(url, {
      headers: { 'Client-ID': clientId, Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      console.error(`Failed to fetch clips from Twitch Helix API: ${res.status} ${res.statusText}`);
      return;
    }

    const json = await res.json();
    const clips = json.data || [];
    if (clips.length === 0) {
      console.log('No clips generated during this stream session.');
      return;
    }

    const topClips = clips
      .sort((a: any, b: any) => (b.view_count || 0) - (a.view_count || 0))
      .slice(0, 5);

    console.log(`Found ${clips.length} clips. Posting top ${topClips.length} clips to Reddit...`);

    const dateStr = new Date(startedAt).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const templateTitle = customTitle || DEFAULT_HIGHLIGHTS_POST_TITLE;
    const postTitle = templateTitle
      .replace(/{display_name}/g, displayName)
      .replace(/{date}/g, dateStr);

    const templateHeader = customHeader || DEFAULT_HIGHLIGHTS_POST_HEADER;
    const header = templateHeader
      .replace(/{display_name}/g, displayName)
      .replace(/{title}/g, streamTitle)
      .replace(/{date}/g, dateStr)
      .replace(/{channel}/g, channelName);

    let body = header;
    topClips.forEach((clip: any, index: number) => {
      const views = clip.view_count !== undefined ? clip.view_count.toLocaleString() : '0';
      const title = clip.title || 'Untitled Clip';
      const creator = clip.creator_name || 'Anonymous';
      body += `${index + 1}. **[${title}](${clip.url})**\n`;
      body += `   * **Views:** ${views}\n`;
      body += `   * **Clipped by:** ${creator}\n\n`;
    });

    const templateFooter = customFooter || DEFAULT_HIGHLIGHTS_POST_FOOTER;
    body += templateFooter.replace(/{channel}/g, channelName);

    const subreddit = await reddit.getCurrentSubreddit();
    const highlightsPost = await reddit.submitPost({
      title: postTitle,
      subredditName: subreddit.name,
      text: body,
    });

    console.log(`Successfully created stream highlights post: ${highlightsPost.id}`);

    if (flairTemplateId) {
      try {
        await reddit.setPostFlair({
          postId: highlightsPost.id,
          subredditName: subreddit.name,
          flairTemplateId,
        });
        console.log(`Successfully applied flair to highlights post: ${flairTemplateId}`);
      } catch (flairError) {
        console.error('Failed to set flair on highlights post:', flairError);
      }
    }
  } catch (error) {
    console.error('Error creating stream highlights post:', error);
  }
};

// ---------------------------------------------------------------------------
// Dynamic flair
// ---------------------------------------------------------------------------
// Sticky / highlights helper
// ---------------------------------------------------------------------------

/**
 * Pins a post using Reddit's legacy sticky system and, if that slot is already
 * taken (both slots full → post gets no `stickied=true` flag), explicitly adds
 * the post to Community Highlights so it is visible in the official Reddit app
 * even when third-party clients miss it.
 *
 * Reddit's sticky system caps at 2 legacy slots; Community Highlights supports
 * up to 6 slots. Legacy stickies auto-sync into Highlights slots 1-2, but
 * Highlights-only slots 3-6 do NOT set `stickied=true` — that's why third-
 * party clients that only read the `stickied` boolean may see nothing.
 */
const pinPostWithFallback = async (postId: string): Promise<void> => {
  const linksAndComments = getDevvitConfig().use<LinksAndComments>(LinksAndCommentsDefinition);
  const t3Id = postId as `t3_${string}`;

  // 1. Try legacy sticky first.
  try {
    const post = await reddit.getPostById(t3Id);
    await post.sticky();
  } catch (stickyErr) {
    console.warn(`[pin] Legacy sticky failed for ${postId}:`, stickyErr);
  }

  // 2. Re-fetch to see if the legacy slot was actually granted.
  let isLegacyStickied = false;
  try {
    const refreshed = await reddit.getPostById(t3Id);
    isLegacyStickied = refreshed.stickied;
  } catch (fetchErr) {
    console.warn(`[pin] Could not re-fetch post ${postId} to check stickied flag:`, fetchErr);
  }

  if (isLegacyStickied) {
    console.log(`[pin] Post ${postId} is legacy-stickied (third-party clients will see it).`);
    return;
  }

  // 3. Legacy slot was not granted — explicitly add to Community Highlights.
  console.log(
    `[pin] Post ${postId} did not get a legacy sticky slot. ` +
      `Adding to Community Highlights as ANNOUNCEMENT (visible in official app).`
  );
  try {
    await linksAndComments.AddPostToHighlights({
      postId,
      label: HighlightedPostLabel.ANNOUNCEMENT,
    });
  } catch (hlErr) {
    console.error(`[pin] AddPostToHighlights failed for ${postId}:`, hlErr);
    console.warn(
      `[pin] WARNING: Post ${postId} could not be pinned via legacy sticky OR Community Highlights. ` +
        `It may not be visible at the top of the subreddit. Check mod permissions.`
    );
    return;
  }

  // 4. Verify the highlights add actually landed.
  try {
    const { isHighlighted } = await linksAndComments.GetIsPostHighlighted({ postId });
    if (isHighlighted) {
      console.log(`[pin] Confirmed: post ${postId} is in Community Highlights.`);
    } else {
      console.warn(
        `[pin] WARNING: AddPostToHighlights returned success but GetIsPostHighlighted ` +
          `reports post ${postId} is NOT highlighted. Investigate mod permissions.`
      );
    }
  } catch (verifyErr) {
    console.warn(`[pin] Could not verify highlight status for ${postId}:`, verifyErr);
  }
};

/**
 * Verifies that a previously pinned post is still visible (legacy stickied or
 * in Community Highlights). If neither is true, re-pins via pinPostWithFallback.
 * Called from the 2-minute cron to catch slots that slipped.
 */
const verifyAndRepinIfNeeded = async (postId: string, label: string): Promise<void> => {
  const linksAndComments = getDevvitConfig().use<LinksAndComments>(LinksAndCommentsDefinition);

  let isStickied = false;
  let isHighlighted = false;

  try {
    const post = await reddit.getPostById(postId as `t3_${string}`);
    isStickied = post.stickied;
  } catch {
    // Post may have been deleted — caller handles missing-post logic separately.
    return;
  }

  if (!isStickied) {
    try {
      const result = await linksAndComments.GetIsPostHighlighted({ postId });
      isHighlighted = result.isHighlighted;
    } catch (err) {
      console.warn(`[verify] GetIsPostHighlighted failed for ${label} post ${postId}:`, err);
    }
  }

  if (!isStickied && !isHighlighted) {
    console.warn(
      `[verify] ${label} post ${postId} is neither legacy-stickied nor in Community Highlights — re-pinning.`
    );
    await pinPostWithFallback(postId);
  }
};

// ---------------------------------------------------------------------------

const updateDynamicPostFlair = async (
  postId: string,
  subredditName: string,
  streamInfo: UnifiedStreamInfo,
  liveFlairId?: string
) => {
  try {
    const gameName = streamInfo.game_name || '';
    const viewers = streamInfo.viewer_count;
    let flairText = '🔴 LIVE';
    if (gameName && viewers > 0) {
      const formattedViewers =
        viewers >= 1000 ? `${(viewers / 1000).toFixed(1)}K` : viewers.toString();
      flairText = `🔴 LIVE: ${gameName} [${formattedViewers}]`;
    } else if (gameName) {
      flairText = `🔴 LIVE: ${gameName}`;
    }

    await reddit.setPostFlair({ postId, subredditName, text: flairText, flairTemplateId: liveFlairId });
    console.log(`Updated post ${postId} flair dynamically to: ${flairText}`);
  } catch (flairError) {
    console.error(`Failed to update dynamic post flair for ${postId}:`, flairError);
  }
};

const resetDynamicPostFlair = async (
  postId: string,
  subredditName: string,
  liveFlairId?: string
) => {
  try {
    await reddit.setPostFlair({
      postId,
      subredditName,
      text: '⚫ OFFLINE',
      flairTemplateId: liveFlairId,
    });
    console.log(`Reset post ${postId} flair to offline.`);
  } catch (flairError) {
    console.error(`Failed to reset dynamic post flair for ${postId}:`, flairError);
  }
};

// ---------------------------------------------------------------------------
// Dashboard config sync (shared by scheduler + menu)
// ---------------------------------------------------------------------------

const syncDashboardConfig = async (
  twitchChannel?: string,
  youtubeChannel?: string,
  kickChannel?: string
) => {
  await Promise.all([
    twitchChannel
      ? redis.set('dashboard_twitch_channel', twitchChannel)
      : redis.del('dashboard_twitch_channel'),
    youtubeChannel
      ? redis.set('dashboard_youtube_channel', youtubeChannel)
      : redis.del('dashboard_youtube_channel'),
    kickChannel
      ? redis.set('dashboard_kick_channel', kickChannel)
      : redis.del('dashboard_kick_channel'),
  ]);
};

// ---------------------------------------------------------------------------
// Main status check (formerly the check-twitch-status scheduler job)
// ---------------------------------------------------------------------------

export const runStatusCheck = async (): Promise<void> => {
  const twitchChannel = await get('twitchChannel');
  const youtubeChannel = await get('youtubeChannel');
  const kickChannel = await get('kickChannel');

  const liveFlairId = await get('liveFlairId');
  const twitchUrl = twitchChannel ? `https://twitch.tv/${twitchChannel.trim()}` : undefined;
  const youtubeUrl = buildYouTubeUrl(youtubeChannel);
  const kickUrl = buildKickUrl(kickChannel);

  const removeOfflinePost = await get<boolean>('removeOfflinePost');
  const deleteOfflinePost = await get<boolean>('deleteOfflinePost');
  const stickyOfflinePost = await get<boolean>('stickyOfflinePost');
  const updateSidebarWidget = await get<boolean>('updateSidebarWidget');
  const enableHighlightsPost = await get<boolean>('enableHighlightsPost');
  const livePostTitle = await get('livePostTitle');
  const highlightsPostTitle = await get('highlightsPostTitle');
  const livePostBody = await get('livePostBody');
  const livePostFooter = await get('livePostFooter');
  const concludingPostBody = await get('concludingPostBody');
  const concludingPostFooter = await get('concludingPostFooter');
  const liveSidebarText = await get('liveSidebarText');
  const liveSidebarFooter = await get('liveSidebarFooter');
  const offlineSidebarText = await get('offlineSidebarText');
  const offlineSidebarFooter = await get('offlineSidebarFooter');
  const highlightsHeader = await get('highlightsHeader');
  const highlightsFooter = await get('highlightsFooter');
  const highlightsFlairId = await get('highlightsFlairId');
  const offlineGracePeriod = await get<number>('offlineGracePeriod');
  const suggestedSort = await get('suggestedSort');
  const enableDashboard = await get<boolean>('enableDashboard');
  const enableLivePost = (await get<boolean>('enableLivePost')) ?? true;
  const enableDynamicFlair = await get<boolean>('enableDynamicFlair');

  const defaultChannel = (twitchChannel || youtubeChannel || kickChannel || '') as string;

  if (!twitchChannel && !youtubeChannel && !kickChannel) {
    console.log('No platform channels configured (Twitch, YouTube, or Kick). Skipping status check.');
    return;
  }

  const streamInfo = await checkStreamStatus({ settings, redis });
  const isLive = streamInfo !== null;

  const isCurrentlyPinned = await redis.get('is_live_pinned');
  const subreddit = await reddit.getCurrentSubreddit();

  if (isLive && streamInfo) {
    const postBody = formatLivePostBody(
      streamInfo,
      defaultChannel,
      twitchUrl,
      youtubeUrl,
      kickUrl,
      livePostBody,
      livePostFooter
    );
    const displayName = streamInfo.user_name || defaultChannel;
    const templateTitle = livePostTitle || DEFAULT_LIVE_POST_TITLE;
    const postTitle = templateTitle
      .replace(/{display_name}/g, displayName)
      .replace(/{title}/g, streamInfo.title || 'Live Stream');

    const offlineSince = await redis.get('offline_since');
    if (offlineSince) {
      await redis.del('offline_since');
      console.log('Stream went back online. Cancelled offline grace period.');
    }

    if (!isCurrentlyPinned) {
      await redis.set('is_live_pinned', 'true');
      await redis.set('twitch_display_name', displayName);

      if (streamInfo.platform === 'twitch') {
        if (streamInfo.user_id) await redis.set('twitch_broadcaster_id', streamInfo.user_id);
        if (streamInfo.started_at) await redis.set('twitch_started_at', streamInfo.started_at);
        if (streamInfo.title) await redis.set('twitch_stream_title', streamInfo.title);
      }

      if (enableDashboard) {
        console.log('Stream went live! Custom Dashboard Post is enabled.');
        const dashPostId = await redis.get('dashboard_post_id');
        if (dashPostId && enableDynamicFlair) {
          try {
            await updateDynamicPostFlair(dashPostId, subreddit.name, streamInfo, liveFlairId);
          } catch (flairError) {
            console.error('Failed to update dashboard flair on go-live:', flairError);
          }
        }
      }

      if (enableLivePost) {
        console.log('Stream went live! Posting and pinning standard live post...');
        try {
          if (stickyOfflinePost) {
            await redis.del('is_offline_post_pinned');
            const offlinePostId = await redis.get('offline_post_id');
            if (offlinePostId) {
              try {
                const offlinePost = await reddit.getPostById(offlinePostId);
                await offlinePost.unsticky();
                console.log(`Successfully unstickied offline post: ${offlinePostId}`);
              } catch (unstickyError) {
                console.error('Failed to unsticky offline post:', unstickyError);
              }
            }
          }

          const post = await reddit.submitPost({
            title: postTitle,
            subredditName: subreddit.name,
            text: postBody,
          });
          await pinPostWithFallback(post.id);

          if (suggestedSort && suggestedSort !== 'BLANK') {
            try {
              await post.setSuggestedCommentSort(suggestedSort as any);
              console.log(`Successfully set suggested comment sort to ${suggestedSort}.`);
            } catch (sortError) {
              console.error(`Failed to set suggested comment sort to ${suggestedSort}:`, sortError);
            }
          }

          if (liveFlairId) {
            try {
              await reddit.setPostFlair({
                postId: post.id,
                subredditName: subreddit.name,
                flairTemplateId: liveFlairId,
              });
              console.log(`Successfully applied post flair: ${liveFlairId}`);
            } catch (flairError) {
              console.error('Failed to set post flair:', flairError);
            }
          }

          if (enableDynamicFlair) {
            await updateDynamicPostFlair(post.id, subreddit.name, streamInfo, liveFlairId);
          }

          const liveCommentText = await get('liveCommentText');
          if (liveCommentText) {
            try {
              const comment = await reddit.submitComment({ id: post.id, text: liveCommentText });
              await comment.distinguish(true);
              console.log('Successfully posted and pinned moderator comment.');
            } catch (commentError) {
              console.error('Failed to post moderator comment:', commentError);
            }
          }

          await redis.set('live_post_id', post.id);
          console.log(`Successfully posted and pinned: ${post.id}`);
        } catch (e) {
          console.error('Failed to post stream status to Reddit, resetting lock:', e);
          await redis.del('is_live_pinned');
        }
      }
    } else {
      if (enableLivePost) {
        console.log('Stream is still live. Updating standard post stats in real-time...');
        const postId = await redis.get('live_post_id');
        if (postId) {
          try {
            const post = await reddit.getPostById(postId);
            await post.edit({ text: postBody });
            console.log(`Successfully updated live post stats for: ${postId}`);
            if (enableDynamicFlair) {
              await updateDynamicPostFlair(postId, subreddit.name, streamInfo, liveFlairId);
            }
          } catch (e) {
            console.error('Failed to update live post stats:', e);
          }
          // Re-verify that the live post is still pinned every cron tick.
          try {
            await verifyAndRepinIfNeeded(postId, 'live');
          } catch (verifyErr) {
            console.error('Failed to verify/re-pin live post:', verifyErr);
          }
        }
      }

      if (enableDashboard) {
        const dashPostId = await redis.get('dashboard_post_id');
        if (dashPostId) {
          if (enableDynamicFlair) {
            try {
              await updateDynamicPostFlair(dashPostId, subreddit.name, streamInfo, liveFlairId);
            } catch (flairError) {
              console.error('Failed to update dynamic flair on dashboard post:', flairError);
            }
          }
          // Re-verify that the dashboard post is still pinned every cron tick.
          try {
            await verifyAndRepinIfNeeded(dashPostId, 'dashboard');
          } catch (verifyErr) {
            console.error('Failed to verify/re-pin dashboard post:', verifyErr);
          }
        }
      }
    }

    // Dashboard-specific Redis keys for the webview server endpoints
    try {
      const gameName = streamInfo.game_name || 'Just Chatting';
      const viewerCount = streamInfo.viewer_count !== undefined ? streamInfo.viewer_count.toString() : '0';
      const thumbnail = streamInfo.thumbnail_url || '';
      await Promise.all([
        redis.set('dashboard_platform', streamInfo.platform),
        redis.set('dashboard_display_name', displayName),
        redis.set('dashboard_title', streamInfo.title || ''),
        redis.set('dashboard_started_at', streamInfo.started_at || new Date().toISOString()),
        redis.set('dashboard_game', gameName),
        redis.set('dashboard_viewers', viewerCount),
        redis.set('dashboard_thumbnail', thumbnail),
      ]);
    } catch (dashError) {
      console.error('Failed to write dashboard Redis keys:', dashError);
    }
  } else if (!isLive && isCurrentlyPinned) {
    const offlineSince = await redis.get('offline_since');
    const gracePeriodMin =
      offlineGracePeriod !== undefined && offlineGracePeriod >= 0 ? offlineGracePeriod : 6;

    if (!offlineSince) {
      await redis.set('offline_since', Date.now().toString());
      console.log(`Stream detected offline. Starting ${gracePeriodMin}-minute grace period buffer...`);
    } else {
      const firstOfflineTime = parseInt(offlineSince, 10);
      const elapsedMinutes = (Date.now() - firstOfflineTime) / 60000;
      console.log(
        `Stream is still offline. Grace period active: ${elapsedMinutes.toFixed(1)}m elapsed of ${gracePeriodMin}m.`
      );

      if (elapsedMinutes >= gracePeriodMin) {
        console.log('Grace period expired! Concluding post and unpinning...');

        // Record when the stream actually went offline (first offline detection)
        // so the dashboard can show "Last live X ago".
        await redis.set('last_live_at', new Date(firstOfflineTime).toISOString());

        await redis.del('is_live_pinned');
        await redis.del('offline_since');
        const postId = await redis.get('live_post_id');
        await redis.del('live_post_id');

        const broadcasterId = await redis.get('twitch_broadcaster_id');
        const startedAt = await redis.get('twitch_started_at');
        const streamTitle = (await redis.get('twitch_stream_title')) || 'Recent Stream';
        const cachedDisplayName = await redis.get('twitch_display_name');
        const displayName = cachedDisplayName || defaultChannel;

        await redis.del('twitch_broadcaster_id');
        await redis.del('twitch_started_at');
        await redis.del('twitch_stream_title');

        if (enableDynamicFlair) {
          if (enableDashboard) {
            const dashPostId = await redis.get('dashboard_post_id');
            if (dashPostId) await resetDynamicPostFlair(dashPostId, subreddit.name, liveFlairId);
          }
          if (enableLivePost && postId) {
            await resetDynamicPostFlair(postId, subreddit.name, liveFlairId);
          }
        }

        if (enableLivePost && postId) {
          try {
            const post = await reddit.getPostById(postId);
            if (deleteOfflinePost) {
              console.log(`Deleting post completely: ${postId}`);
              await post.delete();
            } else {
              if (removeOfflinePost) {
                console.log(`Removing post from feed: ${postId}`);
                await post.remove();
              } else {
                try {
                  const concludingBody = formatOfflinePostBody(
                    defaultChannel,
                    twitchUrl,
                    youtubeUrl,
                    kickUrl,
                    concludingPostBody,
                    concludingPostFooter,
                    DEFAULT_CONCLUDING_POST_BODY,
                    displayName,
                    streamTitle
                  );
                  await post.edit({ text: concludingBody });
                  console.log(`Successfully updated concluding body for post: ${postId}`);
                } catch (editError) {
                  console.error('Failed to update concluding body:', editError);
                }
                await post.unsticky();
                console.log(`Successfully unpinned concluding post: ${postId}`);
              }

              try {
                await post.lock();
                console.log(`Successfully locked concluding post: ${postId}`);
              } catch (lockError) {
                console.error('Failed to lock concluding post:', lockError);
              }
            }
          } catch (e) {
            console.error('Failed to conclude/unsticky/delete/remove post:', e);
          }
        }

        if (enableHighlightsPost && broadcasterId && startedAt) {
          try {
            const twitchClientId = await get('twitchClientId');
            const twitchClientSecret = await get('twitchClientSecret');
            let twitchToken = await redis.get('twitch_access_token');
            if (!twitchToken && twitchClientId && twitchClientSecret) {
              const tokenRes = await fetch(
                `https://id.twitch.tv/oauth2/token?client_id=${twitchClientId}&client_secret=${twitchClientSecret}&grant_type=client_credentials`,
                { method: 'POST' }
              );
              if (tokenRes.ok) {
                const tokenData = await tokenRes.json();
                twitchToken = tokenData.access_token;
              }
            }

            if (twitchToken) {
              await postStreamHighlights(
                twitchClientId as string,
                twitchToken,
                broadcasterId,
                startedAt,
                streamTitle,
                twitchChannel || '',
                displayName,
                highlightsHeader,
                highlightsFooter,
                highlightsFlairId,
                highlightsPostTitle
              );
            }
          } catch (highlightsError) {
            console.error('Failed to trigger postStreamHighlights:', highlightsError);
          }
        }

        if (!enableDashboard && stickyOfflinePost) {
          await ensureStickyOfflinePost(defaultChannel, twitchUrl, youtubeUrl, kickUrl);
        }
      }
    }
  } else if (!isLive && !isCurrentlyPinned) {
    if (!enableDashboard && stickyOfflinePost) {
      const isOfflinePostPinned = await redis.get('is_offline_post_pinned');
      if (!isOfflinePostPinned) {
        console.log('Offline post is not marked as pinned in Redis. Ensuring sticky offline post is active...');
        await ensureStickyOfflinePost(defaultChannel, twitchUrl, youtubeUrl, kickUrl);
      }
    }
  }

  // Sidebar widget
  if (updateSidebarWidget) {
    try {
      const cachedDisplayName = await redis.get('twitch_display_name');
      const displayName =
        isLive && streamInfo
          ? streamInfo.user_name || defaultChannel
          : cachedDisplayName || defaultChannel;
      const widgetText = formatSidebarWidgetText(
        isLive,
        streamInfo,
        displayName as string,
        defaultChannel,
        twitchUrl,
        youtubeUrl,
        kickUrl,
        liveSidebarText,
        offlineSidebarText,
        liveSidebarFooter,
        offlineSidebarFooter
      );

      const currentSubredditName = subreddit.name;
      const widgets = await reddit.getWidgets(currentSubredditName);
      const widgetName = 'STREAM STATUS';
      const statusWidget = widgets.find(
        (w: any) => w.name === widgetName || (w.name && w.name.toLowerCase().includes('stream status'))
      );

      if (statusWidget) {
        await reddit.updateWidget({
          type: 'textarea',
          subreddit: currentSubredditName,
          id: statusWidget.id,
          shortName: widgetName,
          text: widgetText,
        } as any);
        console.log(`Successfully updated sidebar widget: ${statusWidget.id}`);
      } else {
        const newWidget = await reddit.addWidget({
          type: 'textarea',
          subreddit: currentSubredditName,
          shortName: widgetName,
          text: widgetText,
        } as any);
        console.log(`Successfully created and added sidebar widget: ${newWidget.id}`);
      }
    } catch (widgetError) {
      console.error('Failed to update sidebar widget:', widgetError);
    }
  }

  // Sync dashboard config keys for the custom post webview
  try {
    await syncDashboardConfig(twitchChannel, youtubeChannel, kickChannel);
    if (!isLive) {
      await Promise.all([
        redis.del('dashboard_platform'),
        redis.del('dashboard_title'),
        redis.del('dashboard_started_at'),
        redis.del('dashboard_game'),
        redis.del('dashboard_viewers'),
        redis.del('dashboard_thumbnail'),
      ]);
    }
  } catch (dashSyncError) {
    console.error('Failed to sync dashboard config:', dashSyncError);
  }
};

// ---------------------------------------------------------------------------
// Menu actions
// ---------------------------------------------------------------------------

export const createDashboardPost = async (): Promise<string> => {
  const enableDashboard = await get<boolean>('enableDashboard');
  if (!enableDashboard) {
    return '⚠️ Enable "Custom Post Dashboard" in LiveSticky settings first!';
  }

  const subreddit = await reddit.getCurrentSubreddit();

  const twitchChannel = await get('twitchChannel');
  const youtubeChannel = await get('youtubeChannel');
  const kickChannel = await get('kickChannel');
  await syncDashboardConfig(twitchChannel, youtubeChannel, kickChannel);

  // Remove the previous dashboard post entirely so repeated "Create Dashboard"
  // clicks don't leave duplicate posts littering the feed.
  const oldDashPostId = await redis.get('dashboard_post_id');
  if (oldDashPostId) {
    try {
      const oldPost = await reddit.getPostById(oldDashPostId);
      await oldPost.unsticky().catch(() => {});
      await oldPost.delete();
      console.log(`Deleted old dashboard post: ${oldDashPostId}`);
    } catch {
      console.log(`Old dashboard post ${oldDashPostId} could not be deleted (already gone).`);
    }
  }

  const post = await reddit.submitCustomPost({
    subredditName: subreddit.name,
    title: '📺 LiveSticky Dashboard',
    entry: 'default',
    textFallback: { text: 'LiveSticky Dashboard' },
    styles: { height: 'regular' },
  });

  await redis.set('dashboard_post_id', post.id);
  await pinPostWithFallback(post.id);
  console.log(`Created new LiveSticky Dashboard post: ${post.id}`);
  return '📺 LiveSticky Dashboard created and stickied!';
};

export const restartLiveSticky = async (): Promise<string> => {
  console.log('Manual LiveSticky restart triggered. Clearing Redis state...');
  await Promise.all([
    redis.del('is_live_pinned'),
    redis.del('live_post_id'),
    redis.del('offline_since'),
    redis.del('offline_post_id'),
    redis.del('twitch_display_name'),
    redis.del('is_offline_post_pinned'),
    redis.del('dashboard_platform'),
    redis.del('dashboard_display_name'),
    redis.del('dashboard_title'),
    redis.del('dashboard_started_at'),
    redis.del('dashboard_game'),
    redis.del('dashboard_viewers'),
    redis.del('dashboard_thumbnail'),
  ]);

  // Run one immediate check so state is rebuilt without waiting for the cron.
  try {
    await runStatusCheck();
  } catch (e) {
    console.error('Immediate status check after restart failed:', e);
  }

  return 'LiveSticky has been restarted!';
};
