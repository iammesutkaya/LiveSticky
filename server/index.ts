import express from 'express';
import { createServer, getServerPort } from '@devvit/web/server';
import { redis } from '@devvit/web/server';
import {
  runStatusCheck,
  createDashboardPost,
  restartLiveSticky,
} from './livesticky.js';
import { buildYouTubeUrl } from '../src/formatters.js';

const app = express();
app.use(express.json());

// ---------------------------------------------------------------------------
// Webview API (consumed by the dashboard custom post client)
// ---------------------------------------------------------------------------

/**
 * GET /api/stream-status
 * Returns the current stream state from Redis for the dashboard webview.
 */
app.get('/api/stream-status', async (_req, res) => {
  try {
    const [
      isLivePinned,
      livePostId,
      dashboardPlatform,
      dashboardLivePlatforms,
      dashboardDisplayName,
      dashboardStartedAt,
      dashboardTitle,
      streamGame,
      streamViewers,
      streamThumbnail,
      legacyDisplayName,
      legacyStartedAt,
      legacyTitle,
      lastLiveAt,
      avatarUrl,
      postComments,
      postScore,
    ] = await Promise.all([
      redis.get('is_live_pinned'),
      redis.get('live_post_id'),
      redis.get('dashboard_platform'),
      redis.get('dashboard_live_platforms'),
      redis.get('dashboard_display_name'),
      redis.get('dashboard_started_at'),
      redis.get('dashboard_title'),
      redis.get('dashboard_game'),
      redis.get('dashboard_viewers'),
      redis.get('dashboard_thumbnail'),
      redis.get('twitch_display_name'),
      redis.get('twitch_started_at'),
      redis.get('twitch_stream_title'),
      redis.get('last_live_at'),
      redis.get('dashboard_avatar_url'),
      redis.get('dashboard_post_comments'),
      redis.get('dashboard_post_score'),
    ]);

    const isLive = isLivePinned === 'true';
    const displayName = dashboardDisplayName || legacyDisplayName || 'Streamer';
    const startedAt = dashboardStartedAt || legacyStartedAt;
    const streamTitle = dashboardTitle || legacyTitle || '';

    const uptimeFrom = (iso?: string): string => {
      if (!iso) return '';
      const elapsedMs = Date.now() - new Date(iso).getTime();
      if (!Number.isFinite(elapsedMs) || elapsedMs < 0) return '';
      const hours = Math.floor(elapsedMs / 3600000);
      const minutes = Math.floor((elapsedMs % 3600000) / 60000);
      return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
    };

    const uptimeText = isLive ? uptimeFrom(startedAt) : '';

    // Per-platform list for multistream. Each stored entry carries its own
    // startedAt so uptime is computed fresh here on every poll.
    interface StoredPlatform {
      platform: 'twitch' | 'youtube' | 'kick';
      title: string;
      game: string;
      viewers: string;
      startedAt: string;
      thumbnail: string;
    }
    let platforms: Array<{
      platform: string;
      title: string;
      game: string;
      viewers: string;
      uptime: string;
      thumbnail: string;
    }> = [];
    if (isLive && dashboardLivePlatforms) {
      try {
        const parsed = JSON.parse(dashboardLivePlatforms) as StoredPlatform[];
        platforms = parsed.map((p) => ({
          platform: p.platform,
          title: p.title || '',
          game: p.game || '',
          viewers: p.viewers || '0',
          uptime: uptimeFrom(p.startedAt),
          thumbnail: p.thumbnail || '',
        }));
      } catch (parseErr) {
        console.error('Failed to parse dashboard_live_platforms:', parseErr);
      }
    }

    res.json({
      isLive,
      platform: dashboardPlatform || null,
      platforms,
      displayName,
      title: streamTitle,
      game: streamGame || 'Just Chatting',
      viewers: streamViewers || '0',
      uptime: uptimeText,
      thumbnail: streamThumbnail || '',
      livePostId: livePostId || null,
      postComments: postComments ? parseInt(postComments, 10) : 0,
      postScore: postScore ? parseInt(postScore, 10) : 0,
      lastLiveAt: lastLiveAt || null,
      avatarUrl: (avatarUrl && avatarUrl.length > 0) ? avatarUrl : null,
    });
  } catch (error) {
    console.error('Error fetching stream status:', error);
    res.status(500).json({ error: 'Failed to fetch stream status' });
  }
});

/**
 * GET /api/config
 * Returns the channel configuration (platform URLs) for the dashboard UI.
 */
app.get('/api/config', async (_req, res) => {
  try {
    const [twitchChannel, youtubeChannel, kickChannel] = await Promise.all([
      redis.get('dashboard_twitch_channel'),
      redis.get('dashboard_youtube_channel'),
      redis.get('dashboard_kick_channel'),
    ]);

    res.json({
      twitchChannel: twitchChannel || '',
      twitchUrl: twitchChannel ? `https://twitch.tv/${twitchChannel}` : '',
      youtubeUrl: buildYouTubeUrl(youtubeChannel) || null,
      kickUrl: kickChannel ? `https://kick.com/${kickChannel}` : null,
    });
  } catch (error) {
    console.error('Error fetching config:', error);
    res.status(500).json({ error: 'Failed to fetch config' });
  }
});

/**
 * GET /api/image?url=https://...
 * Proxies CDN images through the server so the Devvit webview's CSP (which
 * blocks direct img-src loads from external CDNs) doesn't reject them.
 * Only proxies from the explicitly approved CDN domains.
 */
const PROXY_ALLOWED_HOSTS = new Set([
  'static-cdn.jtvnw.net',
  'yt3.googleusercontent.com',
  'i.ytimg.com',
  'files.kick.com',
  // Host allowed for the optional custom avatar override (see customAvatarUrl).
  'i.redd.it',
]);

// URL is passed as a base64url path segment to avoid WAF blocks on query
// parameters that look like full URLs (e.g. ?url=https://...).
app.get('/api/image/:encoded', async (req, res) => {
  const { encoded } = req.params;
  let url: string;
  try {
    const b64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
    url = Buffer.from(b64, 'base64').toString('utf8');
  } catch { res.status(400).end(); return; }

  let parsed: URL;
  try { parsed = new URL(url); } catch { res.status(400).end(); return; }
  if (!PROXY_ALLOWED_HOSTS.has(parsed.hostname)) { res.status(403).end(); return; }

  try {
    const upstream = await fetch(url);
    if (!upstream.ok) { res.status(upstream.status).end(); return; }
    const ct = upstream.headers.get('content-type');
    if (ct) res.setHeader('Content-Type', ct);
    res.setHeader('Cache-Control', 'public, max-age=60');
    res.send(Buffer.from(await upstream.arrayBuffer()));
  } catch (err) {
    console.error('Image proxy error:', err);
    res.status(502).end();
  }
});

// ---------------------------------------------------------------------------
// Scheduler - runs every 2 minutes (declared in devvit.json scheduler.tasks)
// ---------------------------------------------------------------------------

app.post('/internal/scheduler/check-status', async (_req, res) => {
  try {
    await runStatusCheck();
    res.json({});
  } catch (error) {
    console.error('Scheduled status check failed:', error);
    res.status(500).json({ error: 'status check failed' });
  }
});

// ---------------------------------------------------------------------------
// Triggers - run an immediate check on install/upgrade so state is seeded
// ---------------------------------------------------------------------------

const onInstallOrUpgrade = async (_req: express.Request, res: express.Response) => {
  try {
    await runStatusCheck();
  } catch (error) {
    console.error('Install/upgrade status check failed:', error);
  }
  res.json({});
};

app.post('/internal/triggers/on-app-install', onInstallOrUpgrade);
app.post('/internal/triggers/on-app-upgrade', onInstallOrUpgrade);

// ---------------------------------------------------------------------------
// Menu items (declared in devvit.json menu.items)
// ---------------------------------------------------------------------------

app.post('/internal/menu/create-dashboard', async (_req, res) => {
  try {
    const message = await createDashboardPost();
    res.json({ showToast: message });
  } catch (error) {
    console.error('Failed to create dashboard post:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.json({ showToast: `❌ Dashboard failed: ${message.slice(0, 80)}` });
  }
});

app.post('/internal/menu/restart', async (_req, res) => {
  try {
    const message = await restartLiveSticky();
    res.json({ showToast: message });
  } catch (error) {
    console.error('Failed to restart LiveSticky:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.json({ showToast: `❌ Restart failed: ${message.slice(0, 80)}` });
  }
});

app.post('/internal/menu/refresh-images', async (_req, res) => {
  try {
    // Clear the avatar cache so the next status check re-fetches from the platform API.
    await redis.del('dashboard_avatar_url');
    await runStatusCheck();
    res.json({ showToast: '✅ Profile images refreshed!' });
  } catch (error) {
    console.error('Failed to refresh profile images:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.json({ showToast: `❌ Image refresh failed: ${message.slice(0, 80)}` });
  }
});

app.post('/internal/menu/get-templates', async (_req, res) => {
  res.json({
    navigateTo: 'https://livesticky.com/customization.html',
  });
});

// ---------------------------------------------------------------------------

const server = createServer(app);
server.listen(getServerPort());
