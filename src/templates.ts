/**
 * Default templates for LiveSticky posts and sidebar widgets.
 *
 * Available placeholders:
 *
 * Active Stream (Dynamic):
 *   {stream_handle} - Username/handle of the active stream (e.g. "ninja" or "@pewdiepie")
 *   {stream_display_name} - Display name of the active stream
 *   {stream_title} - Stream title
 *   {stream_game} - Category / game name
 *   {stream_viewers} - Current viewer count
 *   {stream_uptime} - Stream uptime (e.g. "1h 23m")
 *
 * Platform Specific (Static based on settings):
 *   {twitch_channel} - Twitch channel name
 *   {youtube_channel} - YouTube channel handle
 *   {kick_channel} - Kick channel name
 *   {twitch_url} - Twitch URL (lines containing this are auto-removed if not configured)
 *   {youtube_url} - YouTube URL (lines containing this are auto-removed if not configured)
 *   {kick_url} - Kick URL (lines containing this are auto-removed if not configured)
 *
 * Highlights post only:
 *   {date} - Stream date (e.g. "May 28, 2026")
 */

// ---------------------------------------------------------------------------
// Live post (submitted & pinned when stream goes live)
// ---------------------------------------------------------------------------
export const DEFAULT_LIVE_POST_TITLE = '🚨 {stream_display_name} is LIVE! 🚨 - {stream_title}';

export const DEFAULT_LIVE_POST_BODY = `\
* **Category/Game:** {stream_game}
* **Current Viewers:** {stream_viewers}
* **Uptime:** live for {stream_uptime}

---
**Watch the stream on:**

🟪 **[Twitch]({twitch_url})**  •  🟥 **[YouTube]({youtube_url})**  •  🟩 **[Kick]({kick_url})**

---
*Stats are auto-updated in real-time by LiveSticky.*`;

// ---------------------------------------------------------------------------
// Concluding post body (live post is updated with this when the stream ends)
// ---------------------------------------------------------------------------
export const DEFAULT_CONCLUDING_POST_BODY = `\
### 👋 Stream Ended - Thanks for watching! 👋

**Title:**
{stream_title}

The stream has concluded. VODs and highlights may be available via the links below.

---
**Watch the VODs on:**

🟪 **[Twitch]({twitch_url})**  •  🟥 **[YouTube]({youtube_url})**  •  🟩 **[Kick]({kick_url})**

---
*This post is now locked as the stream has ended.*`;

// ---------------------------------------------------------------------------
// Offline post (permanent pinned post shown on the community when stream is offline)
// ---------------------------------------------------------------------------
export const DEFAULT_OFFLINE_POST_TITLE = '😴 {stream_display_name} is offline 😴';

export const DEFAULT_OFFLINE_POST_BODY = `\
The stream is currently offline. Check back soon or follow the channels below to get notified when {stream_display_name} goes live!

---
**Watch the VODs on:**

🟪 **[Twitch]({twitch_url})**  •  🟥 **[YouTube]({youtube_url})**  •  🟩 **[Kick]({kick_url})**`;

// ---------------------------------------------------------------------------
// Live sidebar widget
// ---------------------------------------------------------------------------
export const DEFAULT_LIVE_SIDEBAR = `\
# 🚨 {stream_display_name} is LIVE! 🚨

**Title:**
{stream_title}

* **Category/Game:** {stream_game}
* **Current Viewers:** {stream_viewers}
* **Uptime:** live for {stream_uptime}

---
**Watch the stream on:**

🟪 **[Twitch]({twitch_url})**  •  🟥 **[YouTube]({youtube_url})**  •  🟩 **[Kick]({kick_url})**`;

// ---------------------------------------------------------------------------
// Offline sidebar widget
// ---------------------------------------------------------------------------
export const DEFAULT_OFFLINE_SIDEBAR = `\
# 😴 {stream_display_name} is offline 😴

Follow the channels below to get notified when {stream_display_name} goes live!

---
**Watch the VODs on:**

🟪 **[Twitch]({twitch_url})**  •  🟥 **[YouTube]({youtube_url})**  •  🟩 **[Kick]({kick_url})**`;

// ---------------------------------------------------------------------------
// Highlights post (shown when stream highlights are enabled)
// ---------------------------------------------------------------------------
// This is one persistent post that LiveSticky re-edits after every stream, so
// the title cannot contain per-stream values like {date} (Reddit does not allow
// editing a post title). Per-stream dates live in the body headings instead.
export const DEFAULT_HIGHLIGHTS_POST_TITLE = "🎬 Top Clips - {stream_display_name}";

export const DEFAULT_HIGHLIGHTS_POST_HEADER = `\
The most-watched Twitch clips from {stream_display_name}'s recent streams, compiled automatically by LiveSticky. Newest stream first.`;

// ---------------------------------------------------------------------------
// Highlights post footer (shown below the auto-generated clip list)
// ---------------------------------------------------------------------------
export const DEFAULT_HIGHLIGHTS_POST_FOOTER = `\
---
*Watch VODs and catch the next stream live on [twitch.tv/{twitch_channel}](https://twitch.tv/{twitch_channel})!*`;

// ---------------------------------------------------------------------------
// Monthly highlights post (top clips of the whole month)
// ---------------------------------------------------------------------------
export const DEFAULT_MONTHLY_HIGHLIGHTS_POST_TITLE = "🏆 Top 20 Clips of {month} - {stream_display_name}";

export const DEFAULT_MONTHLY_HIGHLIGHTS_POST_HEADER = `\
The 20 most-watched Twitch clips from {month}, compiled automatically by LiveSticky.`;

export const DEFAULT_MONTHLY_HIGHLIGHTS_POST_FOOTER = `\
---
*Catch the next stream live on [twitch.tv/{twitch_channel}](https://twitch.tv/{twitch_channel})!*`;
