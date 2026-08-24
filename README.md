# LiveSticky - Automated Reddit Live Streaming Hub

![LiveSticky Logo](https://raw.githubusercontent.com/iammesutkaya/LiveSticky/main/assets/logo.png)

### Turn your subreddit into an automated live streaming hub for Twitch, YouTube & Kick.

LiveSticky monitors your stream status in real-time and automatically creates, updates, and pins dedicated live discussion threads, interactive stream dashboards, and clip compilations on your subreddit.

[![Install on Reddit](https://img.shields.io/badge/Install%20on%20Reddit-Devvit%20App-FF4500?style=for-the-badge&logo=reddit)](https://developers.reddit.com/apps/live-sticky)
[![Website](https://img.shields.io/badge/Official%20Website-livesticky.com-F5D474?style=for-the-badge&logo=googlechrome)](https://livesticky.com)
[![Twitch](https://img.shields.io/badge/Platform-Twitch%20Helix-9146FF?style=for-the-badge&logo=twitch)](https://dev.twitch.tv)
[![YouTube](https://img.shields.io/badge/Platform-YouTube-FF0000?style=for-the-badge&logo=youtube)](https://developers.google.com/youtube)
[![Kick](https://img.shields.io/badge/Platform-Kick-53FC18?style=for-the-badge&logo=kick)](https://kick.com)

---

## ✨ Why Subreddits Love LiveSticky

* 🔴 **100% Automated Live Posts**: When you go live on Twitch, YouTube, or Kick, LiveSticky instantly creates and pins a live discussion thread for your community with real-time viewer counts, game category, and uptime.
* 📊 **Interactive Live Dashboard**: Pin an interactive custom post widget to your subreddit displaying live status, stream preview details, and clickable platform links.
* 🛡️ **OBS & Wi-Fi Crash Protection**: Built-in 6-minute grace period prevents duplicate thread spam if your stream disconnects, OBS restarts, or your internet drops briefly.
* 🎬 **Automatic VOD Archives & Top Clips**: Concludes live posts into locked VOD archives when you go offline, and automatically compiles your top Twitch clips into standalone highlight posts.
* 📱 **Real-Time Sidebar Widget**: Auto-updates a community sidebar widget showing live status, streamer user flairs (e.g. `🔴 LIVE NOW`), and current viewer statistics.

---

## 📸 Screenshots & Previews

| Twitch Live Card | YouTube Live Card | Kick Live Card |
| :---: | :---: | :---: |
| ![Twitch Live Stream](https://raw.githubusercontent.com/iammesutkaya/LiveSticky/main/docs/twitch-stream.png) | ![YouTube Live Stream](https://raw.githubusercontent.com/iammesutkaya/LiveSticky/main/docs/youtube-stream.png) | ![Kick Live Stream](https://raw.githubusercontent.com/iammesutkaya/LiveSticky/main/docs/kick-stream.png) |

---

## ⚡ 3-Step Quick Start (Setup in < 2 Minutes)

1. **Install App**: Click **[Install on Reddit](https://developers.reddit.com/apps/live-sticky)** on the Reddit Developer Directory to add LiveSticky to your subreddit.
2. **Configure Channel**: Go to your **Subreddit Settings** -> **LiveSticky Configuration** and enter your Twitch, YouTube, or Kick channel names.
3. **Go Live**: LiveSticky automatically polls your channel, posts a pinned thread when you go live, and updates viewer stats every 2 minutes!

---

## 🛠️ Complete Feature Matrix

| | Feature | Description |
| :---: | :--- | :--- |
| 📊 | **Interactive Live Dashboard** | An optional custom webview post pinned to your subreddit that auto-updates with stream state, viewer count, category, uptime, and platform links. |
| 🔴 | **Automatic Live Posts** | Polls configured channels (every 2 minutes) and creates/pins a dedicated discussion thread when you go live. |
| ⚡ | **Real-Time Statistics** | Keeps the live post body updated with live uptime, game/category, and active viewer counts. |
| 🛡️ | **Configurable Crash Protection** | Prevents duplicate thread spam if your stream crashes briefly. LiveSticky waits a configurable grace period (default 6 minutes) before concluding the thread. |
| 📺 | **Multi-Platform Promotion** | Promotes your YouTube and Kick channels alongside Twitch with side-by-side platform links. |
| 🏷️ | **Custom Post Flairing** | Automatically flairs the live post (e.g. "🔴 Live Now") using your community's custom post flair templates. |
| 📌 | **Pinned Moderator Comments** | Automatically posts a customizable, pinned moderator comment at the top of the thread to promote Discord, socials, or rules. |
| 😴 | **Permanent Offline Post** | Recycles a single permanent pinned post when offline to announce news and links. Unpinned when live and pinned again when offline. |
| 🏁 | **Concluding VOD Archives** | Transitions live posts into offline archive states with VOD links, locks comments to prevent late spam, and unpins them when stream ends. |
| 💬 | **Auto-Suggested Comment Sort** | Sets suggested comment sort of live thread to "New", "Live", or "Q&A" so discussions behave like a real-time stream chat. |
| 🎥 | **Stream Highlights Post** | Queries the Twitch Clips API upon stream conclusion to automatically compile top clips into a standalone highlights post. |
| 🚀 | **Rate-Limit Circuit Breaker** | Built-in Redis caching and circuit breakers ensure status checks are lightweight, fast, and never hit API rate limits. |
| 📱 | **Real-Time Sidebar Widget** | Creates and auto-updates a "STREAM STATUS" text widget in your community sidebar reflecting live/offline state, category, viewers, and uptime. |
| 👤 | **Streamer User Flair** | Automatically applies a custom user flair to the streamer when live (e.g. "🔴 LIVE NOW") and clears it when offline. |
| 📌 | **Community Highlights Fallback** | If both legacy sticky slots are taken, LiveSticky pins to Reddit's Community Highlights carousel (up to 6 slots) with an ANNOUNCEMENT label. |
| 🛠️ | **One-Click Mod Actions** | Refresh bot state (flushing cached profile images, updating dashboard, immediate status check) instantly using the subreddit context menu. |

---

## 📚 Documentation & Guides

Full setup instructions, configuration reference, and copy-paste templates live on the website:

* **[Setup Guide](https://livesticky.com/setup.html)** – Install the app and generate Twitch, YouTube, and Kick API credentials.
* **[Mod Menu & Tools](https://livesticky.com/tools.html)** – Moderator actions, commands, and subreddit controls.
* **[Variables & Templates](https://livesticky.com/customization.html)** – Dynamic placeholders and copy-paste post templates.
* **[Configuration Reference](https://livesticky.com/configuration.html)** – Every setting, placeholder, template, and mod menu action.
* **[FAQ](https://livesticky.com/faq.html)** – Answers regarding multistreaming, crash protection, and wiki archives.

---

## 🔌 External APIs & Security

LiveSticky makes outbound HTTP requests to the following external domains (all declared and locked inside [`devvit.json`](./devvit.json)):

| Domain | Purpose |
| --- | --- |
| `id.twitch.tv` | Twitch OAuth 2.0 token endpoint |
| `api.twitch.tv` | Twitch Helix REST API (live status, metadata, clips) |
| `youtube.googleapis.com` | YouTube Data API v3 (channel resolution, live stream polling) |
| `id.kick.com` | Kick OAuth 2.0 token endpoint |
| `api.kick.com` | Kick public API (stream status, game categories) |
| `static-cdn.jtvnw.net` | Twitch image CDN (avatars, banners) |
| `yt3.googleusercontent.com` | YouTube image CDN (channel avatars) |
| `i.ytimg.com` | YouTube image CDN (stream thumbnails) |
| `files.kick.com` | Kick file CDN (avatars, thumbnails) |
| `i.redd.it` | Reddit image CDN (uploaded images) |

> 🔒 **Privacy & Data Handling**: No user data is sent to external services. Only moderator-configured API credentials are used for stream authentication. See [External APIs Reference](https://livesticky.com/apis.html) for full details.

---

## 👨‍💻 Author & Credits

* **Developer:** Created by [u/iammesutkaya](https://reddit.com/u/iammesutkaya)
* **Twitch:** Follow the live channel at [twitch.tv/mesutkaya](https://twitch.tv/mesutkaya)

*Created with ❤️ for the Reddit community.*
