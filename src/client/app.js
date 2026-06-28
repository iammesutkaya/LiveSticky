/**
 * LiveSticky Dashboard — Client App
 *
 * Fetches stream status and config from the Devvit server endpoints,
 * then subscribes to Realtime updates for instant live stat changes.
 */
import { connectRealtime, navigateTo } from '@devvit/web/client';
import { formatTimeAgo, formatNumber } from './utils.js';


// DOM references
const $ = (id) => document.getElementById(id);
const dashboard = $('dashboard');
const loadingEl = $('loading');
const errorEl = $('error');
const contentEl = $('content');
const statusIndicator = $('status-indicator');
const statusLabel = $('status-label');
const displayNameEl = $('display-name');
const liveContent = $('live-content');
const offlineContent = $('offline-content');
const streamTitleEl = $('stream-title');
const liveSummaryEl = $('live-summary');
const refreshBtn = $('refresh-btn');
const viewerCountEl = $('viewer-count');
const gameNameEl = $('game-name');
const uptimeValueEl = $('uptime-value');
const offlineNameEl = $('offline-name');
const lastLiveEl = $('last-live');
const lastUpdatedEl = $('last-updated');
const avatarInitialEl = $('avatar-initial');

// Platform link elements
const twitchLink = $('twitch-link');
const youtubeLink = $('youtube-link');
const kickLink = $('kick-link');
const discussionLink = $('discussion-link');

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
 * Show the error state with an optional message
 */
function showError(message) {
  loadingEl.classList.add('hidden');
  contentEl.classList.add('hidden');
  if (errorEl) {
    errorEl.classList.remove('hidden');
    const msgEl = document.getElementById('error-message');
    if (msgEl && message) msgEl.textContent = message;
  }
}

/**
 * Fetch the current stream status from the server.
 * Returns true on success, false on failure.
 */
async function fetchStatus() {
  try {
    const res = await fetch('/api/stream-status');
    if (res.ok) {
      const data = await res.json();
      updateDashboard(data);
      return true;
    } else {
      console.error('[LiveSticky] Status endpoint returned:', res.status);
      showError('Unable to reach the LiveSticky server.');
      return false;
    }
  } catch (err) {
    console.error('[LiveSticky] Failed to fetch status:', err);
    showError('Unable to reach the LiveSticky server.');
    return false;
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
  const displayName = data.displayName || 'Streamer';
  displayNameEl.textContent = displayName;
  if (avatarInitialEl) avatarInitialEl.textContent = displayName.trim().charAt(0) || 'S';

  // Toggle dashboard-level live state (themes the banner strip, etc.)
  dashboard.classList.toggle('is-live', isNowLive);

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

    // Compact at-a-glance summary line, e.g. "5.1K watching · Live for 52m"
    if (liveSummaryEl) {
      const watching = `${formattedViewers} watching`;
      const since = data.uptime ? ` · Live for ${data.uptime}` : '';
      liveSummaryEl.textContent = `${watching}${since}`;
    }
  } else {
    liveContent.classList.add('hidden');
    offlineContent.classList.remove('hidden');
    offlineNameEl.textContent = data.displayName || 'Streamer';

    // "Last live X ago" — shown only if we have a recorded last-live time
    if (lastLiveEl) {
      const ago = formatTimeAgo(data.lastLiveAt);
      if (ago) {
        lastLiveEl.textContent = `Last live ${ago}`;
        lastLiveEl.classList.remove('hidden');
      } else {
        lastLiveEl.classList.add('hidden');
      }
    }
  }

  // Wire up "Go to live discussion" button
  if (discussionLink) {
    if (isNowLive && data.livePostId) {
      const postId = String(data.livePostId).replace(/^t3_/, '');
      const postUrl = `https://www.reddit.com/comments/${postId}`;
      discussionLink.href = postUrl;
      // Replace event listener by cloning to avoid duplicates
      const fresh = discussionLink.cloneNode(true);
      fresh.addEventListener('click', (e) => {
        e.preventDefault();
        navigateTo(postUrl);
      });
      discussionLink.parentNode?.replaceChild(fresh, discussionLink);
      fresh.classList.remove('hidden');
    } else {
      discussionLink.classList.add('hidden');
    }
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
  setupPlatformLink(twitchLink, config.twitchUrl);
  setupPlatformLink(youtubeLink, config.youtubeUrl);
  setupPlatformLink(kickLink, config.kickUrl);
}

/**
 * Wire a platform button to open its URL.
 *
 * The dashboard runs in a sandboxed Devvit webview iframe, so a plain anchor
 * <a target="_blank"> cannot open external URLs. Navigation must go through
 * Devvit's navigateTo() client effect instead.
 */
function setupPlatformLink(el, url) {
  if (!el || !url) return;
  el.href = url;
  el.classList.remove('hidden');
  el.addEventListener('click', (e) => {
    e.preventDefault();
    navigateTo(url);
  });
}

/**
 * Try to connect to Realtime for instant updates.
 * Falls back to polling if Realtime is not available.
 */
async function initRealtime() {
  try {
    await connectRealtime({
      channel: 'livesticky_dashboard',
      onMessage: (msg) => {
        if (msg && msg.type === 'status-update') {
          updateDashboard(msg.data);
        }
      },
      onConnect: () => {
        console.log('[LiveSticky] Realtime connected — stopping poll fallback');
        stopPolling();
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

function stopPolling() {
  if (!pollingInterval) return;
  clearInterval(pollingInterval);
  pollingInterval = null;
  console.log('[LiveSticky] Stopped polling fallback');
}

/**
 * Manual refresh — re-pull the latest server state on demand and give visual
 * feedback. The server state itself is refreshed by the scheduler every 2 min;
 * this lets viewers grab the latest without reloading the whole post.
 */
async function handleRefresh() {
  if (!refreshBtn || refreshBtn.classList.contains('spinning')) return;
  refreshBtn.classList.add('spinning');
  refreshBtn.disabled = true;
  try {
    await fetchStatus();
  } finally {
    setTimeout(() => {
      refreshBtn.classList.remove('spinning');
      refreshBtn.disabled = false;
    }, 500);
  }
}

/**
 * Initialize the dashboard
 */
async function init() {
  if (refreshBtn) refreshBtn.addEventListener('click', handleRefresh);

  // Fetch config and initial status in parallel
  const [, statusOk] = await Promise.all([fetchConfig(), fetchStatus()]);

  // If initial status fetch failed, start polling immediately so the dashboard
  // auto-recovers without requiring a manual refresh.
  if (!statusOk) startPolling();

  // Try Realtime, fall back to polling on disconnect
  initRealtime();
}

// Boot
init();
