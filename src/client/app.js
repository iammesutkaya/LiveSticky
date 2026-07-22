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
  if (!url || isNavigating) return;
  isNavigating = true;
  let devvitHandled = false;
  try {
    if (typeof navigateTo === 'function') {
      navigateTo(url);
      devvitHandled = true;
    }
  } catch (err) {
    devvitHandled = false;
  }
  if (!devvitHandled) {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
  setTimeout(() => { isNavigating = false; }, 800);
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
        thumbnail: "twitch-stream.png?v=3"
      },
      {
        platform: "youtube",
        title: "LiveSticky Launch: Live Q&A & Code Walkthrough",
        viewers: 850,
        game: "Science & Technology",
        uptime: "1h 45m",
        thumbnail: "youtube-stream.png?v=3"
      },
      {
        platform: "kick",
        title: "Late Night Coding Session - Building on Devvit",
        viewers: 310,
        game: "Coding",
        uptime: "45m",
        thumbnail: "kick-stream.png?v=3"
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
        thumbnail: "twitch-stream.png?v=3"
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

const MAX_THUMB_CACHE_SIZE = 20;

/** Cached proxy fetch for thumbnails - one blob per distinct CDN url. */
async function getThumbBlob(cdnUrl) {
  if (thumbBlobCache.has(cdnUrl)) return thumbBlobCache.get(cdnUrl);
  const blob = await fetchProxiedImage(cdnUrl);
  if (blob) {
    if (thumbBlobCache.size >= MAX_THUMB_CACHE_SIZE) {
      const oldestKey = thumbBlobCache.keys().next().value;
      if (oldestKey) {
        const oldBlobUrl = thumbBlobCache.get(oldestKey);
        if (oldBlobUrl && oldBlobUrl.startsWith('blob:')) {
          URL.revokeObjectURL(oldBlobUrl);
        }
        thumbBlobCache.delete(oldestKey);
      }
    }
    thumbBlobCache.set(cdnUrl, blob);
  }
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
  const url = platformUrl(p.platform) || '#';
  const card = document.createElement('a');
  card.href = url;
  card.target = '_blank';
  card.rel = 'noopener noreferrer';
  card.className = `stream-card${cinematic ? ' cinematic' : ''}`;
  card.dataset.platform = p.platform;
  const name = PLATFORM_NAME[p.platform] || p.platform;
  const logo = PLATFORM_LOGO[p.platform] || '';

  const chipHtml = `
    <span class="reddit-thread-chip hidden" role="button" aria-label="Join live discussion thread on Reddit" title="Join live discussion thread on Reddit">
      <span class="rtc-badge" aria-hidden="true">
        <svg class="rtc-icon" width="10" height="9" viewBox="0 0 19.21 16.8" fill="currentColor">
          <path d="M13.99,0c1.1,0,2,.89,2,2s-.9,2-2,2c-.95,0-1.74-.66-1.95-1.54h0c-1.15.16-2.03,1.15-2.03,2.34h0c1.78.07,3.4.57,4.69,1.37.47-.36,1.06-.58,1.71-.58,1.55,0,2.8,1.26,2.8,2.8,0,1.12-.66,2.08-1.6,2.53-.09,3.26-3.64,5.88-8,5.88S1.71,14.18,1.61,10.93c-.95-.45-1.61-1.41-1.61-2.54,0-1.55,1.26-2.8,2.8-2.8.64,0,1.24.22,1.71.59,1.27-.79,2.88-1.29,4.64-1.36h0c0-1.67,1.26-3.04,2.88-3.22C12.22.68,13.03,0,13.99,0ZM5.91,8.38c-.78,0-1.46.78-1.51,1.8-.05,1.02.64,1.43,1.43,1.43s1.37-.37,1.42-1.39c.05-1.02-.55-1.84-1.34-1.84ZM13.31,8.38c-.79,0-1.39.82-1.34,1.84.05,1.02.63,1.39,1.42,1.39s1.47-.41,1.43-1.43c-.05-1.02-.72-1.8-1.51-1.8ZM9.61,12.39c-.97,0-1.91.05-2.77.14-.15.02-.24.17-.18.31.48,1.15,1.62,1.96,2.95,1.96s2.47-.81,2.95-1.96c.06-.14-.04-.29-.18-.31-.86-.09-1.8-.14-2.77-.14Z"/>
        </svg>
      </span>
      <span class="rtc-comments-wrap">
        <span class="rtc-num">0</span>
        <svg class="rtc-msg-icon" width="10" height="10" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
          <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>
        </svg>
      </span>
      <span class="rtc-score-wrap" style="display:none">
        <span class="rtc-score">0</span>
        <svg class="rtc-up-icon" width="13.5" height="13.5" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
          <path d="M9 18v-6H5l7-7 7 7h-4v6H9z"/>
        </svg>
      </span>
    </span>`;

  card.innerHTML = `
    <div class="stream-card-main">
      <div class="thumb platform-${p.platform} skeleton">
        <img alt="" class="thumb-img" style="display:none">
        <span class="platform-badge platform-${p.platform}">${logo}<span class="pb-name">${name}</span></span>
        <span class="viewer-chip">
          <svg class="vc-icon" width="11" height="11" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          <span class="vc-num">0</span>
        </span>
        ${cinematic ? chipHtml : ''}
      </div>
      <div class="stream-card-info">
        <div class="info-top">
          <div class="stream-card-title"></div>
          <div class="meta-text meta-cat"></div>
        </div>
        ${!cinematic ? `
          <div class="info-bottom">
            <span class="rtc-label">Join the live thread</span>
            ${chipHtml}
          </div>` : ''}
      </div>
    </div>`;

  card.addEventListener('click', (e) => {
    e.preventDefault();
    const targetUrl = platformUrl(p.platform);
    if (targetUrl) safeNavigateTo(targetUrl);
  });

  const threadChip = card.querySelector('.reddit-thread-chip');
  if (threadChip) {
    threadChip.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (redditThreadUrl) safeNavigateTo(redditThreadUrl);
    });
  }

  return card;
}

function updateCard(p) {
  const card = platformListEl.querySelector(`[data-platform="${p.platform}"]`);
  if (!card) return;

  card.querySelector('.stream-card-title').textContent = p.title || 'Live Stream';
  card.querySelector('.vc-num').textContent = formatNumber(p.viewers);

  const cat = card.querySelector('.meta-cat');
  const game = p.game || '';

  if (cat) {
    cat.textContent = game;
    cat.style.display = game ? '' : 'none';
  }

  // Thumbnail - Twitch URLs carry {width}x{height} placeholders.
  const thumbContainer = card.querySelector('.thumb');
  const img = card.querySelector('.thumb-img');
  const cdnSrc = (p.thumbnail || '').replace('{width}', '480').replace('{height}', '270');
  if (!cdnSrc) {
    img.style.display = 'none';
    img.dataset.src = '';
    if (thumbContainer) thumbContainer.classList.remove('skeleton');
    return;
  }
  if (img.dataset.src === cdnSrc && img.style.display === 'block') {
    if (thumbContainer) thumbContainer.classList.remove('skeleton');
    return; // already rendered
  }
  img.dataset.src = cdnSrc;

  // Synchronous cache hit check to eliminate thumbnail flickering when switching demo sizes/views
  if (thumbBlobCache.has(cdnSrc)) {
    const cachedBlobUrl = thumbBlobCache.get(cdnSrc);
    if (cachedBlobUrl) {
      img.src = cachedBlobUrl;
      img.style.display = 'block';
      if (thumbContainer) thumbContainer.classList.remove('skeleton');
      return;
    }
  }

  if (thumbContainer) thumbContainer.classList.add('skeleton');

  getThumbBlob(cdnSrc).then((blobUrl) => {
    if (img.dataset.src !== cdnSrc) return; // url changed while fetching
    if (blobUrl) {
      img.src = blobUrl;
      img.style.display = 'block';
      if (thumbContainer) thumbContainer.classList.remove('skeleton');
    } else {
      img.style.display = 'none';
      if (thumbContainer) thumbContainer.classList.remove('skeleton');
    }
  });
}

let activePlatformIndex = 0;
let forcedHeightMode = new URLSearchParams(window.location.search).get('heightMode');
let currentPlatforms = [];

window.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'heightMode') {
    if (forcedHeightMode === e.data.heightMode) return;
    forcedHeightMode = e.data.heightMode;
    lastListSignature = '';
    if (currentPlatforms.length > 0) {
      renderPlatformList(currentPlatforms);
      if (platformListEl) {
        platformListEl.style.animation = 'none';
        void platformListEl.offsetHeight;
        platformListEl.style.animation = 'fadeSlideIn 0.35s cubic-bezier(0.16, 1, 0.3, 1)';
      }
    }
  }
});

function renderPlatformList(platforms) {
  const isMultistream = platforms.length > 1;
  const isCompactLayout = forcedHeightMode
    ? (forcedHeightMode === 'compact')
    : (window.innerHeight <= 380);

  const signature = platforms.map((p) => p.platform).join(',') + 
    (isMultistream
      ? (isCompactLayout ? `|compact:${activePlatformIndex}` : '|tall')
      : (isCompactLayout ? '|single:compact' : '|single:tall'));

  // Make sure activePlatformIndex stays in bounds if platforms list changes
  if (activePlatformIndex >= platforms.length) {
    activePlatformIndex = 0;
  }

  if (signature !== lastListSignature) {
    platformListEl.innerHTML = '';

    if (!isMultistream) {
      // Single live platform: ALWAYS use cinematic 16:9 hero layout!
      platformListEl.appendChild(buildCard(platforms[0], true));
    } else if (isCompactLayout) {
      // Multistream + Compact Mode (320px): Chips on TOP, Hero card (standard card without watch bar) BELOW
      const chipsEl = document.createElement('div');
      chipsEl.className = 'platform-selector-chips';
      chipsEl.role = 'tablist';
      chipsEl.ariaLabel = 'Select live stream platform';

      platforms.forEach((p, idx) => {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = `platform-chip platform-${p.platform}${idx === activePlatformIndex ? ' active' : ''}`;
        chip.role = 'tab';
        chip.ariaSelected = idx === activePlatformIndex ? 'true' : 'false';

        const name = PLATFORM_NAME[p.platform] || p.platform;
        const logo = PLATFORM_LOGO[p.platform] || '';
        const viewersFormatted = formatNumber(p.viewers);

        chip.innerHTML = `
          <span class="chip-logo">${logo}</span>
          <span class="chip-name">${name}</span>
          <span class="chip-viewers">${viewersFormatted}</span>
        `;

        chip.addEventListener('click', (e) => {
          e.preventDefault();
          if (activePlatformIndex === idx) {
            // Clicking active chip navigates to watch
            const url = platformUrl(p.platform);
            if (url) safeNavigateTo(url);
            return;
          }
          activePlatformIndex = idx;
          lastListSignature = '';
          renderPlatformList(platforms);
        });

        chipsEl.appendChild(chip);
      });

      platformListEl.appendChild(chipsEl);

      // Hero Card below chips - standard card layout, watch button hidden for compact mode
      const activePlatform = platforms[activePlatformIndex] || platforms[0];
      const heroCard = buildCard(activePlatform, false);
      heroCard.classList.add('compact-hero-card');
      const watchBtn = heroCard.querySelector('.watch-btn');
      if (watchBtn) watchBtn.style.display = 'none';
      platformListEl.appendChild(heroCard);
    } else {
      // Multistream + Tall Mode (512px): render ALL platforms as cards!
      platforms.forEach((p) => {
        platformListEl.appendChild(buildCard(p, false));
      });
    }

    lastListSignature = signature;
  }

  // Update card data & thumbnails
  if (!isMultistream) {
    updateCard(platforms[0]);
  } else if (isCompactLayout) {
    const activePlatform = platforms[activePlatformIndex] || platforms[0];
    updateCard(activePlatform);

    // Update chip viewer counts in place
    platforms.forEach((p, idx) => {
      const chip = platformListEl.querySelectorAll('.platform-chip')[idx];
      if (chip) {
        const vEl = chip.querySelector('.chip-viewers');
        if (vEl) vEl.textContent = formatNumber(p.viewers);
      }
    });
  } else {
    // Tall layout: update all cards
    platforms.forEach((p) => {
      updateCard(p);
    });
  }

  updateRedditThread(currentState);
}

// Re-evaluate platform list layout on window resize
window.addEventListener('resize', () => {
  if (currentPlatforms.length > 0) {
    lastListSignature = '';
    renderPlatformList(currentPlatforms);
  }
});

// ---------------------------------------------------------------------------
// Reddit live-thread chip
// ---------------------------------------------------------------------------

function updateRedditThread(data) {
  const isCompactLayout = forcedHeightMode
    ? (forcedHeightMode === 'compact')
    : (window.innerHeight <= 380);

  const chips = platformListEl ? platformListEl.querySelectorAll('.reddit-thread-chip') : [];

  if (data.isLive && data.livePostId) {
    const postId = String(data.livePostId).replace(/^t3_/, '');
    redditThreadUrl = `https://www.reddit.com/comments/${postId}`;

    const comments = Number(data.postComments) || 0;
    const score = Number(data.postScore) || 0;

    if (isCompactLayout) {
      // Compact (320px) mode: show integrated round pill chip inside card, hide standalone button
      if (platformListEl) {
        platformListEl.querySelectorAll('.info-bottom').forEach(el => el.style.display = '');
      }
      const countText = formatNumber(comments);
      const ariaLabel = `Reddit live discussion thread: ${comments} comment${comments === 1 ? '' : 's'}${score > 0 ? `, ${score} upvote${score === 1 ? '' : 's'}` : ''}`;
      chips.forEach(chip => {
        chip.href = redditThreadUrl;
        chip.setAttribute('aria-label', ariaLabel);
        chip.setAttribute('title', ariaLabel);
        const numEl = chip.querySelector('.rtc-num');
        if (numEl) numEl.textContent = countText;

        const scoreWrap = chip.querySelector('.rtc-score-wrap');
        const scoreEl = chip.querySelector('.rtc-score');
        if (scoreWrap && scoreEl) {
          if (score > 0) {
            scoreEl.textContent = formatNumber(score);
            scoreWrap.style.display = 'inline-flex';
          } else {
            scoreWrap.style.display = 'none';
          }
        }
        chip.classList.remove('hidden');
      });
      if (redditThreadEl) redditThreadEl.classList.add('hidden');
    } else {
      // Tall (512px) mode: hide in-card CTA (.info-bottom), show standalone CTA button below
      if (platformListEl) {
        platformListEl.querySelectorAll('.info-bottom').forEach(el => el.style.display = 'none');
      }
      chips.forEach(chip => chip.classList.add('hidden'));
      if (redditThreadEl) {
        redditThreadEl.href = redditThreadUrl;
        const parts = [];
        parts.push(`${formatNumber(comments)} comment${comments === 1 ? '' : 's'}`);
        if (score > 0) parts.push(`${formatNumber(score)} upvote${score === 1 ? '' : 's'}`);
        if (redditThreadMetaEl) redditThreadMetaEl.textContent = parts.join('   ');
        redditThreadEl.classList.remove('hidden');
      }
    }
  } else {
    redditThreadUrl = null;
    chips.forEach(chip => chip.classList.add('hidden'));
    if (redditThreadEl) {
      if (redditThreadMetaEl) redditThreadMetaEl.textContent = '';
      redditThreadEl.classList.add('hidden');
    }
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
  currentPlatforms = platforms;

  // Header subtitle - live: how/where they're streaming + uptime; offline: last-live time
  if (headerSubEl) {
    const activeUptime = isNowLive && platforms.length > 0 ? (platforms[0].uptime || data.uptime || '') : '';
    const uptimeSuffix = activeUptime ? `  •  ${activeUptime}` : '';

    if (isNowLive && platforms.length > 1) {
      headerSubEl.textContent = `Live on ${platforms.length} platforms${uptimeSuffix}`;
    } else if (isNowLive && platforms.length === 1) {
      headerSubEl.textContent = `Live on ${PLATFORM_NAME[platforms[0].platform] || 'stream'}${uptimeSuffix}`;
    } else if (isNowLive) {
      headerSubEl.textContent = `Live now${uptimeSuffix}`;
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
        ? 'Follow below to get notified when live.'
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
  const linkWebsite = $('link-website');
  const linkReddit = $('link-reddit');
  const linkVersion = $('link-version');
  const linkAuthor = $('link-author');

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
      safeNavigateTo('https://developers.reddit.com/apps/live-sticky');
    });
  }
  if (linkVersion) {
    linkVersion.addEventListener('click', (e) => {
      e.preventDefault();
      safeNavigateTo('https://developers.reddit.com/apps/live-sticky');
    });
  }
  if (linkAuthor) {
    linkAuthor.addEventListener('click', (e) => {
      e.preventDefault();
      safeNavigateTo('https://www.reddit.com/user/iammesutkaya');
    });
  }
}

init();
