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
const avatarImgEl = $('avatar-img');
const bannerStripEl = document.querySelector('.banner-strip');
const thumbnailWrap = $('stream-thumbnail-wrap');
const thumbnailImg = $('stream-thumbnail');
const compactMetaEl = $('compact-meta');
const offlineSubtextEl = $('offline-subtext');
const updateModeEl = $('update-mode');
const streamPlatformChipEl = $('stream-platform-chip');

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

// The current discussion post URL — kept in module scope so the single
// click listener can always read the latest value without being re-attached.
let discussionPostUrl = null;

// URL of the live stream for the thumbnail click handler.
let livePlatformUrl = null;

const PLATFORM_LABEL = { twitch: 'Twitch', youtube: 'YouTube', kick: 'Kick' };

// Timestamp of the last successful data update, for relative "Xm ago" display.
let lastFetchTime = null;

// Track which CDN URLs have been sent to the image proxy, so repeated
// realtime ticks don't trigger redundant reloads for stable images.
let loadedAvatarUrl = null;
let loadedBannerUrl = null;

// Blob URLs created from proxy fetches — revoked when replaced to avoid leaks.
let avatarBlobUrl = null;
let bannerBlobUrl = null;
let thumbnailBlobUrl = null;

/**
 * Fetch an image through the proxy using fetch() (which carries Devvit auth
 * headers) and return a local blob URL. Plain <img src> requests don't get
 * Devvit's injected auth header, so they always 401.
 */
async function fetchProxiedImage(cdnUrl) {
  const proxyUrl = proxyImgUrl(cdnUrl);
  if (!proxyUrl) return null;
  try {
    const res = await fetch(proxyUrl);
    if (!res.ok) return null;
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  } catch {
    return null;
  }
}

/**
 * Routes a CDN image URL through the same-origin /api/image proxy.
 * The Devvit webview CSP blocks direct img-src from CDN domains; the server
 * is the only party allowed to fetch from those hosts.
 * URL is base64url-encoded as a path segment — Devvit's WAF blocks query
 * parameters that look like full URLs (e.g. ?url=https://...).
 */
function proxyImgUrl(url) {
  if (!url) return null;
  const b64 = btoa(url).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  return `/api/image/${b64}`;
}

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
 * Render the footer "last updated" label as a relative age ("2m ago").
 * Called immediately after each update and on a 30s interval.
 */
function updateTimestampDisplay() {
  if (!lastUpdatedEl || !lastFetchTime) return;
  const diffMs = Date.now() - lastFetchTime.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) lastUpdatedEl.textContent = 'just now';
  else if (diffMin === 1) lastUpdatedEl.textContent = '1m ago';
  else lastUpdatedEl.textContent = `${diffMin}m ago`;
}

/**
 * Update the health dot in the footer.
 * 'healthy' → green pulsing (data arrived recently); '' → grey (stale or no data yet).
 * Driven by whether updateDashboard() has run recently, not by transport mode.
 */
function setUpdateMode(mode) {
  if (!updateModeEl) return;
  updateModeEl.className = `update-mode ${mode}`;
  updateModeEl.title = mode === 'healthy' ? 'Dashboard is up to date' : 'Waiting for update…';
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

  // Track when data last arrived for the relative footer timestamp and health dot
  lastFetchTime = new Date();
  updateTimestampDisplay();
  setUpdateMode('healthy');

  // Update header
  const displayName = data.displayName || 'Streamer';
  displayNameEl.textContent = displayName;
  if (avatarInitialEl) avatarInitialEl.textContent = displayName.trim().charAt(0) || 'S';

  // Avatar: fetch via proxy using fetch() so Devvit auth headers are included,
  // then display as a local blob URL. Plain <img src> doesn't carry auth headers.
  if (avatarImgEl && data.avatarUrl && data.avatarUrl !== loadedAvatarUrl) {
    loadedAvatarUrl = data.avatarUrl;
    fetchProxiedImage(data.avatarUrl).then(blobUrl => {
      if (blobUrl) {
        if (avatarBlobUrl) URL.revokeObjectURL(avatarBlobUrl);
        avatarBlobUrl = blobUrl;
        avatarImgEl.onload = () => {
          avatarImgEl.style.display = 'block';
          if (avatarInitialEl) avatarInitialEl.style.display = 'none';
        };
        avatarImgEl.src = blobUrl;
      } else {
        avatarImgEl.style.display = 'none';
        if (avatarInitialEl) avatarInitialEl.style.display = '';
        loadedAvatarUrl = null;
      }
    });
  }

  // Banner: the stored URL is the streamer's offline image (e.g. Twitch's
  // offline_image_url), which says "currently offline". Only show it when the
  // channel is actually offline; use the gradient when live.
  if (isNowLive) {
    if (bannerStripEl && bannerStripEl.classList.contains('has-image')) {
      bannerStripEl.classList.remove('has-image');
      bannerStripEl.style.removeProperty('--banner-img');
      loadedBannerUrl = null;
      if (bannerBlobUrl) { URL.revokeObjectURL(bannerBlobUrl); bannerBlobUrl = null; }
    }
  } else if (bannerStripEl && data.bannerUrl && data.bannerUrl !== loadedBannerUrl) {
    loadedBannerUrl = data.bannerUrl;
    fetchProxiedImage(data.bannerUrl).then(blobUrl => {
      if (blobUrl) {
        if (bannerBlobUrl) URL.revokeObjectURL(bannerBlobUrl);
        bannerBlobUrl = blobUrl;
        bannerStripEl.style.setProperty('--banner-img', `url('${blobUrl}')`);
        bannerStripEl.classList.add('has-image');
      } else {
        bannerStripEl.classList.remove('has-image');
        loadedBannerUrl = null;
      }
    });
  }

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

    // Stream title (1-line truncated in CSS)
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

    // Compact mode one-liner (shown only at height ≤ 290px in profile section)
    if (compactMetaEl) {
      const uptime = data.uptime || '';
      compactMetaEl.textContent = uptime
        ? `${formattedViewers} watching · ${uptime}`
        : `${formattedViewers} watching`;
    }

    // Live platform URL — used by the thumbnail click handler
    livePlatformUrl = null;
    if (data.platform === 'twitch') livePlatformUrl = config.twitchUrl || null;
    else if (data.platform === 'youtube') livePlatformUrl = config.youtubeUrl || null;
    else if (data.platform === 'kick') livePlatformUrl = config.kickUrl || null;

    // Platform chip on thumbnail
    if (streamPlatformChipEl) {
      const label = PLATFORM_LABEL[data.platform] || '';
      streamPlatformChipEl.textContent = label;
      streamPlatformChipEl.className = `stream-platform-chip${data.platform ? ` platform-${data.platform}` : ''}`;
    }

    // Stream thumbnail — Twitch URLs contain {width}x{height} placeholders.
    // Fetch via proxy using fetch() to carry Devvit auth headers.
    if (thumbnailWrap && thumbnailImg) {
      const rawUrl = data.thumbnail || '';
      const cdnSrc = rawUrl.replace('{width}', '320').replace('{height}', '180');
      if (cdnSrc) {
        fetchProxiedImage(cdnSrc).then(blobUrl => {
          if (blobUrl) {
            if (thumbnailBlobUrl) URL.revokeObjectURL(thumbnailBlobUrl);
            thumbnailBlobUrl = blobUrl;
            thumbnailImg.onload = () => thumbnailWrap.classList.remove('hidden');
            thumbnailImg.onerror = () => thumbnailWrap.classList.add('hidden');
            thumbnailImg.src = blobUrl;
          } else {
            thumbnailWrap.classList.add('hidden');
          }
        });
      } else {
        thumbnailWrap.classList.add('hidden');
      }
    }

    // Discussion link — shown only when live and a post ID is available
    if (discussionLink) {
      if (data.livePostId) {
        const postId = String(data.livePostId).replace(/^t3_/, '');
        discussionPostUrl = `https://www.reddit.com/comments/${postId}`;
        discussionLink.href = discussionPostUrl;
        discussionLink.classList.remove('hidden');
      } else {
        discussionPostUrl = null;
        discussionLink.classList.add('hidden');
      }
    }
  } else {
    liveContent.classList.add('hidden');
    offlineContent.classList.remove('hidden');
    offlineNameEl.textContent = data.displayName || 'Streamer';

    // Hide thumbnail when offline
    if (thumbnailWrap) thumbnailWrap.classList.add('hidden');
    livePlatformUrl = null;

    // Hide discussion link when offline
    if (discussionLink) {
      discussionPostUrl = null;
      discussionLink.classList.add('hidden');
    }

    // Clear compact meta
    if (compactMetaEl) compactMetaEl.textContent = '';

    // "Last live X ago" — prominent, just below the offline icon
    if (lastLiveEl) {
      const ago = formatTimeAgo(data.lastLiveAt);
      if (ago) {
        lastLiveEl.textContent = `Last live ${ago}`;
        lastLiveEl.classList.remove('hidden');
      } else {
        lastLiveEl.classList.add('hidden');
      }
    }

    // Conditional subtext: only mention "channels below" if any are configured
    if (offlineSubtextEl) {
      const hasChannels = config.twitchUrl || config.youtubeUrl || config.kickUrl;
      offlineSubtextEl.textContent = hasChannels
        ? 'Check back soon or follow the channels below!'
        : 'Check back soon!';
    }
  }

  // Platform buttons: hidden when live (thumbnail is the watch CTA); all configured when offline.
  if (twitchLink)  twitchLink.classList.toggle('hidden',  isNowLive || !config.twitchUrl);
  if (youtubeLink) youtubeLink.classList.toggle('hidden', isNowLive || !config.youtubeUrl);
  if (kickLink)    kickLink.classList.toggle('hidden',    isNowLive || !config.kickUrl);
  const platformLinksNav = $('platform-links');
  if (platformLinksNav) {
    const visibleCount = [twitchLink, youtubeLink, kickLink].filter(el => el && !el.classList.contains('hidden')).length;
    platformLinksNav.classList.toggle('all-three', visibleCount === 3);
  }

  // Show content, hide loading/error
  loadingEl.classList.add('hidden');
  errorEl.classList.add('hidden');
  contentEl.classList.remove('hidden');
}

/**
 * Wire click handlers and hrefs for platform buttons.
 * Visibility is managed exclusively by updateDashboard() to avoid a race
 * where fetchConfig() running after fetchStatus() would unhide buttons that
 * updateDashboard() already hid.
 */
function updatePlatformLinks() {
  setupPlatformLink(twitchLink, config.twitchUrl);
  setupPlatformLink(youtubeLink, config.youtubeUrl);
  setupPlatformLink(kickLink, config.kickUrl);
}

function setupPlatformLink(el, url) {
  if (!el || !url) return;
  el.href = url;
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

  // Single, persistent click listener for the discussion link (no cloneNode needed).
  if (discussionLink) {
    discussionLink.addEventListener('click', (e) => {
      e.preventDefault();
      if (discussionPostUrl) navigateTo(discussionPostUrl);
    });
  }

  // Thumbnail click → open the live stream.
  if (thumbnailWrap) {
    thumbnailWrap.addEventListener('click', () => {
      if (livePlatformUrl) navigateTo(livePlatformUrl);
    });
  }

  // Keep the relative "Xm ago" footer text fresh without requiring a server call.
  setInterval(updateTimestampDisplay, 30000);

  // Health dot: go grey if no successful update has landed in the last 60s
  // (one full missed poll cycle). Checked every 15s so the transition is prompt.
  setInterval(() => {
    if (!lastFetchTime || Date.now() - lastFetchTime.getTime() > 60000) {
      setUpdateMode('');
    }
  }, 15000);

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
