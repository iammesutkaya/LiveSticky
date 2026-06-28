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
      bannerUrl,
    ] = await Promise.all([
      redis.get('is_live_pinned'),
      redis.get('live_post_id'),
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
      redis.get('dashboard_banner_url'),
    ]);

    const isLive = isLivePinned === 'true';
    const displayName = dashboardDisplayName || legacyDisplayName || 'Streamer';
    const startedAt = dashboardStartedAt || legacyStartedAt;
    const streamTitle = dashboardTitle || legacyTitle || '';

    let uptimeText = '';
    if (isLive && startedAt) {
      const startTime = new Date(startedAt).getTime();
      const elapsedMs = Date.now() - startTime;
      const hours = Math.floor(elapsedMs / 3600000);
      const minutes = Math.floor((elapsedMs % 3600000) / 60000);
      uptimeText = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
    }

    res.json({
      isLive,
      displayName,
      title: streamTitle,
      game: streamGame || 'Just Chatting',
      viewers: streamViewers || '0',
      uptime: uptimeText,
      thumbnail: streamThumbnail || '',
      livePostId: livePostId || null,
      lastLiveAt: lastLiveAt || null,
      avatarUrl: (avatarUrl && avatarUrl.length > 0) ? avatarUrl : null,
      bannerUrl: (bannerUrl && bannerUrl.length > 0) ? bannerUrl : null,
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

// ---------------------------------------------------------------------------
// Scheduler — runs every 2 minutes (declared in devvit.json scheduler.tasks)
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
// Triggers — run an immediate check on install/upgrade so state is seeded
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

app.post('/internal/menu/get-templates', async (_req, res) => {
  res.json({
    navigateTo: 'https://github.com/iammesutkaya/LiveSticky#-default-templates-for-copy-pasting',
  });
});

// ---------------------------------------------------------------------------

const server = createServer(app);
server.listen(getServerPort());
