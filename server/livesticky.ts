/**
 * LiveSticky core logic - Devvit Web server.
 *
 * This module contains the stream-status checking, post management, sidebar
 * widget, highlights, and dashboard logic. It was migrated from the former
 * Blocks entrypoint (src/main.ts) so the app can run as a pure Devvit Web app
 * (no Blocks runtime), which is required for the custom-post webview dashboard
 * to render.
 */
import { reddit, redis, settings, realtime, media } from '@devvit/web/server';
import { getDevvitConfig } from '@devvit/shared-types/server/get-devvit-config.js';
import {
  LinksAndCommentsDefinition,
  type LinksAndComments,
} from '@devvit/protos/types/devvit/plugin/redditapi/linksandcomments/linksandcomments_svc.js';
import { HighlightedPostLabel } from '@devvit/protos/types/devvit/plugin/redditapi/common/common_msg.js';
import { checkAllStreamStatuses, getOrRefreshTwitchToken, refreshChannelImages, type UnifiedStreamInfo } from '../src/platforms.js';
import {
  buildYouTubeUrl,
  buildKickUrl,
  formatLivePostBody,
  formatOfflinePostBody,
  replaceTemplateVariables,
  buildHighlightsBody,
  buildLatestClipsBody,
  buildWikiArchive,
  buildWikiArchiveHtml,
  buildSingleClipsBody,
  type TemplateVariables,
  type ClipInfo,
  type HighlightsEdition,
} from '../src/formatters.js';
import {
  DEFAULT_LIVE_SIDEBAR,
  DEFAULT_OFFLINE_SIDEBAR,
  DEFAULT_HIGHLIGHTS_POST_HEADER,
  DEFAULT_HIGHLIGHTS_POST_FOOTER,
  DEFAULT_LIVE_POST_TITLE,
  DEFAULT_OFFLINE_POST_TITLE,
  DEFAULT_HIGHLIGHTS_POST_TITLE,
  DEFAULT_MONTHLY_HIGHLIGHTS_POST_TITLE,
  DEFAULT_MONTHLY_HIGHLIGHTS_POST_HEADER,
  DEFAULT_MONTHLY_HIGHLIGHTS_POST_FOOTER,
} from '../src/templates.js';

const get = <T = string>(name: string) => settings.get<T>(name);

/** Formats elapsed time since `startedAt` as a compact "4h 19m" / "47m" string. */
const computeUptime = (startedAt?: string): string => {
  if (!startedAt) return '';
  const elapsedMs = Date.now() - new Date(startedAt).getTime();
  if (!Number.isFinite(elapsedMs) || elapsedMs < 0) return '';
  const hours = Math.floor(elapsedMs / 3600000);
  const minutes = Math.floor((elapsedMs % 3600000) / 60000);
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
};

/**
 * Self-healing helper: Searches the subreddit for an existing post of a given type
 * when Redis state is missing or lost (e.g. after server crash, cache clear, or cold restart).
 * Prevents duplicate post creation on Reddit by discovering and reconnecting to active posts.
 */
const findExistingSubredditPost = async (
  subredditName: string,
  queryKeyword: string,
  timeframe: 'day' | 'week' | 'month' | 'year' = 'month'
): Promise<string | null> => {
  try {
    const searchListing = reddit.searchPosts({
      subredditName,
      query: queryKeyword,
      sort: 'new',
      timeframe,
      limit: 5,
    });
    const posts = await searchListing.all();
    if (posts && posts.length > 0) {
      const candidate = posts[0];
      console.log(`[Self-Healing] Discovered existing post for "${queryKeyword}": ${candidate.id}`);
      return candidate.id;
    }
  } catch (err) {
    console.error(`[Self-Healing] Search failed for "${queryKeyword}":`, err);
  }
  return null;
};

/**
 * Shape persisted to Redis (`dashboard_live_platforms`) and returned to the
 * dashboard webview - one entry per simultaneously-live platform.
 */
interface DashboardPlatform {
  platform: 'twitch' | 'youtube' | 'kick';
  title: string;
  game: string;
  viewers: string;
  startedAt: string;
  thumbnail: string;
}

const toDashboardPlatform = (s: UnifiedStreamInfo): DashboardPlatform => ({
  platform: s.platform,
  title: s.title || '',
  game: s.game_name || '',
  viewers: (s.viewer_count ?? 0).toString(),
  startedAt: s.started_at || '',
  thumbnail: s.thumbnail_url || '',
});

const formatSidebarWidgetText = (
  isLive: boolean,
  vars: TemplateVariables,
  customLiveText?: string,
  customOfflineText?: string,
  liveFooter?: string,
  offlineFooter?: string
): string => {
  if (isLive) {
    const content = customLiveText?.trim() || DEFAULT_LIVE_SIDEBAR;
    let result = replaceTemplateVariables(content, vars, true);
    if (liveFooter?.trim()) result += `\n\n${replaceTemplateVariables(liveFooter.trim(), vars, true)}`;
    return result;
  }

  const content = customOfflineText?.trim() || DEFAULT_OFFLINE_SIDEBAR;
  let result = replaceTemplateVariables(content, vars, false);
  if (offlineFooter?.trim()) result += `\n\n${replaceTemplateVariables(offlineFooter.trim(), vars, false)}`;
  return result;
};

// ---------------------------------------------------------------------------
// Sticky offline post
// ---------------------------------------------------------------------------

const ensureStickyOfflinePost = async (
  vars: TemplateVariables,
  preloadedOfflineBody?: string,
  preloadedOfflineFooter?: string,
  preloadedOfflineTitle?: string
) => {
  const concludingBody = formatOfflinePostBody(
    vars,
    preloadedOfflineBody,
    preloadedOfflineFooter
  );
  const templateTitle = preloadedOfflineTitle?.trim() || DEFAULT_OFFLINE_POST_TITLE;
  const offlinePostTitle = replaceTemplateVariables(templateTitle, vars, false);
  let offlinePostId = await redis.get('offline_post_id');
  if (!offlinePostId) {
    const subreddit = await reddit.getCurrentSubreddit();
    const recoveredId = await findExistingSubredditPost(subreddit.name, 'is offline', 'month');
    if (recoveredId) {
      offlinePostId = recoveredId;
      await redis.set('offline_post_id', recoveredId);
      console.log(`[Self-Healing] Reconnected offline_post_id from search: ${recoveredId}`);
    }
  }
  let offlinePostExists = false;

  if (offlinePostId) {
    try {
      const offlinePost = await reddit.getPostById(offlinePostId as `t3_${string}`);
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
      const safeTitle = offlinePostTitle.length > 300 ? offlinePostTitle.slice(0, 297) + '...' : offlinePostTitle;
      const offlinePost = await reddit.submitPost({
        title: safeTitle,
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

/**
 * Fetch the top-viewed Twitch clips for a broadcaster in a time window.
 * Returns clips sorted by view_count desc, sliced to `top`, or null on error.
 * `first` is the API page size (max 100); `top` is how many we keep.
 */
const fetchTopClips = async (
  clientId: string,
  token: string,
  broadcasterId: string,
  startedAt: string,
  endedAt: string,
  first: number,
  top: number
): Promise<any[] | null> => {
  const url = `https://api.twitch.tv/helix/clips?broadcaster_id=${broadcasterId}&started_at=${startedAt}&ended_at=${endedAt}&first=${first}`;
  const res = await fetch(url, {
    headers: { 'Client-ID': clientId, Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    console.error(`Failed to fetch clips from Twitch Helix API: ${res.status} ${res.statusText}`);
    return null;
  }
  const json = await res.json();
  const clips = json.data || [];
  return clips
    .sort((a: any, b: any) => (b.view_count || 0) - (a.view_count || 0))
    .slice(0, top);
};

const uploadThumbnailToReddit = async (url: string): Promise<string | null> => {
  if (!url || !url.startsWith('http')) return null;
  try {
    const asset = await media.upload({ url, type: 'image' });
    if (asset && asset.mediaUrl) {
      console.log(`[Media Upload] Uploaded clip thumbnail to Reddit CDN: ${asset.mediaUrl}`);
      return asset.mediaUrl;
    }
  } catch (err) {
    console.warn(`[Media Upload] Could not upload thumbnail ${url} to Reddit CDN:`, err);
  }
  return null;
};

/** Fetch the official thumbnail_url for a Twitch clip directly from Twitch Helix API. */
const fetchTwitchClipThumbnail = async (clipUrl: string): Promise<string | null> => {
  if (!clipUrl) return null;
  try {
    const match = clipUrl.match(/(?:clips\.twitch\.tv\/|twitch\.tv\/[^/]+\/clip\/)([A-Za-z0-9_-]+)/);
    if (!match || !match[1]) return null;
    const clipId = match[1];

    const twitchClientId = await get<string>('twitchClientId');
    const twitchClientSecret = await get<string>('twitchClientSecret');
    if (!twitchClientId || !twitchClientSecret) return null;

    const token = await getOrRefreshTwitchToken(twitchClientId, twitchClientSecret, redis);
    if (!token) return null;

    const res = await fetch(`https://api.twitch.tv/helix/clips?id=${clipId}`, {
      headers: {
        'Client-ID': twitchClientId,
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) return null;
    const data = (await res.json()) as { data?: Array<{ thumbnail_url?: string }> };
    if (data.data && data.data.length > 0 && data.data[0].thumbnail_url) {
      return data.data[0].thumbnail_url;
    }
  } catch (err) {
    console.warn(`Could not fetch Twitch clip thumbnail for ${clipUrl}:`, err);
  }
  return null;
};

const getOrResolveClipThumbnail = async (clip: ClipInfo): Promise<string | null> => {
  if (clip.thumbnailUrl && clip.thumbnailUrl.startsWith('http')) {
    return clip.thumbnailUrl;
  }
  return await fetchTwitchClipThumbnail(clip.url);
};

/** Map raw Twitch Helix clip objects to our slim ClipInfo shape, uploading thumbnails to Reddit CDN. */
const toClipInfosAsync = async (raw: any[]): Promise<ClipInfo[]> => {
  const clips: ClipInfo[] = [];
  for (const c of raw) {
    let redditThumbnailUrl = '';
    const rawThumb = c.thumbnail_url || (await fetchTwitchClipThumbnail(c.url)) || '';
    if (rawThumb) {
      const uploaded = await uploadThumbnailToReddit(rawThumb);
      if (uploaded) redditThumbnailUrl = uploaded;
    }
    clips.push({
      title: c.title || 'Untitled Clip',
      url: c.url,
      views: c.view_count || 0,
      creator: c.creator_name || 'Anonymous',
      thumbnailUrl: redditThumbnailUrl || c.thumbnail_url || '',
      redditThumbnailUrl,
    });
  }
  return clips;
};
const toClipInfos = (raw: any[]): ClipInfo[] =>
  raw.map((c: any) => ({
    title: c.title || 'Untitled Clip',
    url: c.url,
    views: c.view_count || 0,
    creator: c.creator_name || 'Anonymous',
    thumbnailUrl: c.thumbnail_url || '',
  }));

// Editions shown inline in the post body when the wiki archive is unavailable.
// ponytail: fixed cap; 6 editions x 5 clips stays well under Reddit's body limit.
const MAX_HIGHLIGHTS_EDITIONS = 6;
// Editions retained in Redis / rendered onto the wiki archive page. The wiki page
// itself holds the full browsable history; these keep Redis + the page comfortable.
const ARCHIVE_MAX_EDITIONS = 50;
const MONTHLY_ARCHIVE_MAX_EDITIONS = 24; // ~2 years of monthly compilations
const INDEX_WIKI_PAGE = 'livesticky';
const CLIP_ARCHIVE_WIKI_PAGE = 'livesticky/clip-archive';
const MONTHLY_ARCHIVE_WIKI_PAGE = 'livesticky/monthly-archive';
const LEGACY_CLIP_ARCHIVE_WIKI_PAGE = 'livesticky/clip_archive';

/**
 * Writes markdown to a specific wiki version ('v1' or 'v2').
 */
const writeWikiPageVersion = async (
  subredditName: string,
  page: string,
  content: string,
  wikiVersion: 'v1' | 'v2'
): Promise<boolean> => {
  try {
    if (wikiVersion === 'v2') {
      try {
        const v2Enabled = await reddit.isWikiV2Enabled(subredditName);
        if (!v2Enabled) {
          console.log(`[Wiki V2] Subreddit ${subredditName} does not have Wiki V2 enabled. Skipping V2 write.`);
          return false;
        }
      } catch (checkErr) {
        console.warn(`[Wiki V2] Failed checking isWikiV2Enabled for ${subredditName}:`, checkErr);
        return false;
      }
    }

    const formattedContent = content.replace(/\r?\n/g, '\r\n').trim();
    let exists = false;
    try {
      await reddit.getWikiPage(subredditName, page, { wikiVersion });
      exists = true;
    } catch {
      exists = false;
    }

    if (exists) {
      await reddit.updateWikiPage({ subredditName, page, content: formattedContent, reason: 'LiveSticky: archive update', wikiVersion });
    } else {
      await reddit.createWikiPage({ subredditName, page, content: formattedContent, reason: 'LiveSticky: archive init', wikiVersion });
    }

    try {
      await reddit.updateWikiPageSettings({ subredditName, page, listed: true, permLevel: 0, wikiVersion });
    } catch (settingsErr) {
      console.warn(`Could not update wiki page settings for ${page} (${wikiVersion}):`, settingsErr);
    }

    return true;
  } catch (err) {
    console.warn(`Could not write wiki page ${page} (${wikiVersion}):`, err);
    return false;
  }
};

/**
 * Ensures the parent /wiki/livesticky index page exists and links to both archives.
 */
const updateWikiIndex = async (subredditName: string): Promise<void> => {
  const indexContent = `<h2>LiveSticky Stream Archives</h2>

<p>Community stream archives and clip compilations for <strong>/r/${subredditName}</strong>, updated automatically by <a href="https://livesticky.com">LiveSticky</a>.</p>

<hr>

<h3>🎬 <a href="/r/${subredditName}/wiki/livesticky/clip-archive">Browse Stream Clip Archive</a></h3>
<p>Top Twitch clips from every stream session, organized newest-first.</p>

<hr>

<h3>🏆 <a href="/r/${subredditName}/wiki/livesticky/monthly-archive">Browse Monthly Top 20 Compilations</a></h3>
<p>Monthly compilation of the top 20 most-watched clips across the channel.</p>

<hr>

<p><em>Powered by <a href="https://livesticky.com">LiveSticky</a> • Real-Time Subreddit Stream Engine</em></p>
`;
  await writeWikiPageVersion(subredditName, INDEX_WIKI_PAGE, indexContent, 'v1');
  await writeWikiPageVersion(subredditName, INDEX_WIKI_PAGE, indexContent, 'v2');
};

/**
 * Automatically manages LiveSticky's wiki space:
 * 1. Ensures canonical pages ('livesticky', 'livesticky/clip-archive', 'livesticky/monthly-archive') are listed: true and permLevel: 0 (public).
 * 2. Queries all existing wiki pages on the subreddit (v1 and v2).
 * 3. Identifies any non-canonical pages matching LiveSticky's namespace (`livesticky/`, `livesticky_`, or `clip_archive`)
 *    and automatically unlists them (`listed: false`, `permLevel: 2`), keeping the sidebar clean.
 */
const autoCleanManagedWiki = async (subredditName: string): Promise<void> => {
  const CANONICAL_PAGES = new Set([
    INDEX_WIKI_PAGE, // 'LiveSticky'
    CLIP_ARCHIVE_WIKI_PAGE, // 'LiveSticky/clip-archive'
    MONTHLY_ARCHIVE_WIKI_PAGE, // 'LiveSticky/monthly-archive'
  ]);

  for (const wikiVersion of ['v1', 'v2'] as const) {
    if (wikiVersion === 'v2') {
      try {
        const v2Enabled = await reddit.isWikiV2Enabled(subredditName);
        if (!v2Enabled) continue;
      } catch {
        continue;
      }
    }

    // 1. Ensure canonical pages are public and listed
    for (const page of CANONICAL_PAGES) {
      try {
        await reddit.updateWikiPageSettings({
          subredditName,
          page,
          listed: true,
          permLevel: 0, // Public
          wikiVersion,
        });
      } catch {
        // Page may not exist yet
      }
    }

    // 2. Scan and unlist any orphan/legacy non-canonical pages
    try {
      const allPages = await reddit.getWikiPages(subredditName, { wikiVersion });
      for (const rawPage of allPages) {
        const page = rawPage.trim();
        const lower = page.toLowerCase();
        const isLiveStickyNamespace =
          lower.startsWith('livesticky/') ||
          lower.startsWith('livesticky_') ||
          lower === 'livesticky' ||
          lower.includes('clip_archive') ||
          lower.includes('clip-archive') ||
          lower.includes('monthly-archive');

        if (isLiveStickyNamespace && !CANONICAL_PAGES.has(page)) {
          try {
            await reddit.updateWikiPageSettings({
              subredditName,
              page,
              listed: false,
              permLevel: 2, // Mods only
              wikiVersion,
            });
            console.log(`[Auto-Clean Wiki] Unlisted non-canonical wiki page: ${page} (${wikiVersion})`);
          } catch (err) {
            console.warn(`Could not unlist wiki page ${page} (${wikiVersion}):`, err);
          }
        }
      }
    } catch (err) {
      console.warn(`Could not fetch wiki pages list for ${subredditName} (${wikiVersion}):`, err);
    }
  }
};

/**
 * Writes markdown to a subreddit wiki page (create-or-update) across both
 * Wiki V1 (Old Reddit) and Wiki V2 (New Reddit / Mobile Apps) so the content
 * is visible regardless of which interface readers use.
 */
const updateWikiArchive = async (
  subredditName: string,
  page: string,
  content: string
): Promise<string | null> => {
  try {
    // Write to Wiki V1 (Old Reddit wiki)
    const v1Success = await writeWikiPageVersion(subredditName, page, content, 'v1');

    // Check if Wiki V2 is supported/enabled and write to Wiki V2 (New Reddit / Mobile apps)
    let v2Enabled = false;
    try {
      v2Enabled = await reddit.isWikiV2Enabled(subredditName);
    } catch (checkErr) {
      console.warn(`Could not check isWikiV2Enabled for ${subredditName}:`, checkErr);
      v2Enabled = true;
    }

    let v2Success = false;
    if (v2Enabled) {
      v2Success = await writeWikiPageVersion(subredditName, page, content, 'v2');
    }

    if (!v1Success && !v2Success) {
      console.warn(`Wiki page ${page} unavailable in both v1 and v2, falling back to inline content.`);
      return null;
    }

    // Ensure parent /wiki/livesticky page exists so visiting /wiki/livesticky doesn't show "does not exist"
    try {
      await updateWikiIndex(subredditName);
    } catch (idxErr) {
      console.warn(`Could not update wiki index page for ${subredditName}:`, idxErr);
    }

    // Automatically clean up any non-canonical or duplicate wiki pages in the livesticky namespace
    try {
      await autoCleanManagedWiki(subredditName);
    } catch (cleanErr) {
      console.warn(`Could not auto-clean wiki pages for ${subredditName}:`, cleanErr);
    }

    return `https://www.reddit.com/r/${subredditName}/wiki/${page}`;
  } catch (wikiErr) {
    console.warn(`Wiki page ${page} unavailable, falling back to inline content:`, wikiErr);
    return null;
  }
};

/**
 * Updates the single, reused "Top Clips" post at the end of a stream. Instead of
 * creating a fresh post every time, it appends the latest stream's clips as a
 * new edition and edits the same post in place (same URL, no feed congestion).
 * Full history lives in a wiki page (linked from the post); if the wiki isn't
 * available it falls back to a bounded in-body archive. Created once, re-edited
 * forever after.
 */
const postStreamHighlights = async (
  clientId: string,
  token: string,
  broadcasterId: string,
  startedAt: string,
  vars: TemplateVariables,
  customHeader?: string,
  customFooter?: string,
  flairTemplateId?: string,
  customTitle?: string,
  sticky?: boolean,
  wikiArchive?: boolean,
  reusePost?: boolean
) => {
  try {
    console.log(`Fetching top clips for broadcaster ${broadcasterId} since ${startedAt}...`);
    const endedAt = new Date().toISOString();
    const raw = await fetchTopClips(clientId, token, broadcasterId, startedAt, endedAt, 20, 5);
    if (raw === null) return;
    if (raw.length === 0) {
      console.log('No clips generated during this stream session. Highlights post unchanged.');
      return;
    }
    console.log(`Adding edition of ${raw.length} clips to the ${reusePost ? 'reused' : 'new per-stream'} highlights post...`);

    // Prepend this stream's edition and cap the archive.
    let editions: HighlightsEdition[] = [];
    try {
      const stored = await redis.get('highlights_editions');
      if (stored) editions = JSON.parse(stored) as HighlightsEdition[];
    } catch (parseErr) {
      console.error('Failed to parse stored highlights editions, starting fresh:', parseErr);
    }
    const dateStr = vars.dateStr || new Date().toISOString().slice(0, 10);
    const clipInfos = await toClipInfosAsync(raw);
    const latestEdition: HighlightsEdition = { dateStr, clips: clipInfos };
    editions.unshift(latestEdition);
    editions = editions.slice(0, ARCHIVE_MAX_EDITIONS);

    const subreddit = await reddit.getCurrentSubreddit();

    // If per-stream mode (reusePost is false), fetch the previous stream's clip post ID to link to it
    const activeVars: TemplateVariables = { ...vars };
    if (!reusePost) {
      try {
        const lastHighlightsPostId = await redis.get('last_highlights_post_id');
        if (lastHighlightsPostId) {
          const cleanId = (lastHighlightsPostId as string).replace(/^t3_/, '');
          activeVars.previousHighlightsUrl = `https://www.reddit.com/r/${subreddit.name}/comments/${cleanId}`;
        }
      } catch (redisErr) {
        console.warn('Could not fetch last_highlights_post_id:', redisErr);
      }
    }

    const header = customHeader?.trim() || DEFAULT_HIGHLIGHTS_POST_HEADER;
    const footer = customFooter?.trim() || DEFAULT_HIGHLIGHTS_POST_FOOTER;

    // Full history goes to the wiki; the post links to it. If the wiki is
    // unavailable, keep the browsable history inline (bounded) instead.
    const archiveUrl = wikiArchive
      ? await updateWikiArchive(
          subreddit.name,
          CLIP_ARCHIVE_WIKI_PAGE,
          buildWikiArchive(
            editions,
            activeVars.streamDisplayName || '',
            '🎬 Clip Archive',
            'Top Twitch clips from every stream, compiled automatically by LiveSticky. Newest first.',
            subreddit.name
          )
        )
      : null;
    const body = archiveUrl
      ? buildLatestClipsBody(latestEdition, activeVars, header, footer, archiveUrl)
      : buildHighlightsBody(editions, activeVars, header, footer, MAX_HIGHLIGHTS_EDITIONS);

    let existingPostId = reusePost ? await redis.get('highlights_post_id') : null;
    if (reusePost && !existingPostId) {
      const recoveredId = await findExistingSubredditPost(subreddit.name, 'Top Clips', 'year');
      if (recoveredId) {
        existingPostId = recoveredId;
        await redis.set('highlights_post_id', recoveredId);
        console.log(`[Self-Healing] Reconnected highlights_post_id from search: ${recoveredId}`);
      }
    }

    // Try to edit the existing post if reusePost is enabled; if it's gone or reusePost is false,
    // fall through to creating a new one.
    let postId: `t3_${string}` | null = null;
    if (existingPostId) {
      try {
        const post = await reddit.getPostById(existingPostId as `t3_${string}`);
        await post.edit({ text: body });
        postId = existingPostId as `t3_${string}`;
        console.log(`Updated reused highlights post: ${existingPostId}`);
      } catch (editErr) {
        console.warn(`Could not edit existing highlights post ${existingPostId}, creating a new one:`, editErr);
      }
    }

    if (!postId) {
      const templateTitle = customTitle?.trim() || DEFAULT_HIGHLIGHTS_POST_TITLE;
      let titleTemplateToUse = templateTitle;
      if (reusePost) {
        const stripped = titleTemplateToUse
          .replace(/\s*\(\s*\{date\}\s*\)/gi, '')
          .replace(/\s*[-–—,]\s*\{date\}/gi, '')
          .replace(/\s*\{date\}/gi, '')
          .trim();
        titleTemplateToUse = stripped || DEFAULT_HIGHLIGHTS_POST_TITLE;
      }
      const postTitle = replaceTemplateVariables(titleTemplateToUse, activeVars, false);
      const safeTitle = postTitle.length > 300 ? postTitle.slice(0, 297) + '...' : postTitle;
      const created = await reddit.submitPost({
        title: safeTitle,
        subredditName: subreddit.name,
        text: body,
      });
      postId = created.id;
      console.log(`Created ${reusePost ? 'reused highlights post (initial)' : 'per-stream highlights post'}: ${postId}`);

      if (flairTemplateId) {
        try {
          await reddit.setPostFlair({ postId, subredditName: subreddit.name, flairTemplateId });
        } catch (flairError) {
          console.error('Failed to set flair on highlights post:', flairError);
        }
      }
    }

    // Keep it pinned if the mod opted in (re-pin each run in case it slipped).
    if (sticky) {
      await pinPostWithFallback(postId);
    }

    if (reusePost) {
      await redis.set('highlights_post_id', postId);
    } else {
      await redis.set('last_highlights_post_id', postId);
    }
    await redis.set('highlights_editions', JSON.stringify(editions));
  } catch (error) {
    console.error('Error updating stream highlights post:', error);
  }
};

/**
 * Posts a "Top 20 clips of the month" compilation. Fired by the monthly
 * scheduler cron on the 1st, covering the previous calendar month. Independent
 * of the per-stream highlights post; not stickied (it's an archive).
 */
export const runMonthlyHighlights = async (): Promise<void> => {
  const enableMonthly = await get<boolean>('enableMonthlyHighlights');
  if (!enableMonthly) {
    console.log('Monthly highlights disabled. Skipping.');
    return;
  }

  // This job runs hourly; only proceed at the mod-configured day + hour, resolved
  // in the streamer's timezone (falling back to UTC). A per-month dedupe key makes
  // sure it fires exactly once even if the matched hour is hit more than once.
  const now = new Date();
  const [dayRaw, timeRaw, hourRaw, tzRaw] = await Promise.all([
    get<string | number>('monthlyHighlightsDay'),
    get<string>('monthlyHighlightsTime'),
    get<number>('monthlyHighlightsHour'),
    get('streamerTimezone'),
  ]);
  const tz = (tzRaw as string | undefined)?.trim() || 'UTC';

  let localYear = now.getUTCFullYear();
  let localMonth = now.getUTCMonth() + 1; // 1-indexed (1-12)
  let localDay = now.getUTCDate();
  let localHour = now.getUTCHours();
  let firedKey = `${localYear}-${localMonth}`;
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      hourCycle: 'h23',
    }).formatToParts(now);
    const part = (t: string) => parts.find((p) => p.type === t)?.value;
    localYear = Number(part('year'));
    localMonth = Number(part('month'));
    localDay = Number(part('day'));
    localHour = Number(part('hour'));
    firedKey = `${localYear}-${localMonth}`;
  } catch {
    console.warn(`Invalid streamer timezone "${tz}", using UTC for monthly schedule.`);
  }

  // Determine configured target day of the month
  let configuredDay = 1;
  const dayStr = String(dayRaw ?? 'START').toUpperCase().trim();
  if (dayStr === 'END' || dayStr === 'LAST') {
    // Dynamic last day of current month in local timezone (28, 29, 30, or 31)
    configuredDay = new Date(localYear, localMonth, 0).getDate();
  } else if (dayStr === 'MIDDLE') {
    configuredDay = 15;
  } else if (dayStr === 'START') {
    configuredDay = 1;
  } else {
    const numDay = parseInt(dayStr, 10);
    configuredDay = Number.isFinite(numDay) ? Math.min(Math.max(numDay, 1), 31) : 1;
  }

  // Determine configured target hour (from 24h time string like "13:30" or legacy hour number)
  let configuredHour = 12;
  if (timeRaw && typeof timeRaw === 'string' && timeRaw.trim().length > 0) {
    const timeMatch = timeRaw.trim().match(/^(\d{1,2})/);
    if (timeMatch) {
      const parsedHour = parseInt(timeMatch[1], 10);
      if (Number.isFinite(parsedHour) && parsedHour >= 0 && parsedHour <= 23) {
        configuredHour = parsedHour;
      }
    }
  } else if (hourRaw !== undefined && hourRaw !== null) {
    const numHour = Number(hourRaw);
    if (Number.isFinite(numHour)) {
      configuredHour = Math.min(Math.max(Math.round(numHour), 0), 23);
    }
  }

  if (localDay !== configuredDay || localHour !== configuredHour) {
    return; // Not the scheduled slot this hour.
  }

  const lastPosted = await redis.get('monthly_last_posted');
  if (lastPosted === firedKey) {
    console.log(`Monthly highlights already posted for ${firedKey}. Skipping.`);
    return;
  }

  const broadcasterId = await redis.get('twitch_broadcaster_id');
  if (!broadcasterId) {
    console.log('No Twitch broadcaster ID stored yet. Skipping monthly highlights.');
    return;
  }

  const clientId = await get('twitchClientId');
  const clientSecret = await get('twitchClientSecret');
  const token = clientId && clientSecret
    ? await getOrRefreshTwitchToken(clientId, clientSecret, redis)
    : null;
  if (!token || !clientId) {
    console.error('Missing Twitch credentials. Skipping monthly highlights.');
    return;
  }

  // Previous calendar month: [first day of last month, first day of this month).
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const monthLabel = monthStart.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });

  try {
    const raw = await fetchTopClips(
      clientId as string,
      token,
      broadcasterId,
      monthStart.toISOString(),
      monthEnd.toISOString(),
      100,
      20
    );
    if (raw === null) return;
    if (raw.length === 0) {
      console.log(`No clips found for ${monthLabel}. Skipping monthly highlights post.`);
      return;
    }

    const [twitchChannel, customTitle, customHeader, customFooter, flairTemplateId] =
      await Promise.all([
        get('twitchChannel'),
        get('monthlyHighlightsPostTitle'),
        get('monthlyHighlightsHeader'),
        get('monthlyHighlightsFooter'),
        get('highlightsFlairId'),
      ]);

    const displayName = (await redis.get('twitch_display_name')) || (twitchChannel as string) || '';
    const vars: TemplateVariables = {
      twitchChannel: twitchChannel as string | undefined,
      twitchUrl: twitchChannel ? `https://twitch.tv/${(twitchChannel as string).trim()}` : undefined,
      streamDisplayName: displayName,
      monthLabel,
    };

    const subreddit = await reddit.getCurrentSubreddit();

    // Append this month to the monthly wiki archive and link the post to it.
    let monthlyEditions: HighlightsEdition[] = [];
    try {
      const stored = await redis.get('monthly_editions');
      if (stored) monthlyEditions = JSON.parse(stored) as HighlightsEdition[];
    } catch (parseErr) {
      console.error('Failed to parse stored monthly editions, starting fresh:', parseErr);
    }
    const monthlyClipInfos = await toClipInfosAsync(raw);
    monthlyEditions.unshift({ dateStr: monthLabel, clips: monthlyClipInfos });
    monthlyEditions = monthlyEditions.slice(0, MONTHLY_ARCHIVE_MAX_EDITIONS);

    const archiveUrl = wikiArchive
      ? await updateWikiArchive(
          subreddit.name,
          MONTHLY_ARCHIVE_WIKI_PAGE,
          buildWikiArchiveHtml(
            monthlyEditions,
            displayName,
            '🏆 Monthly Top 20 Archive',
            'The top 20 Twitch clips from each month, compiled automatically by LiveSticky. Newest first.',
            subreddit.name
          )
        )
      : null;

    const templateTitle = (customTitle as string)?.trim() || DEFAULT_MONTHLY_HIGHLIGHTS_POST_TITLE;
    const postTitle = replaceTemplateVariables(templateTitle, vars, false);
    const body = buildSingleClipsBody(
      monthlyClipInfos,
      vars,
      (customHeader as string)?.trim() || DEFAULT_MONTHLY_HIGHLIGHTS_POST_HEADER,
      (customFooter as string)?.trim() || DEFAULT_MONTHLY_HIGHLIGHTS_POST_FOOTER,
      archiveUrl || undefined
    );

    const safeTitle = postTitle.length > 300 ? postTitle.slice(0, 297) + '...' : postTitle;
    const monthlyPost = await reddit.submitPost({
      title: safeTitle,
      subredditName: subreddit.name,
      text: body,
    });
    console.log(`Created monthly highlights post for ${monthLabel}: ${monthlyPost.id}`);
    await redis.set('monthly_editions', JSON.stringify(monthlyEditions));
    await redis.set('monthly_last_posted', firedKey);

    if (flairTemplateId) {
      try {
        await reddit.setPostFlair({
          postId: monthlyPost.id,
          subredditName: subreddit.name,
          flairTemplateId: flairTemplateId as string,
        });
      } catch (flairError) {
        console.error('Failed to set flair on monthly highlights post:', flairError);
      }
    }
  } catch (error) {
    console.error('Error creating monthly highlights post:', error);
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
 * Highlights-only slots 3-6 do NOT set `stickied=true` - that's why third-
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

  // 3. Legacy slot was not granted - explicitly add to Community Highlights.
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
export const verifyAndRepinIfNeeded = async (postId: string, label: string): Promise<void> => {
  const linksAndComments = getDevvitConfig().use<LinksAndComments>(LinksAndCommentsDefinition);

  let isStickied = false;
  let isHighlighted = false;

  try {
    const post = await reddit.getPostById(postId as `t3_${string}`);
    isStickied = post.stickied;
  } catch {
    // Post may have been deleted - caller handles missing-post logic separately.
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
      `[verify] ${label} post ${postId} is neither legacy-stickied nor in Community Highlights - re-pinning.`
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

    await reddit.setPostFlair({ postId: postId as `t3_${string}`, subredditName, text: flairText, flairTemplateId: liveFlairId });
    console.log(`Updated post ${postId} flair dynamically to: ${flairText}`);
  } catch (flairError) {
    console.error(`Failed to update dynamic post flair for ${postId}:`, flairError);
  }
};

const resetDynamicPostFlair = async (
  postId: string,
  subredditName: string,
  liveFlairId?: string,
  offlineFlairText?: string
) => {
  try {
    await reddit.setPostFlair({
      postId: postId as `t3_${string}`,
      subredditName,
      text: offlineFlairText || '⚫ OFFLINE',
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
  const [
    twitchChannel,
    youtubeChannel,
    kickChannel,
    liveFlairId,
    offlineFlairText,
    removeOfflinePost,
    deleteOfflinePost,
    lockLivePostWhenOffline,
    stickyOfflinePost,
    updateSidebarWidget,
    enableHighlightsPost,
    livePostTitle,
    highlightsPostTitle,
    livePostBody,
    livePostFooter,
    concludingPostBody,
    concludingPostFooter,
    liveSidebarText,
    liveSidebarFooter,
    offlineSidebarText,
    offlineSidebarFooter,
    highlightsHeader,
    highlightsFooter,
    highlightsFlairId,
    stickyHighlightsPost,
    enableWikiArchive,
    offlineGracePeriod,
    suggestedSortRaw,
    enableDashboard,
    enableLivePostRaw,
    enableDynamicFlair,
    offlinePostBody,
    offlinePostFooter,
    offlinePostTitle,
    streamerRedditUsername,
    liveUserFlairText,
    offlineUserFlairText,
    streamerTimezone,
  ] = await Promise.all([
    get('twitchChannel'),
    get('youtubeChannel'),
    get('kickChannel'),
    get('liveFlairId'),
    get('offlineFlairText'),
    get<boolean>('removeOfflinePost'),
    get<boolean>('deleteOfflinePost'),
    get<boolean>('lockLivePostWhenOffline'),
    get<boolean>('stickyOfflinePost'),
    get<boolean>('updateSidebarWidget'),
    get<boolean>('enableHighlightsPost'),
    get('livePostTitle'),
    get('highlightsPostTitle'),
    get('livePostBody'),
    get('livePostFooter'),
    get('concludingPostBody'),
    get('concludingPostFooter'),
    get('liveSidebarText'),
    get('liveSidebarFooter'),
    get('offlineSidebarText'),
    get('offlineSidebarFooter'),
    get('highlightsHeader'),
    get('highlightsFooter'),
    get('highlightsFlairId'),
    get<boolean>('stickyHighlightsPost'),
    get<boolean>('enableWikiArchive'),
    get<number>('offlineGracePeriod'),
    get<unknown>('suggestedSort'),
    get<boolean>('enableDashboard'),
    get<boolean>('enableLivePost'),
    get<boolean>('enableDynamicFlair'),
    get('offlinePostBody'),
    get('offlinePostFooter'),
    get('offlinePostTitle'),
    get('streamerRedditUsername'),
    get('liveUserFlairText'),
    get('offlineUserFlairText'),
    get('streamerTimezone'),
  ]);
  const suggestedSort = Array.isArray(suggestedSortRaw)
    ? (suggestedSortRaw[0] as string | undefined)
    : (suggestedSortRaw as string | undefined);

  const enableLivePost = enableLivePostRaw ?? true;

  const twitchUrl = twitchChannel ? `https://twitch.tv/${twitchChannel.trim()}` : undefined;
  const youtubeUrl = buildYouTubeUrl(youtubeChannel);
  const kickUrl = buildKickUrl(kickChannel);

  const defaultChannel = (twitchChannel || youtubeChannel || kickChannel || '') as string;

  if (!twitchChannel && !youtubeChannel && !kickChannel) {
    console.log('No platform channels configured (Twitch, YouTube, or Kick). Skipping status check.');
    return;
  }

  // Fetch subreddit early for ModMail alerts
  const subreddit = await reddit.getCurrentSubreddit();

  // Poll every configured platform so the dashboard can show all simultaneous
  // streams. The first entry (highest priority that's live) is the "primary"
  // stream that drives the Reddit live post, flair, sidebar, and highlights - 
  // all of which remain single-stream concepts.
  const liveStreams = await checkAllStreamStatuses({
    settings,
    redis,
    onError: async (platform: string, msg: string) => {
      const cooldownKey = `modmail_cooldown_${platform.toLowerCase()}`;
      const hasCooldown = await redis.get(cooldownKey);
      if (!hasCooldown) {
        try {
          await redis.set(cooldownKey, 'true');
          await redis.expire(cooldownKey, 86400); // 24 hours
          await reddit.modMail.createConversation({
            subredditName: subreddit.name,
            subject: `⚠️ LiveSticky API Alert: ${platform}`,
            body: `Hello,\n\nLiveSticky encountered an error while trying to check your ${platform} stream status:\n\n> **${msg}**\n\nThis usually happens when API credentials expire or a free quota is exceeded. Please check your LiveSticky settings.\n\n*(This alert is rate-limited to once per 24 hours per platform.)*`,
            isAuthorHidden: true,
          });
          console.log(`Sent ModMail alert for ${platform}`);
        } catch (err) {
          console.error(`Failed to send ModMail alert for ${platform}:`, err);
        }
      }
    }
  });
  
  const streamInfo = liveStreams[0] ?? null;
  const isLive = streamInfo !== null;

  const isCurrentlyPinned = await redis.get('is_live_pinned');

  enum StreamState {
    LIVE = 'LIVE',
    GRACE_PERIOD = 'GRACE_PERIOD',
    OFFLINE = 'OFFLINE',
  }

  let currentState = StreamState.OFFLINE;
  if (isLive && streamInfo) {
    currentState = StreamState.LIVE;
  } else if (isCurrentlyPinned) {
    currentState = StreamState.GRACE_PERIOD;
  }

  const buildTemplateVars = async (stream: UnifiedStreamInfo | null): Promise<TemplateVariables> => {
    let streamDisplayName = '';
    if (stream) {
      streamDisplayName = stream.user_name || defaultChannel;
    } else {
      streamDisplayName = (await redis.get('twitch_display_name')) || defaultChannel;
    }
    
    let streamUptime = '';
    if (stream && stream.started_at) {
      const startTime = new Date(stream.started_at).getTime();
      const diffMs = Date.now() - startTime;
      const diffHrs = Math.floor(diffMs / 3600000);
      const diffMins = Math.floor((diffMs % 3600000) / 60000);
      streamUptime = diffHrs > 0 ? `${diffHrs}h ${diffMins}m` : `${diffMins}m`;
    }

    const activeStartedAt = stream?.started_at || (await redis.get('dashboard_started_at')) || (await redis.get('twitch_started_at'));
    const parsedStart = activeStartedAt ? new Date(activeStartedAt) : null;
    const dateObj = (parsedStart && !isNaN(parsedStart.getTime())) ? parsedStart : new Date();

    let dateStr = '';
    try {
      const tz = (streamerTimezone as string | undefined)?.trim();
      dateStr = dateObj.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: tz && tz !== '' ? tz : 'UTC',
      });
    } catch {
      dateStr = dateObj.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'UTC',
      });
    }

    return {
      twitchChannel: twitchChannel as string,
      youtubeChannel: youtubeChannel as string,
      kickChannel: kickChannel as string,
      twitchUrl,
      youtubeUrl,
      kickUrl,
      streamHandle: stream?.user_name || defaultChannel, 
      streamDisplayName,
      streamTitle: stream?.title || 'Live Stream',
      streamGame: stream?.game_name || 'Just Chatting',
      streamViewers: stream?.viewer_count !== undefined ? stream.viewer_count.toLocaleString() : '0',
      streamUptime,
      dateStr
    };
  };

  const currentVars = await buildTemplateVars(streamInfo);

  switch (currentState) {
    case StreamState.LIVE: {
      if (!streamInfo) break;
      const postBody = formatLivePostBody(
        currentVars,
        livePostBody,
        livePostFooter
      );
      const templateTitle = livePostTitle?.trim() || DEFAULT_LIVE_POST_TITLE;
      const postTitle = replaceTemplateVariables(templateTitle, currentVars, true);

    const offlineSince = await redis.get('offline_since');
    if (offlineSince) {
      await redis.del('offline_since');
      console.log('Stream went back online. Cancelled offline grace period.');
    }

    if (!isCurrentlyPinned) {
      await redis.set('is_live_pinned', 'true');
      await redis.set('twitch_display_name', currentVars.streamDisplayName || '');

      if (streamInfo.platform === 'twitch') {
        if (streamInfo.user_id) await redis.set('twitch_broadcaster_id', streamInfo.user_id);
        if (streamInfo.started_at) await redis.set('twitch_started_at', streamInfo.started_at);
        if (streamInfo.title) await redis.set('twitch_stream_title', streamInfo.title);
      }

      if (streamerRedditUsername && liveUserFlairText) {
        try {
          await reddit.setUserFlair({
            subredditName: subreddit.name,
            username: streamerRedditUsername as string,
            text: liveUserFlairText as string,
          });
          console.log(`Applied LIVE user flair to ${streamerRedditUsername}`);
        } catch (err) {
          console.error(`Failed to apply LIVE user flair to ${streamerRedditUsername}:`, err);
        }
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

      if (stickyOfflinePost) {
        await redis.del('is_offline_post_pinned');
        const offlinePostId = await redis.get('offline_post_id');
        if (offlinePostId) {
          try {
            const offlinePost = await reddit.getPostById(offlinePostId as `t3_${string}`);
            await offlinePost.unsticky();
            console.log(`Successfully unstickied offline post: ${offlinePostId}`);
          } catch (unstickyError) {
            console.error('Failed to unsticky offline post:', unstickyError);
          }
        }
      }

      if (enableLivePost) {
        let existingLivePostId = await redis.get('live_post_id');
        if (!existingLivePostId) {
          const recoveredId = await findExistingSubredditPost(subreddit.name, 'is LIVE', 'day');
          if (recoveredId) {
            existingLivePostId = recoveredId;
            await redis.set('live_post_id', recoveredId);
            console.log(`[Self-Healing] Reconnected live_post_id from search: ${recoveredId}`);
          }
        }

        if (existingLivePostId) {
          console.log(`[Self-Healing] Found active live post (${existingLivePostId}). Updating and re-pinning instead of recreating.`);
          try {
            const post = await reddit.getPostById(existingLivePostId as `t3_${string}`);
            await post.edit({ text: postBody });
            await pinPostWithFallback(existingLivePostId);
            if (enableDynamicFlair) {
              await updateDynamicPostFlair(existingLivePostId, subreddit.name, streamInfo, liveFlairId);
            }
          } catch (recoveryErr) {
            console.error('[Self-Healing] Failed to update recovered live post, will create new post:', recoveryErr);
            existingLivePostId = null;
          }
        }

        if (!existingLivePostId) {
          console.log('Stream went live! Posting and pinning standard live post...');
          try {
            const safeTitle = postTitle.length > 300 ? postTitle.slice(0, 297) + '...' : postTitle;
            const post = await reddit.submitPost({
              title: safeTitle,
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
          } catch (e: any) {
            console.error('Failed to post stream status to Reddit:', e);
            if (e && e.message && e.message.includes('400')) {
               console.error('Reddit API returned 400 Bad Request. Discarding lock recovery to prevent infinite loop. Please check your settings for oversized text.');
            } else {
               console.log('Resetting lock...');
               await redis.del('is_live_pinned');
            }
          }
        }
      }
    } else {
      if (enableLivePost) {
        console.log('Stream is still live. Updating standard post stats in real-time...');
        const postId = await redis.get('live_post_id');
        if (postId) {
          try {
            const cachedBodyKey = `live_post_body_${postId}`;
            const cachedBody = await redis.get(cachedBodyKey);
            
            if (cachedBody !== postBody) {
              const post = await reddit.getPostById(postId as `t3_${string}`);
              await post.edit({ text: postBody });
              await redis.set(cachedBodyKey, postBody);
              console.log(`Successfully updated live post stats for: ${postId}`);
            } else {
              console.log(`Live post body unchanged, skipping edit for: ${postId}`);
            }
            
            if (enableDynamicFlair) {
              await updateDynamicPostFlair(postId, subreddit.name, streamInfo, liveFlairId);
            }
          } catch (e) {
            console.error('Failed to update live post stats:', e);
          }
        } else {
          console.error('Lock is held but no live_post_id found! Resetting lock so post can be created...');
          await redis.del('is_live_pinned');
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
        }
      }
    }

    // Dashboard-specific Redis keys for the webview server endpoints
    try {
      const gameName = streamInfo.game_name || 'Just Chatting';
      const viewerCount = streamInfo.viewer_count !== undefined ? streamInfo.viewer_count.toString() : '0';
      const thumbnail = streamInfo.thumbnail_url || '';
      const livePlatformsJson = JSON.stringify(liveStreams.map(toDashboardPlatform));
      await Promise.all([
        redis.set('is_live_now', 'true'),
        redis.set('dashboard_platform', streamInfo.platform),
        redis.set('dashboard_display_name', currentVars.streamDisplayName || ''),
        redis.set('dashboard_title', streamInfo.title || ''),
        redis.set('dashboard_started_at', streamInfo.started_at || new Date().toISOString()),
        redis.set('dashboard_game', gameName),
        redis.set('dashboard_viewers', viewerCount),
        redis.set('dashboard_thumbnail', thumbnail),
        redis.set('dashboard_live_platforms', livePlatformsJson),
        redis.expire('dashboard_platform', 604800),
        redis.expire('dashboard_display_name', 604800),
        redis.expire('dashboard_title', 604800),
        redis.expire('dashboard_started_at', 604800),
        redis.expire('dashboard_game', 604800),
        redis.expire('dashboard_viewers', 604800),
        redis.expire('dashboard_thumbnail', 604800),
        redis.expire('dashboard_live_platforms', 604800),
      ]);
    } catch (dashError) {
      console.error('Failed to write dashboard Redis keys:', dashError);
    }
  }
  break;
  case StreamState.GRACE_PERIOD: {
    await redis.set('is_live_now', 'false');
    const offlineSince = await redis.get('offline_since');
    const gracePeriodMin =
      offlineGracePeriod !== undefined && offlineGracePeriod >= 0 ? offlineGracePeriod : 6;

    let shouldCleanup = false;
    let firstOfflineTime = Date.now();

    if (!offlineSince) {
      if (gracePeriodMin === 0) {
        shouldCleanup = true;
        console.log('Stream detected offline and grace period is 0. Concluding immediately...');
      } else {
        await redis.set('offline_since', Date.now().toString());
        console.log(`Stream detected offline. Starting ${gracePeriodMin}-minute grace period buffer...`);
      }
    } else {
      firstOfflineTime = parseInt(offlineSince, 10);
      const elapsedMinutes = (Date.now() - firstOfflineTime) / 60000;
      console.log(
        `Stream is still offline. Grace period active: ${elapsedMinutes.toFixed(1)}m elapsed of ${gracePeriodMin}m.`
      );

      if (elapsedMinutes >= gracePeriodMin) {
        shouldCleanup = true;
      }
    }

    if (shouldCleanup) {
      console.log('Grace period expired! Concluding post and unpinning...');

      const postId = await redis.get('live_post_id');
      const broadcasterId = await redis.get('twitch_broadcaster_id');
      const startedAt = await redis.get('twitch_started_at');

      let cleanupSafe = true;

      if (enableDynamicFlair) {
        if (enableDashboard) {
          const dashPostId = await redis.get('dashboard_post_id');
          if (dashPostId) await resetDynamicPostFlair(dashPostId, subreddit.name, liveFlairId, offlineFlairText);
        }
        if (enableLivePost && postId) {
          await resetDynamicPostFlair(postId, subreddit.name, liveFlairId, offlineFlairText);
        }
      }

      if (streamerRedditUsername) {
        try {
          await reddit.setUserFlair({
            subredditName: subreddit.name,
            username: streamerRedditUsername as string,
            text: (offlineUserFlairText as string) || '',
          });
          console.log(`Applied OFFLINE user flair to ${streamerRedditUsername}`);
        } catch (err) {
          console.error(`Failed to apply OFFLINE user flair to ${streamerRedditUsername}:`, err);
        }
      }

      if (enableLivePost && postId) {
        try {
          const post = await reddit.getPostById(postId as `t3_${string}`);
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
                  currentVars,
                  concludingPostBody,
                  concludingPostFooter
                );
                await post.edit({ text: concludingBody });
                console.log(`Successfully updated concluding body for post: ${postId}`);
              } catch (editError) {
                console.error('Failed to update concluding body:', editError);
              }
              await post.unsticky();
              console.log(`Successfully unpinned concluding post: ${postId}`);
            }

            if (lockLivePostWhenOffline) {
              try {
                await post.lock();
                console.log(`Successfully locked concluding post: ${postId}`);
              } catch (lockError) {
                console.error('Failed to lock concluding post:', lockError);
              }
            }
          }
        } catch (e: any) {
          console.error('Failed to conclude/unsticky/delete/remove post:', e);
          const errorStr = String(e?.message || e || '').toLowerCase();
          const isNotFound =
            errorStr.includes('not found') ||
            errorStr.includes('not_found') ||
            errorStr.includes('notfound') ||
            errorStr.includes('404');
          if (!isNotFound) {
            cleanupSafe = false;
          }
        }
      }

      if (enableHighlightsPost && broadcasterId && startedAt) {
        try {
          const twitchClientId = await get('twitchClientId');
          const twitchClientSecret = await get('twitchClientSecret');
          const reuseHighlightsPost = (await get<boolean>('reuseHighlightsPost')) ?? false;
          const twitchToken = twitchClientId && twitchClientSecret
            ? await getOrRefreshTwitchToken(twitchClientId, twitchClientSecret, redis)
            : null;

          if (twitchToken) {
            await postStreamHighlights(
              twitchClientId as string,
              twitchToken,
              broadcasterId,
              startedAt,
              currentVars,
              highlightsHeader,
              highlightsFooter,
              highlightsFlairId,
              highlightsPostTitle,
              stickyHighlightsPost,
              enableWikiArchive,
              reuseHighlightsPost
            );
          }
        } catch (highlightsError) {
          console.error('Failed to trigger postStreamHighlights:', highlightsError);
        }
      }

      if (stickyOfflinePost) {
        try {
          await ensureStickyOfflinePost(currentVars, offlinePostBody, offlinePostFooter, offlinePostTitle);
        } catch (err) {
          console.error('Failed to ensure sticky offline post:', err);
        }
      }

      if (cleanupSafe) {
        // Record when the stream actually went offline (first offline detection)
        await redis.set('last_live_at', new Date(firstOfflineTime).toISOString());
        await redis.del('is_live_pinned');
        await redis.del('offline_since');
        await redis.del('live_post_id');
        await redis.del('twitch_broadcaster_id');
        await redis.del('twitch_started_at');
        await redis.del('twitch_stream_title');
      }
    }
  }
  break;
  case StreamState.OFFLINE: {
    if (stickyOfflinePost) {
      const isOfflinePostPinned = await redis.get('is_offline_post_pinned');
      if (!isOfflinePostPinned) {
        console.log('Offline post is not marked as pinned in Redis. Ensuring sticky offline post is active...');
        await ensureStickyOfflinePost(currentVars, offlinePostBody, offlinePostFooter, offlinePostTitle);
      }
    }

    // Garbage Collection for offline > 7 days
    const lastLiveAtStr = await redis.get('last_live_at');
    if (lastLiveAtStr) {
      const msOffline = Date.now() - new Date(lastLiveAtStr).getTime();
      const daysOffline = msOffline / (1000 * 60 * 60 * 24);
      if (daysOffline > 7) {
        console.log(`Stream offline for ${daysOffline.toFixed(1)} days. Running Redis Garbage Collection...`);
        const keysToWipe = [
          'last_live_at', 'live_post_id', 'offline_post_id', 'dashboard_post_id',
          'twitch_broadcaster_id', 'twitch_started_at', 'twitch_stream_title',
          'twitch_display_name', 'last_pin_verified', 'is_live_pinned',
          'offline_since', 'dashboard_platform', 'dashboard_live_platforms',
          'dashboard_display_name', 'dashboard_started_at', 'dashboard_title',
          'dashboard_game', 'dashboard_viewers', 'dashboard_thumbnail',
          'dashboard_post_comments', 'dashboard_post_score', 'dashboard_avatar_url'
        ];
        await Promise.all(keysToWipe.map((k) => redis.del(k)));
        console.log('Garbage Collection complete.');
      }
    }
  }
  break;
  }

  // Sidebar widget
  if (updateSidebarWidget) {
    try {
      const widgetText = formatSidebarWidgetText(
        isLive,
        currentVars,
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
    if (currentState === StreamState.OFFLINE) {
      // Keep dashboard_display_name fresh in the offline path so the
      // /api/stream-status endpoint never falls back to the generic 'Streamer'
      // placeholder. twitch_display_name is written on the first live tick and
      // persists across sessions; defaultChannel (the channel login) covers the
      // case where no live session has occurred yet on this installation.
      const offlineDisplayName =
        (await redis.get('twitch_display_name')) || defaultChannel;
      await Promise.all([
        redis.set('is_live_now', 'false'),
        redis.set('dashboard_display_name', offlineDisplayName),
        redis.del('dashboard_platform'),
        redis.del('dashboard_title'),
        redis.del('dashboard_started_at'),
        redis.del('dashboard_game'),
        redis.del('dashboard_viewers'),
        redis.del('dashboard_thumbnail'),
        redis.del('dashboard_live_platforms'),
      ]);
    }
  } catch (dashSyncError) {
    console.error('Failed to sync dashboard config:', dashSyncError);
  }

  // Refresh the channel avatar once every 12 hours via Redis TTL.
  try {
    await refreshChannelImages({ settings, redis });
  } catch (imgErr) {
    console.error('Failed to refresh channel images:', imgErr);
  }

  // Push the latest state to the dashboard Realtime channel so clients update
  // immediately without waiting for the next 30-second poll.
  try {
    const [cachedLivePostId, cachedAvatarUrl, cachedLastLiveAt] = await Promise.all([
      redis.get('live_post_id'),
      redis.get('dashboard_avatar_url'),
      redis.get('last_live_at'),
    ]);
    const realtimeDisplayName =
      currentState !== StreamState.OFFLINE && streamInfo
        ? streamInfo.user_name || defaultChannel
        : (await redis.get('twitch_display_name')) ?? defaultChannel;

    // Per-platform payload (uptime computed fresh at push time).
    let platforms: any[] = [];
    if (currentState === StreamState.GRACE_PERIOD) {
      const cachedLivePlatforms = await redis.get('dashboard_live_platforms');
      if (cachedLivePlatforms) {
        try {
          const parsed = JSON.parse(cachedLivePlatforms);
          platforms = parsed.map((p: any) => ({
            platform: p.platform,
            title: p.title || '',
            game: p.game || '',
            viewers: p.viewers || '0',
            uptime: p.startedAt ? computeUptime(p.startedAt) : p.uptime || '',
            thumbnail: p.thumbnail || '',
          }));
        } catch {}
      }
    } else {
      platforms = liveStreams.map((s) => ({
        platform: s.platform,
        title: s.title || '',
        game: s.game_name || '',
        viewers: (s.viewer_count ?? 0).toString(),
        uptime: computeUptime(s.started_at),
        thumbnail: s.thumbnail_url || '',
      }));
    }

    // Reddit live-post engagement (comments + score) for the "Join the live
    // thread" row. Fetched once here (not per dashboard poll) and cached so the
    // /api/stream-status endpoint can serve it cheaply. Only the live post is
    // relevant - there's nothing to show once the stream concludes.
    let postComments = 0;
    let postScore = 0;
    if (currentState !== StreamState.OFFLINE && cachedLivePostId) {
      try {
        const livePost = await reddit.getPostById(cachedLivePostId as `t3_${string}`);
        postComments = livePost.numberOfComments ?? 0;
        postScore = livePost.score ?? 0;
        await Promise.all([
          redis.set('dashboard_post_comments', postComments.toString()),
          redis.set('dashboard_post_score', postScore.toString()),
        ]);
      } catch (postErr) {
        console.error('Failed to read live post engagement stats:', postErr);
      }
    } else {
      await Promise.all([
        redis.del('dashboard_post_comments'),
        redis.del('dashboard_post_score'),
      ]);
    }

    const isLiveForRealtime = currentState === StreamState.LIVE;
    const realtimePlatform = isLiveForRealtime
      ? (streamInfo?.platform || (await redis.get('dashboard_platform')) || null)
      : null;
    const realtimeTitle = isLiveForRealtime
      ? (streamInfo?.title || (await redis.get('dashboard_title')) || '')
      : '';
    const realtimeGame = isLiveForRealtime
      ? (streamInfo?.game_name || (await redis.get('dashboard_game')) || 'Just Chatting')
      : 'Just Chatting';
    const realtimeViewers = isLiveForRealtime
      ? (streamInfo?.viewer_count?.toString() || (await redis.get('dashboard_viewers')) || '0')
      : '0';
    const realtimeStartedAt = isLiveForRealtime
      ? (streamInfo?.started_at || (await redis.get('dashboard_started_at')) || undefined)
      : undefined;
    const realtimeThumbnail = isLiveForRealtime
      ? (streamInfo?.thumbnail_url || (await redis.get('dashboard_thumbnail')) || '')
      : '';

    await realtime.send('livesticky_dashboard', {
      type: 'status-update' as const,
      data: {
        isLive: isLiveForRealtime,
        platform: realtimePlatform,
        platforms,
        displayName: realtimeDisplayName,
        title: realtimeTitle,
        game: realtimeGame,
        viewers: realtimeViewers,
        uptime: computeUptime(realtimeStartedAt),
        thumbnail: realtimeThumbnail,
        livePostId: (isLiveForRealtime ? cachedLivePostId : null) ?? null,
        postComments,
        postScore,
        lastLiveAt: cachedLastLiveAt ?? null,
        avatarUrl: (cachedAvatarUrl && cachedAvatarUrl.length > 0) ? cachedAvatarUrl : null,
      },
    });
  } catch (realtimeErr) {
    console.error('Failed to publish to Realtime channel:', realtimeErr);
  }

  // Ensure wiki pages (hub, clip archive, sidebar visibility) are initialized and managed
  try {
    await ensureWikiArchiveReady(subreddit.name);
  } catch (wikiReadyErr) {
    console.warn('Failed to ensure wiki archive readiness during status check:', wikiReadyErr);
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
      const oldPost = await reddit.getPostById(oldDashPostId as `t3_${string}`);
      await oldPost.unsticky().catch(() => {});
      await oldPost.delete();
      console.log(`Deleted old dashboard post: ${oldDashPostId}`);
    } catch {
      console.log(`Old dashboard post ${oldDashPostId} could not be deleted (already gone).`);
    }
  }

  const dashboardTitle = await get<string>('dashboardPostTitle') || 'LiveSticky Dashboard';
  const dashboardHeightRaw = await get<unknown>('dashboardHeight');
  const dashboardHeight = Array.isArray(dashboardHeightRaw)
    ? (dashboardHeightRaw[0] as string | undefined)
    : (dashboardHeightRaw as string | undefined);
  const val = String(dashboardHeight || 'regular').toLowerCase();
  const isCompact = val !== 'tall';

  console.log(`Creating dashboard post. heightSetting="${dashboardHeight}", isCompact=${isCompact}`);

  const post = await reddit.submitCustomPost({
    subredditName: subreddit.name,
    title: dashboardTitle,
    entry: isCompact ? 'default' : 'tall',
    textFallback: { text: dashboardTitle },
    styles: {
      height: (isCompact ? 'REGULAR' : 'TALL') as any,
      heightPixels: isCompact ? 320 : 512,
    } as any,
  });

  await redis.set('dashboard_post_id', post.id);
  await pinPostWithFallback(post.id);
  console.log(`Created new LiveSticky Dashboard post: ${post.id}`);
  return `Dashboard created (${isCompact ? 'Compact 320px' : 'Tall 512px'}): ${dashboardTitle}`;
};

export const refreshLiveSticky = async (): Promise<string> => {
  console.log('Manual LiveSticky refresh triggered. Clearing Redis state...');
  await redis.del('dashboard_avatar_url');

  await Promise.all([
    redis.del('twitch_display_name'),
    redis.del('dashboard_platform'),
    redis.del('dashboard_display_name'),
    redis.del('dashboard_title'),
    redis.del('dashboard_started_at'),
    redis.del('dashboard_game'),
    redis.del('dashboard_viewers'),
    redis.del('dashboard_thumbnail'),
    redis.del('dashboard_live_platforms'),
    redis.del('dashboard_post_comments'),
    redis.del('dashboard_post_score'),
  ]);

  // Run one immediate check so state is rebuilt without waiting for the cron.
  try {
    await runStatusCheck();
  } catch (e) {
    console.error('Immediate status check after refresh failed:', e);
  }

  // Ensure wiki pages (hub, clip archive, sidebar visibility) are initialized and managed
  try {
    await ensureWikiArchiveReady();
  } catch (wikiErr) {
    console.warn('Failed to sync wiki archive during refresh:', wikiErr);
  }

  return `LiveSticky refreshed!`;
};

/**
 * Ensures the wiki archive hub, canonical pages, and sidebar listing are fully initialized
 * and up to date, even if no clip editions are stored in Redis yet.
 */
export const ensureWikiArchiveReady = async (subredditName?: string): Promise<void> => {
  try {
    const wikiArchive = await get<boolean>('enableWikiArchive');
    if (!wikiArchive) return;

    const subName = subredditName || (await reddit.getCurrentSubreddit()).name;
    const displayName = (await redis.get('twitch_display_name')) || '';

    // 1. Ensure parent /wiki/livesticky hub page exists
    await updateWikiIndex(subName);

    // 2. Ensure /wiki/livesticky/clip-archive exists (create placeholder if empty)
    const storedHighlights = await redis.get('highlights_editions');
    let clipContent = '';
    if (storedHighlights) {
      try {
        const editions = JSON.parse(storedHighlights) as HighlightsEdition[];
        let updated = false;
        for (const edition of editions) {
          for (const clip of edition.clips) {
            if (!clip.redditThumbnailUrl) {
              const rawThumb = await getOrResolveClipThumbnail(clip);
              if (rawThumb) {
                const uploaded = await uploadThumbnailToReddit(rawThumb);
                if (uploaded) {
                  clip.redditThumbnailUrl = uploaded;
                  updated = true;
                }
              }
            }
          }
        }
        if (updated) {
          await redis.set('highlights_editions', JSON.stringify(editions));
        }
        if (editions.length > 0) {
          clipContent = buildWikiArchiveHtml(
            editions,
            displayName,
            '🎬 Clip Archive',
            'Top Twitch clips from every stream, compiled automatically by LiveSticky. Newest first.',
            subName
          );
        }
      } catch {
        // Fallback
      }
    }
    if (!clipContent) {
      clipContent = `<h2>Clip Archive${displayName ? ` - ${displayName}` : ''}</h2>

<p>📚 <strong><a href="/r/${subName}/wiki/livesticky">← Return to LiveSticky Archive Hub</a></strong></p>
<p><em>Top Twitch clips from every stream, compiled automatically by LiveSticky. Newest first.</em></p>

<hr>

<p><em>No stream clip compilations archived yet. Clips will appear here automatically after stream sessions end.</em></p>

<hr>

<p>📚 <strong><a href="/r/${subName}/wiki/livesticky">← Return to LiveSticky Archive Hub</a></strong></p>
`;
    }
    await writeWikiPageVersion(subName, CLIP_ARCHIVE_WIKI_PAGE, clipContent, 'v1');
    await writeWikiPageVersion(subName, CLIP_ARCHIVE_WIKI_PAGE, clipContent, 'v2');

    // 3. Ensure /wiki/livesticky/monthly-archive exists (create placeholder if empty)
    const storedMonthly = await redis.get('monthly_editions');
    let monthlyContent = '';
    if (storedMonthly) {
      try {
        const editions = JSON.parse(storedMonthly) as HighlightsEdition[];
        let updated = false;
        for (const edition of editions) {
          for (const clip of edition.clips) {
            if (!clip.redditThumbnailUrl) {
              const rawThumb = await getOrResolveClipThumbnail(clip);
              if (rawThumb) {
                const uploaded = await uploadThumbnailToReddit(rawThumb);
                if (uploaded) {
                  clip.redditThumbnailUrl = uploaded;
                  updated = true;
                }
              }
            }
          }
        }
        if (updated) {
          await redis.set('monthly_editions', JSON.stringify(editions));
        }
        if (editions.length > 0) {
          monthlyContent = buildWikiArchiveHtml(
            editions,
            displayName,
            '🏆 Monthly Top 20 Archive',
            'The top 20 Twitch clips from each month, compiled automatically by LiveSticky. Newest first.',
            subName
          );
        }
      } catch {
        // Fallback
      }
    }
    if (!monthlyContent) {
      monthlyContent = `<h2>Monthly Top 20 Archive${displayName ? ` - ${displayName}` : ''}</h2>

<p>📚 <strong><a href="/r/${subName}/wiki/livesticky">← Return to LiveSticky Archive Hub</a></strong></p>
<p><em>The top 20 Twitch clips from each month, compiled automatically by LiveSticky. Newest first.</em></p>

<hr>

<p><em>No monthly top 20 compilations archived yet. Monthly compilations will appear here automatically on the 1st of each month.</em></p>

<hr>

<p>📚 <strong><a href="/r/${subName}/wiki/livesticky">← Return to LiveSticky Archive Hub</a></strong></p>
`;
    }
    await writeWikiPageVersion(subName, MONTHLY_ARCHIVE_WIKI_PAGE, monthlyContent, 'v1');
    await writeWikiPageVersion(subName, MONTHLY_ARCHIVE_WIKI_PAGE, monthlyContent, 'v2');

    // 4. Ensure canonical pages are listed and non-canonical pages are cleaned
    await autoCleanManagedWiki(subName);
  } catch (err) {
    console.warn('Could not ensure wiki archive readiness:', err);
  }
};
