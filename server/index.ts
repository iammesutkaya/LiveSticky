import express from 'express';
import { createServer, getServerPort } from '@devvit/web/server';
import { redis } from '@devvit/web/server';


const app = express();
app.use(express.json());

/**
 * GET /api/stream-status
 *
 * Returns the current stream state from Redis, used by the dashboard webview
 * to render the live/offline UI and display real-time stats.
 */
app.get('/api/stream-status', async (_req, res) => {
  try {
    const [
      isLivePinned,
      livePostId,
      displayName,
      startedAt,
      streamTitle,
      // Live stats stored by the scheduler
      streamGame,
      streamViewers,
      streamThumbnail,
    ] = await Promise.all([
      redis.get('is_live_pinned'),
      redis.get('live_post_id'),
      redis.get('twitch_display_name'),
      redis.get('twitch_started_at'),
      redis.get('twitch_stream_title'),
      redis.get('dashboard_game'),
      redis.get('dashboard_viewers'),
      redis.get('dashboard_thumbnail'),
    ]);

    const isLive = isLivePinned === 'true';

    // Calculate uptime if live
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
      displayName: displayName || 'Streamer',
      title: streamTitle || '',
      game: streamGame || 'Just Chatting',
      viewers: streamViewers || '0',
      uptime: uptimeText,
      thumbnail: streamThumbnail || '',
      livePostId: livePostId || null,
    });
  } catch (error) {
    console.error('Error fetching stream status:', error);
    res.status(500).json({ error: 'Failed to fetch stream status' });
  }
});

/**
 * GET /api/config
 *
 * Returns the channel configuration for the dashboard UI
 * (platform URLs, channel names, etc.)
 */
app.get('/api/config', async (_req, res) => {
  try {
    const [
      twitchChannel,
      youtubeChannel,
      kickChannel,
    ] = await Promise.all([
      redis.get('dashboard_twitch_channel'),
      redis.get('dashboard_youtube_channel'),
      redis.get('dashboard_kick_channel'),
    ]);

    const youtubeUrl = youtubeChannel
      ? `https://www.youtube.com/@${youtubeChannel.replace(/^@/, '')}`
      : null;
    const kickUrl = kickChannel
      ? `https://kick.com/${kickChannel}`
      : null;

    res.json({
      twitchChannel: twitchChannel || '',
      twitchUrl: twitchChannel ? `https://twitch.tv/${twitchChannel}` : '',
      youtubeUrl,
      kickUrl,
    });
  } catch (error) {
    console.error('Error fetching config:', error);
    res.status(500).json({ error: 'Failed to fetch config' });
  }
});


// Create the Devvit server and listen
const server = createServer(app);
server.listen(getServerPort());
