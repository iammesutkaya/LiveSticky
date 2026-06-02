/**
 * Default templates for LiveSticky posts and sidebar widgets.
 *
 * Available placeholders:
 *   {channel}       — Twitch channel name (lowercase)
 *   {display_name}  — Twitch display name
 *   {title}         — Stream title
 *   {game}          — Category / game name
 *   {viewers}       — Current viewer count
 *   {uptime}        — Stream uptime (e.g. "1h 23m")
 *   {youtube_url}   — YouTube URL (lines containing this are auto-removed if not configured)
 *
 * Highlights post only:
 *   {date}          — Stream date (e.g. "May 28, 2026")
 */

// ---------------------------------------------------------------------------
// Live post (submitted & pinned when stream goes live)
// ---------------------------------------------------------------------------
export const DEFAULT_LIVE_POST_TITLE = '🚨 {display_name} is LIVE! 🚨 — {title}';

export const DEFAULT_LIVE_POST_BODY = `\
* **Category/Game:** {game}
* **Current Viewers:** {viewers}
* **Uptime:** live for {uptime}

---
#### 📺 Channels:
* **🟣 Twitch:** [Watch Live on Twitch](https://twitch.tv/{channel})
* **🔴 YouTube:** [Watch Live on YouTube]({youtube_url})

---
*Stats are auto-updated in real-time by LiveSticky.*`;

// ---------------------------------------------------------------------------
// Concluding post body (live post is updated with this when the stream ends)
// ---------------------------------------------------------------------------
export const DEFAULT_CONCLUDING_POST_BODY = `\
### 👋 Stream Ended — Thanks for watching! 👋

**Title:**
{title}

The stream has concluded. VODs and highlights may be available via the links below.

---
#### 📺 Channels:
* **🟣 Twitch:** [Watch VODs on Twitch](https://twitch.tv/{channel})
* **🔴 YouTube:** [Watch VODs on YouTube]({youtube_url})

---
*This post is now locked as the stream has ended.*`;

// ---------------------------------------------------------------------------
// Offline post (permanent sticky post shown on the subreddit when stream is offline)
// ---------------------------------------------------------------------------
export const DEFAULT_OFFLINE_POST_TITLE = '😴 {display_name} is offline 😴';

export const DEFAULT_OFFLINE_POST_BODY = `\
The stream is currently offline. Check back soon or follow the channels below to get notified when {display_name} goes live!

---
#### 📺 Channels:
* **🟣 Twitch:** [Watch VODs on Twitch](https://twitch.tv/{channel})
* **🔴 YouTube:** [Watch VODs on YouTube]({youtube_url})`;

// ---------------------------------------------------------------------------
// Live sidebar widget
// ---------------------------------------------------------------------------
export const DEFAULT_LIVE_SIDEBAR = `\
# 🚨 {display_name} is LIVE! 🚨

**Title:**
{title}

* **Category/Game:** {game}
* **Current Viewers:** {viewers}
* **Uptime:** live for {uptime}

---
#### 📺 Channels:
* **🟣 Twitch:** [Watch Live on Twitch](https://twitch.tv/{channel})
* **🔴 YouTube:** [Watch Live on YouTube]({youtube_url})`;

// ---------------------------------------------------------------------------
// Offline sidebar widget
// ---------------------------------------------------------------------------
export const DEFAULT_OFFLINE_SIDEBAR = `\
# 😴 {display_name} is offline 😴

Follow the channels below to get notified when {display_name} goes live!

---
#### 📺 Channels:
* **🟣 Twitch:** [Watch VODs on Twitch](https://twitch.tv/{channel})
* **🔴 YouTube:** [Watch VODs on YouTube]({youtube_url})`;

// ---------------------------------------------------------------------------
// Highlights post (shown when stream highlights are enabled)
// ---------------------------------------------------------------------------
export const DEFAULT_HIGHLIGHTS_POST_TITLE = "🎬 Top Clips from {display_name}'s stream ({date})";

export const DEFAULT_HIGHLIGHTS_POST_HEADER = `\
**Title:**
{title}

Here are the most-watched Twitch clips from today's stream, compiled automatically by LiveSticky.`;

// ---------------------------------------------------------------------------
// Highlights post footer (shown below the auto-generated clip list)
// ---------------------------------------------------------------------------
export const DEFAULT_HIGHLIGHTS_POST_FOOTER = `\
---
*Watch VODs and catch the next stream live on [twitch.tv/{channel}](https://twitch.tv/{channel})!*`;
