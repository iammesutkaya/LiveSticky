/**
 * LiveSticky Dashboard — Client App
 *
 * Fetches stream status and config from the Devvit server endpoints,
 * then subscribes to Realtime updates for instant live stat changes.
 */
import { connectRealtime } from '@devvit/web/client';


// DOM references
const $ = (id) => document.getElementById(id);
const dashboard = $('dashboard');
const loadingEl = $('loading');
const contentEl = $('content');
const statusIndicator = $('status-indicator');
const statusLabel = $('status-label');
const displayNameEl = $('display-name');
const liveContent = $('live-content');
const offlineContent = $('offline-content');
const streamTitleEl = $('stream-title');
const viewerCountEl = $('viewer-count');
const gameNameEl = $('game-name');
const uptimeValueEl = $('uptime-value');
const offlineNameEl = $('offline-name');
const lastUpdatedEl = $('last-updated');

// Platform link elements
const twitchLink = $('twitch-link');
const youtubeLink = $('youtube-link');
const kickLink = $('kick-link');

// State
let currentState = {
  isLive: false,
  displayName: 'Streamer',
  title: '',
  game: 'Just Chatting',
  viewers: '0',
  uptime: '0m',
};

let config = {
  twitchChannel: '',
  twitchUrl: '',
  youtubeUrl: null,
  kickUrl: null,
};

/**
 * Fetch the channel configuration from the server
 */
async function fetchConfig() {
  try {
    const res = await fetch('/api/config');
    if (res.ok) {
      config = await res.json();
      updatePlatformLinks();
    }
  } catch (err) {
    console.error('[LiveSticky] Failed to fetch config:', err);
  }
}

/**
 * Fetch the current stream status from the server
 */
async function fetchStatus() {
  try {
    const res = await fetch('/api/stream-status');
    if (res.ok) {
      const data = await res.json();
      updateDashboard(data);
    }
  } catch (err) {
    console.error('[LiveSticky] Failed to fetch status:', err);
  }
}

/**
 * Update the dashboard UI with new stream data
 */
function updateDashboard(data) {
  const wasLive = currentState.isLive;
  const isNowLive = data.isLive;

  // Detect viewer count change for animation
  const viewersChanged = currentState.viewers !== data.viewers;

  // Update state
  currentState = { ...currentState, ...data };

  // Update header
  displayNameEl.textContent = data.displayName || 'Streamer';

  // Update status indicator
  if (isNowLive) {
    statusIndicator.classList.remove('offline');
    statusIndicator.classList.add('live');
    statusLabel.textContent = 'LIVE';
  } else {
    statusIndicator.classList.remove('live');
    statusIndicator.classList.add('offline');
    statusLabel.textContent = 'OFFLINE';
  }

  // Show/hide live vs offline content with transition
  if (wasLive !== isNowLive) {
    dashboard.classList.add('transitioning');
    setTimeout(() => dashboard.classList.remove('transitioning'), 600);
  }

  if (isNowLive) {
    liveContent.classList.remove('hidden');
    offlineContent.classList.add('hidden');

    // Update live stats
    streamTitleEl.textContent = data.title || 'Live Stream';
    gameNameEl.textContent = data.game || 'Just Chatting';
    uptimeValueEl.textContent = data.uptime || '0m';

    // Update viewer count with animation
    const formattedViewers = formatNumber(data.viewers);
    if (viewersChanged) {
      viewerCountEl.classList.add('updating');
      setTimeout(() => viewerCountEl.classList.remove('updating'), 300);
    }
    viewerCountEl.textContent = formattedViewers;
  } else {
    liveContent.classList.add('hidden');
    offlineContent.classList.remove('hidden');
    offlineNameEl.textContent = data.displayName || 'Streamer';
  }

  // Update timestamp
  const now = new Date();
  lastUpdatedEl.textContent = now.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  // Show content, hide loading
  loadingEl.classList.add('hidden');
  contentEl.classList.remove('hidden');
}

/**
 * Update platform link buttons based on config
 */
function updatePlatformLinks() {
  if (config.twitchUrl) {
    twitchLink.href = config.twitchUrl;
    twitchLink.classList.remove('hidden');
  }

  if (config.youtubeUrl) {
    youtubeLink.href = config.youtubeUrl;
    youtubeLink.classList.remove('hidden');
  }

  if (config.kickUrl) {
    kickLink.href = config.kickUrl;
    kickLink.classList.remove('hidden');
  }
}

/**
 * Format a number string with commas (e.g., "15420" -> "15,420")
 */
function formatNumber(numStr) {
  const num = parseInt(numStr, 10);
  if (isNaN(num)) return numStr || '0';
  return num.toLocaleString();
}

/**
 * Try to connect to Realtime for instant updates.
 * Falls back to polling if Realtime is not available.
 */
async function initRealtime() {
  try {
    await connectRealtime({
      channel: 'livesticky-dashboard',
      onMessage: (msg) => {
        if (msg && msg.type === 'status-update') {
          updateDashboard(msg.data);
        }
      },
      onConnect: () => {
        console.log('[LiveSticky] Realtime connected');
      },
      onDisconnect: () => {
        console.log('[LiveSticky] Realtime disconnected, falling back to polling');
        startPolling();
      },
    });

    console.log('[LiveSticky] Realtime initialized');
  } catch (err) {
    console.warn('[LiveSticky] Realtime not available, using polling:', err);
    startPolling();
  }
}

/**
 * Fallback: poll the server every 30 seconds
 */
let pollingInterval = null;

function startPolling() {
  if (pollingInterval) return;
  console.log('[LiveSticky] Starting polling fallback (30s interval)');
  pollingInterval = setInterval(fetchStatus, 30000);
}

/**
 * Initialize the dashboard
 */
async function init() {
  // Fetch config and initial status in parallel
  await Promise.all([fetchConfig(), fetchStatus()]);

  // Try Realtime, fall back to polling
  initRealtime();
}

// Boot
init();
