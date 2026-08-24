<a href="https://livesticky.com">
  <img src="https://raw.githubusercontent.com/iammesutkaya/LiveSticky/main/assets/header.png" width="100%" alt="LiveSticky - Automated Reddit Live Streaming Hub">
</a>

# LiveSticky — Auto-pin live threads when your streamers go live

**Stop manually posting, pinning, and deleting stream threads.** LiveSticky watches your community's Twitch, YouTube, and Kick channels and does it all for you — creating a pinned live thread the moment someone goes live, keeping viewer counts and category fresh, then archiving it with the VOD when the stream ends.

[![Install on Reddit](https://img.shields.io/badge/Install%20on%20Reddit-Add%20to%20your%20subreddit-FF4500?style=for-the-badge&logo=reddit)](https://developers.reddit.com/apps/live-sticky)
[![Try the live demo](https://img.shields.io/badge/Try%20the%20live%20demo-livesticky.com-F5D474?style=for-the-badge&logo=googlechrome)](https://livesticky.com/demo)

---

## Why mods install it

* **Zero manual work.** Go live → pinned discussion thread appears automatically. Go offline → it's archived and unpinned. No mod lifts a finger.
* **Won't spam your sub.** A 6-minute grace period rides out OBS restarts, dropped Wi-Fi, and brief disconnects — no duplicate threads. Redis caching + circuit breakers mean it never trips platform rate limits.
* **Live stats, always current.** Viewer count, game/category, and uptime refresh every 2 minutes in the thread, a pinnable dashboard widget, and a sidebar status widget.
* **Works across Twitch, YouTube, and Kick.** One app, side-by-side platform links, per-platform live detection.
* **Set up in under 2 minutes.** No code. Enter your channel names in Subreddit Settings and you're done.

---

## Quick start

1. **[Add LiveSticky to your subreddit](https://developers.reddit.com/apps/live-sticky)** from the Reddit Developer Directory.
2. Enter your Twitch / YouTube / Kick channel names in Subreddit Settings — full walkthrough in the **[2-minute Setup Guide](https://livesticky.com/setup.html)**.
3. Go live. LiveSticky posts a pinned thread and keeps it updated every 2 minutes.

Want to see it first? **[Try the interactive dashboard demo →](https://livesticky.com/demo)**

---

## Everything it does

| | Feature | What it does |
| :---: | :--- | :--- |
| 🔴 | **Automatic live posts** | Polls your channels every 2 min; creates and pins a discussion thread when you go live. |
| 📊 | **Interactive live dashboard** | Pinnable custom post that auto-updates with live status, stream preview, and platform links. |
| ⚡ | **Real-time stats** | Keeps the thread updated with uptime, category, and viewer count. |
| 🛡️ | **Crash protection** | Configurable grace period (default 6 min) rides out crashes and drops without duplicate threads. |
| 🏁 | **VOD archives** | Concludes live threads into locked offline archives with VOD links, then unpins them. |
| 🎥 | **Top clips highlights** | Compiles your top Twitch clips into a standalone highlights post when a stream ends. |
| 📱 | **Sidebar widget** | Auto-updating "STREAM STATUS" widget reflecting live/offline state. |
| 👤 | **Streamer user flair** | Applies a "🔴 LIVE NOW" flair while live, clears it when offline. |
| 🏷️ | **Custom post flair** | Flairs live posts using your community's own flair templates. |
| 📌 | **Pinned mod comment** | Auto-posts a customizable pinned comment to promote your Discord or socials. |
| 😴 | **Permanent offline post** | Recycles one pinned post between streams for news and links. |
| 💬 | **Suggested comment sort** | Sets the thread to New / Live / Q&A so it behaves like live chat. |
| 📌 | **Community Highlights fallback** | Pins to the Highlights carousel when both sticky slots are taken. |
| 🛠️ | **One-click mod actions** | Refresh state, flush cached images, and force a status check from the mod menu. |

Full docs, template variables, and configuration reference at **[livesticky.com](https://livesticky.com)** ([Setup](https://livesticky.com/setup.html) · [Customization](https://livesticky.com/customization.html) · [Config](https://livesticky.com/configuration.html) · [FAQ](https://livesticky.com/faq.html)).

---

## Privacy & security

Zero user-data tracking. LiveSticky only uses the API credentials a moderator configures. Every outbound request goes to one of the domains below — all declared and locked in [`devvit.json`](./devvit.json):

| Domain | Purpose |
| --- | --- |
| `id.twitch.tv` | Twitch OAuth 2.0 token endpoint |
| `api.twitch.tv` | Twitch Helix API (live status, metadata, clips) |
| `youtube.googleapis.com` | YouTube Data API v3 (channel resolution, live polling) |
| `id.kick.com` | Kick OAuth 2.0 token endpoint |
| `api.kick.com` | Kick public API (stream status, categories) |
| `static-cdn.jtvnw.net` | Twitch image CDN (avatars, banners) |
| `yt3.googleusercontent.com` | YouTube image CDN (channel avatars) |
| `i.ytimg.com` | YouTube image CDN (stream thumbnails) |
| `files.kick.com` | Kick file CDN (avatars, thumbnails) |
| `i.redd.it` | Reddit image CDN (uploaded images) |

Full security disclosure at **[livesticky.com/apis.html](https://livesticky.com/apis.html)**.

---

Created by [u/iammesutkaya](https://reddit.com/u/iammesutkaya) · **[livesticky.com](https://livesticky.com)** · [twitch.tv/mesutkaya](https://twitch.tv/mesutkaya)
