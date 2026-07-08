/**
 * LiveSticky Dashboard - Client App
 *
 * Fetches stream status and config from the Devvit server endpoints, then
 * subscribes to Realtime updates for instant live stat changes.
 *
 * Live view renders one card per simultaneously-live platform (multistream);
 * a single live platform gets a larger "cinematic" card. Below the cards sits
 * the Reddit live-thread row with the post's comment/upvote counts.
 */
import { connectRealtime, navigateTo } from '@devvit/web/client';
import { formatTimeAgo, formatNumber } from './utils.js';

let isNavigating = false;
function safeNavigateTo(url) {
  if (isNavigating) return;
  isNavigating = true;
  navigateTo(url);
  setTimeout(() => { isNavigating = false; }, 1000);
}
// ---------------------------------------------------------------------------
// Platform metadata
// ---------------------------------------------------------------------------

const PLATFORM_NAME = { twitch: 'Twitch', youtube: 'YouTube', kick: 'Kick' };

const PLATFORM_LOGO = {
  twitch:
    '<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z"/></svg>',
  youtube:
    '<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>',
  kick:
    '<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M1.333 0h8v5.333H12V2.667h2.667V0h8v8H20v2.667h-2.667v2.666H20V16h2.667v8h-8v-2.667H12v-2.666H9.333V24h-8Z"/></svg>',
};

const ARROW_SVG =
  '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M7 17L17 7M17 7H8M17 7v9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

// ---------------------------------------------------------------------------
// DOM references
// ---------------------------------------------------------------------------

const $ = (id) => document.getElementById(id);
const dashboard = $('dashboard');
const loadingEl = $('loading');
const errorEl = $('error');
const contentEl = $('content');
const statusIndicator = $('status-indicator');
const statusLabel = $('status-label');
const displayNameEl = $('display-name');
const headerSubEl = $('header-sub');
const liveContent = $('live-content');
const offlineContent = $('offline-content');
const platformListEl = $('platform-list');
const refreshBtn = $('refresh-btn');
const offlineNameEl = $('offline-name');
const offlineSubtextEl = $('offline-subtext');
const lastUpdatedEl = $('last-updated');
const avatarInitialEl = $('avatar-initial');
const avatarImgEl = $('avatar-img');
const updateModeEl = $('update-mode');

// Reddit live-thread row
const redditThreadEl = $('reddit-thread');
const redditThreadMetaEl = $('reddit-thread-meta');

// Platform link elements (offline only)
const twitchLink = $('twitch-link');
const youtubeLink = $('youtube-link');
const kickLink = $('kick-link');

// Modal elements (queried later inside init to ensure DOM readiness)
let aboutModal, aboutTrigger, closeModalBtn, linkWebsite, linkReddit;

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let currentState = { isLive: false };

let config = {
  twitchChannel: '',
  twitchUrl: '',
  youtubeUrl: null,
  kickUrl: null,
};

// Reddit discussion post URL for the live-thread row.
let redditThreadUrl = null;

// ---------------------------------------------------------------------------
// Mock Mode Configuration
// ---------------------------------------------------------------------------
const urlParams = new URLSearchParams(window.location.search);
const mockMode = urlParams.get('mock');
const isMockMode = mockMode !== null;

const MOCK_CONFIG = {
  twitchChannel: 'stickyfox',
  twitchUrl: 'https://twitch.tv/stickyfox',
  youtubeUrl: 'https://youtube.com/c/stickyfox',
  kickUrl: 'https://kick.com/stickyfox',
};

const MOCK_STATUS = {
  multistream: {
    isLive: true,
    displayName: "Sticky",
    avatarUrl: "sticky-profile-pic.png",
    lastLiveAt: new Date(Date.now() - 31620000).toISOString(),
    postComments: 42,
    postScore: 156,
    livePostId: "t3_123456",
    platforms: [
      {
        platform: "twitch",
        title: "🚀 Coding a Reddit Dashboard Live! | !project !github",
        viewers: 1414,
        game: "Software & Game Dev",
        uptime: "3h 15m",
        thumbnail: "twitch-stream.png"
      },
      {
        platform: "youtube",
        title: "LiveSticky Launch: Live Q&A & Code Walkthrough",
        viewers: 850,
        game: "Science & Technology",
        uptime: "1h 45m",
        thumbnail: "youtube-stream.png"
      },
      {
        platform: "kick",
        title: "Late Night Coding Session - Building on Devvit",
        viewers: 310,
        game: "Coding",
        uptime: "45m",
        thumbnail: "kick-stream.png"
      }
    ]
  },
  stream: {
    isLive: true,
    displayName: "Sticky",
    avatarUrl: "sticky-profile-pic.png",
    lastLiveAt: new Date(Date.now() - 31620000).toISOString(),
    postComments: 42,
    postScore: 156,
    livePostId: "t3_123456",
    platforms: [
      {
        platform: "twitch",
        title: "🚀 Coding a Reddit Dashboard Live! | !project !github",
        viewers: 1414,
        game: "Software & Game Dev",
        uptime: "3h 15m",
        thumbnail: "twitch-stream.png"
      }
    ]
  },
  offline: {
    isLive: false,
    displayName: "Sticky",
    avatarUrl: "sticky-profile-pic.png",
    lastLiveAt: new Date(Date.now() - 31620000).toISOString(),
    postComments: 42,
    postScore: 156,
    livePostId: "t3_123456",
    platforms: []
  }
};

// Timestamp of the last successful data update, for the relative footer label.
let lastFetchTime = null;

// Avatar proxying - track the loaded CDN url + its blob URL so repeated ticks
// don't re-fetch a stable image.
let loadedAvatarUrl = null;
let avatarBlobUrl = null;

// Thumbnail blobs cached by CDN url so re-renders don't refetch (and to avoid
// flicker). Devvit's webview CSP blocks direct <img src> from CDN hosts, and
// plain <img src> requests don't carry Devvit's injected auth header - so every
// image is fetched through the same-origin /api/image proxy and shown as a blob.
const thumbBlobCache = new Map();

// Signature of the currently-rendered card set, so we only rebuild the card DOM
// when the platform line-up changes (otherwise we update fields in place).
let lastListSignature = '';

// ---------------------------------------------------------------------------
// Image proxy helpers
// ---------------------------------------------------------------------------

/**
 * Routes a CDN image URL through the same-origin /api/image proxy. The URL is
 * base64url-encoded as a path segment - Devvit's WAF blocks query params that
 * look like full URLs (e.g. ?url=https://...).
 */
function proxyImgUrl(url) {
  if (!url) return null;
  const b64 = btoa(url).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  return `/api/image/${b64}`;
}

/**
 * Fetch an image through the proxy with fetch() (which carries Devvit auth
 * headers) and return a local blob URL, or null on failure.
 */
async function fetchProxiedImage(cdnUrl) {
  if (isMockMode) return cdnUrl;
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

/** Cached proxy fetch for thumbnails - one blob per distinct CDN url. */
async function getThumbBlob(cdnUrl) {
  if (thumbBlobCache.has(cdnUrl)) return thumbBlobCache.get(cdnUrl);
  const blob = await fetchProxiedImage(cdnUrl);
  if (blob) thumbBlobCache.set(cdnUrl, blob);
  return blob;
}

// ---------------------------------------------------------------------------
// Config + status fetching
// ---------------------------------------------------------------------------

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

async function fetchStatus() {
  try {
    const res = await fetch('/api/stream-status');
    if (res.ok) {
      const data = await res.json();
      updateDashboard(data);
      return true;
    }
    console.error('[LiveSticky] Status endpoint returned:', res.status);
    showError('Unable to reach the LiveSticky server.');
    return false;
  } catch (err) {
    console.error('[LiveSticky] Failed to fetch status:', err);
    showError('Unable to reach the LiveSticky server.');
    return false;
  }
}

function showError(message) {
  loadingEl.classList.add('hidden');
  contentEl.classList.add('hidden');
  if (errorEl) {
    errorEl.classList.remove('hidden');
    const msgEl = document.getElementById('error-message');
    if (msgEl && message) msgEl.textContent = message;
  }
}

// ---------------------------------------------------------------------------
// Footer health + timestamp
// ---------------------------------------------------------------------------

function updateTimestampDisplay() {
  if (!lastUpdatedEl || !lastFetchTime) return;
  const diffMin = Math.floor((Date.now() - lastFetchTime.getTime()) / 60000);
  if (diffMin < 1) lastUpdatedEl.textContent = 'just now';
  else if (diffMin === 1) lastUpdatedEl.textContent = '1m ago';
  else lastUpdatedEl.textContent = `${diffMin}m ago`;
}

function setUpdateMode(mode) {
  if (!updateModeEl) return;
  updateModeEl.className = `update-mode ${mode}`;
  updateModeEl.title = mode === 'healthy' ? 'Dashboard is up to date' : 'Waiting for update…';
}

// ---------------------------------------------------------------------------
// Platform URL resolution
// ---------------------------------------------------------------------------

function platformUrl(platform) {
  if (platform === 'twitch') return config.twitchUrl || null;
  if (platform === 'youtube') return config.youtubeUrl || null;
  if (platform === 'kick') return config.kickUrl || null;
  return null;
}

/**
 * Normalize the server payload into a platforms array. Prefers the new
 * `platforms` list; falls back to building a single entry from the flat
 * fields (older realtime payloads).
 */
function platformsFromData(data) {
  if (Array.isArray(data.platforms) && data.platforms.length > 0) return data.platforms;
  if (data.isLive && data.platform) {
    return [{
      platform: data.platform,
      title: data.title || '',
      game: data.game || '',
      viewers: data.viewers || '0',
      uptime: data.uptime || '',
      thumbnail: data.thumbnail || '',
    }];
  }
  return [];
}

// ---------------------------------------------------------------------------
// Card rendering
// ---------------------------------------------------------------------------

function buildCard(p, cinematic) {
  const card = document.createElement('div');
  card.className = `stream-card${cinematic ? ' cinematic' : ''}`;
  card.dataset.platform = p.platform;
  const name = PLATFORM_NAME[p.platform] || p.platform;
  const logo = PLATFORM_LOGO[p.platform] || '';

  card.innerHTML = `
    <div class="stream-card-main">
      <div class="thumb platform-${p.platform}">
        <img alt="" class="thumb-img" style="display:none">
        <div class="pulse-ring"></div>
        <span class="platform-badge platform-${p.platform}">${logo}</span>
      </div>
      <div class="stream-card-info">
        <div class="stream-card-title"></div>
        <div class="stream-card-meta">
          <span class="viewer-chip"><span class="vc-num">0</span><span class="vc-label">viewers</span></span>
          <span class="meta-text meta-cat"></span>
          <span class="meta-sep">·</span>
          <span class="meta-text meta-up"></span>
        </div>
      </div>
    </div>
    <a class="watch-btn platform-${p.platform}" href="#" aria-label="Watch on ${name}">
      <span class="wb-logo">${logo}</span>
      <span>Watch on ${name}</span>
      <span class="wb-arrow">${ARROW_SVG}</span>
    </a>`;

  card.addEventListener('click', (e) => {
    e.preventDefault();
    const url = platformUrl(p.platform);
    if (url) safeNavigateTo(url);
  });

  return card;
}

function updateCard(p) {
  const card = platformListEl.querySelector(`[data-platform="${p.platform}"]`);
  if (!card) return;

  card.querySelector('.stream-card-title').textContent = p.title || 'Live Stream';
  card.querySelector('.vc-num').textContent = formatNumber(p.viewers);

  const cat = card.querySelector('.meta-cat');
  const sep = card.querySelector('.meta-sep');
  const up = card.querySelector('.meta-up');
  const game = p.game || '';
  const uptime = p.uptime || '';
  cat.textContent = game;
  up.textContent = uptime;
  cat.style.display = game ? '' : 'none';
  up.style.display = uptime ? '' : 'none';
  sep.style.display = game && uptime ? '' : 'none';

  // Watch button destination
  const url = platformUrl(p.platform);
  const watch = card.querySelector('.watch-btn');
  if (url) watch.href = url;

  // Thumbnail - Twitch URLs carry {width}x{height} placeholders.
  const img = card.querySelector('.thumb-img');
  const pulse = card.querySelector('.pulse-ring');
  const cdnSrc = (p.thumbnail || '').replace('{width}', '480').replace('{height}', '270');
  if (!cdnSrc) {
    img.style.display = 'none';
    img.dataset.src = '';
    if (pulse) pulse.style.display = '';
    return;
  }
  if (img.dataset.src === cdnSrc) return; // already loaded/loading this exact url
  img.dataset.src = cdnSrc;
  getThumbBlob(cdnSrc).then((blobUrl) => {
    if (img.dataset.src !== cdnSrc) return; // url changed while fetching
    if (blobUrl) {
      img.onload = () => { 
        img.style.display = 'block'; 
        if (pulse) pulse.style.display = 'none';
      };
      img.src = blobUrl;
    } else {
      img.style.display = 'none';
      if (pulse) pulse.style.display = '';
    }
  });
}

function renderPlatformList(platforms) {
  const cinematic = platforms.length === 1;
  const signature = platforms.map((p) => p.platform).join(',') + (cinematic ? '|c' : '');

  if (signature !== lastListSignature) {
    platformListEl.innerHTML = '';
    platforms.forEach((p) => platformListEl.appendChild(buildCard(p, cinematic)));
    lastListSignature = signature;
  }

  platforms.forEach(updateCard);
}

// ---------------------------------------------------------------------------
// Reddit live-thread row
// ---------------------------------------------------------------------------

function updateRedditThread(data) {
  if (!redditThreadEl) return;
  if (data.isLive && data.livePostId) {
    const postId = String(data.livePostId).replace(/^t3_/, '');
    redditThreadUrl = `https://www.reddit.com/comments/${postId}`;
    redditThreadEl.href = redditThreadUrl;

    const parts = [];
    const comments = Number(data.postComments) || 0;
    const score = Number(data.postScore) || 0;
    if (comments > 0) parts.push(`${formatNumber(comments)} comment${comments === 1 ? '' : 's'}`);
    if (score > 0) parts.push(`${formatNumber(score)} upvote${score === 1 ? '' : 's'}`);
    if (redditThreadMetaEl) redditThreadMetaEl.textContent = parts.join(' · ');

    redditThreadEl.classList.remove('hidden');
  } else {
    redditThreadUrl = null;
    if (redditThreadMetaEl) redditThreadMetaEl.textContent = '';
    redditThreadEl.classList.add('hidden');
  }
}

// ---------------------------------------------------------------------------
// Main dashboard update
// ---------------------------------------------------------------------------

function updateDashboard(data) {
  const isNowLive = data.isLive;
  currentState = { ...currentState, ...data };

  lastFetchTime = new Date();
  updateTimestampDisplay();
  setUpdateMode('healthy');

  // Header: name + avatar
  const displayName = data.displayName || 'Streamer';
  displayNameEl.textContent = displayName;
  if (avatarInitialEl) avatarInitialEl.textContent = displayName.trim().charAt(0) || 'S';

  if (avatarImgEl && data.avatarUrl && data.avatarUrl !== loadedAvatarUrl) {
    loadedAvatarUrl = data.avatarUrl;
    if (isMockMode) {
      avatarImgEl.onload = () => {
        avatarImgEl.style.display = 'block';
        if (avatarInitialEl) avatarInitialEl.style.display = 'none';
      };
      avatarImgEl.src = data.avatarUrl;
    } else {
      fetchProxiedImage(data.avatarUrl).then((blobUrl) => {
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
  }

  dashboard.classList.toggle('is-live', isNowLive);

  // Status pill
  if (isNowLive) {
    statusIndicator.classList.remove('offline');
    statusIndicator.classList.add('live');
    statusLabel.textContent = 'LIVE';
  } else {
    statusIndicator.classList.remove('live');
    statusIndicator.classList.add('offline');
    statusLabel.textContent = 'OFFLINE';
  }

  const platforms = platformsFromData(data);

  // Header subtitle - live: how/where they're streaming; offline: last-live time
  if (headerSubEl) {
    if (isNowLive && platforms.length > 1) {
      headerSubEl.textContent = `Live on ${platforms.length} platforms`;
    } else if (isNowLive && platforms.length === 1) {
      headerSubEl.textContent = `Live on ${PLATFORM_NAME[platforms[0].platform] || 'stream'}`;
    } else if (isNowLive) {
      headerSubEl.textContent = 'Live now';
    } else {
      const ago = formatTimeAgo(data.lastLiveAt);
      headerSubEl.textContent = ago ? `Last live ${ago}` : 'Offline';
    }
  }

  if (isNowLive) {
    liveContent.classList.remove('hidden');
    offlineContent.classList.add('hidden');
    renderPlatformList(platforms);
    updateRedditThread(data);
  } else {
    liveContent.classList.add('hidden');
    offlineContent.classList.remove('hidden');
    lastListSignature = '';
    offlineNameEl.textContent = displayName;
    updateRedditThread(data);

    if (offlineSubtextEl) {
      const hasChannels = config.twitchUrl || config.youtubeUrl || config.kickUrl;
      offlineSubtextEl.textContent = hasChannels
        ? 'Follow below to get notified when the stream goes live.'
        : 'Check back soon!';
    }
  }

  // Platform links: only shown when offline (live cards carry their own watch CTAs)
  if (twitchLink)  twitchLink.classList.toggle('hidden',  isNowLive || !config.twitchUrl);
  if (youtubeLink) youtubeLink.classList.toggle('hidden', isNowLive || !config.youtubeUrl);
  if (kickLink)    kickLink.classList.toggle('hidden',    isNowLive || !config.kickUrl);

  loadingEl.classList.add('hidden');
  errorEl.classList.add('hidden');
  contentEl.classList.remove('hidden');
}

// ---------------------------------------------------------------------------
// Platform link wiring (offline buttons)
// ---------------------------------------------------------------------------

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
    safeNavigateTo(url);
  });
}

// ---------------------------------------------------------------------------
// Realtime + polling
// ---------------------------------------------------------------------------

async function initRealtime() {
  try {
    await connectRealtime({
      channel: 'livesticky_dashboard',
      onMessage: (msg) => {
        if (msg && msg.type === 'status-update') updateDashboard(msg.data);
      },
      onConnect: () => {
        console.log('[LiveSticky] Realtime connected - stopping poll fallback');
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

async function handleRefresh() {
  if (!refreshBtn || refreshBtn.classList.contains('spinning')) return;
  refreshBtn.classList.add('spinning');
  refreshBtn.disabled = true;
  try {
    if (isMockMode) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      const mockState = MOCK_STATUS[mockMode] || MOCK_STATUS.multistream;
      updateDashboard(mockState);
    } else {
      await fetchStatus();
    }
  } finally {
    setTimeout(() => {
      refreshBtn.classList.remove('spinning');
      refreshBtn.disabled = false;
    }, 500);
  }
}

// (Modal logic moved to init)

// ---------------------------------------------------------------------------
// Render logic
// ---------------------------------------------------------------------------

async function init() {
  if (refreshBtn) refreshBtn.addEventListener('click', handleRefresh);

  // Reddit live-thread row → open the discussion post.
  if (redditThreadEl) {
    redditThreadEl.addEventListener('click', (e) => {
      e.preventDefault();
      if (redditThreadUrl) safeNavigateTo(redditThreadUrl);
    });
  }

  setInterval(updateTimestampDisplay, 30000);

  setInterval(() => {
    if (!lastFetchTime || Date.now() - lastFetchTime.getTime() > 60000) setUpdateMode('');
  }, 15000);

  // Config must load BEFORE the first status render: updateDashboard() reads
  // config to decide platform-link visibility and the offline subtext, so a
  // parallel fetch can render the offline state with empty config (buttons
  // hidden, generic "Check back soon!") until the next update. Loading config
  // first makes the first paint correct without needing a manual refresh.
  if (isMockMode) {
    config = MOCK_CONFIG;
    updatePlatformLinks();
    const mockState = MOCK_STATUS[mockMode] || MOCK_STATUS.multistream;
    updateDashboard(mockState);

    // Periodically fluctuate mock viewers slightly to simulate live updates
    setInterval(() => {
      if (!currentState || !Array.isArray(currentState.platforms)) return;
      currentState.platforms.forEach((p) => {
        let delta = 0;
        if (p.platform === 'twitch') delta = Math.floor(Math.random() * 21) - 10;
        else if (p.platform === 'youtube') delta = Math.floor(Math.random() * 11) - 5;
        else if (p.platform === 'kick') delta = Math.floor(Math.random() * 7) - 3;
        
        p.viewers = Math.max(10, Number(p.viewers) + delta);
        updateCard(p);
      });
    }, 4000);
  } else {
    await fetchConfig();
    const statusOk = await fetchStatus();
    if (!statusOk) startPolling();
    initRealtime();
  }

  // Setup modal logic here to ensure DOM is 100% ready
  aboutModal = $('about-modal');
  aboutTrigger = $('about-trigger');
  closeModalBtn = $('close-modal-btn');
  linkWebsite = $('link-website');
  linkReddit = $('link-reddit');

  if (aboutTrigger && aboutModal && closeModalBtn) {
    // Remember what had focus so we can restore it when the modal closes.
    let lastFocused = null;

    const openModal = () => {
      lastFocused = document.activeElement;
      aboutModal.classList.remove('hidden');
      aboutModal.setAttribute('aria-hidden', 'false');
      closeModalBtn.focus();
    };

    const closeModal = () => {
      aboutModal.classList.add('hidden');
      aboutModal.setAttribute('aria-hidden', 'true');
      if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus();
    };

    aboutTrigger.addEventListener('click', openModal);
    closeModalBtn.addEventListener('click', closeModal);
    aboutModal.addEventListener('click', (e) => {
      if (e.target === aboutModal) closeModal();
    });
    // Escape closes the modal when it's open.
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !aboutModal.classList.contains('hidden')) closeModal();
    });
  }

  // Handle external links for Devvit Webview
  if (linkWebsite) {
    linkWebsite.addEventListener('click', (e) => {
      e.preventDefault();
      safeNavigateTo('https://livesticky.com');
    });
  }
  if (linkReddit) {
    linkReddit.addEventListener('click', (e) => {
      e.preventDefault();
      safeNavigateTo('https://www.reddit.com/user/iammesutkaya');
    });
  }
}

init();
