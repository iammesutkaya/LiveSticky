<a href="https://livesticky.com">
  <img src="https://raw.githubusercontent.com/iammesutkaya/LiveSticky/main/assets/header.png" width="100%" alt="LiveSticky - Automated Reddit Live Streaming Hub">
</a>

# LiveSticky - Automated Reddit Live Streaming Hub for Twitch, YouTube & Kick

> **Automate stream promotion on Reddit.** LiveSticky monitors your Twitch, YouTube, and Kick channels in real-time to automatically create, pin, and update live discussion threads, interactive stream dashboards, and clip compilations on your subreddit.

🌍 **Official Website & Interactive Demos**: **[https://livesticky.com](https://livesticky.com)**

[![Official Website](https://img.shields.io/badge/Official%20Website-livesticky.com-F5D474?style=for-the-badge&logo=googlechrome)](https://livesticky.com)
[![Install on Reddit](https://img.shields.io/badge/Install%20on%20Reddit-Devvit%20App-FF4500?style=for-the-badge&logo=reddit)](https://developers.reddit.com/apps/live-sticky)
[![Twitch](https://img.shields.io/badge/Platform-Twitch%20Helix-9146FF?style=for-the-badge&logo=twitch)](https://dev.twitch.tv)
[![YouTube](https://img.shields.io/badge/Platform-YouTube-FF0000?style=for-the-badge&logo=youtube)](https://developers.google.com/youtube)
[![Kick](https://img.shields.io/badge/Platform-Kick-53FC18?style=for-the-badge&logo=kick)](https://kick.com)

---

## 🌐 Official Website & Documentation Hub

Visit **[livesticky.com](https://livesticky.com)** for complete guides, interactive demos, template variables, and configuration tools:

* 🚀 **[Setup Guide](https://livesticky.com/setup.html)** – 2-minute setup guide to install LiveSticky and connect Twitch, YouTube, or Kick.
* 🎛️ **[Interactive Live Demo](https://livesticky.com/demo)** – Try the interactive multistream dashboard in your browser.
* 🛠️ **[Mod Menu & Tools](https://livesticky.com/tools.html)** – Subreddit context menu actions, manual refresh tools, and moderator commands.
* 🎨 **[Variables & Templates](https://livesticky.com/customization.html)** – Copy-paste post templates and dynamic placeholders (`{streamer}`, `{viewers}`, `{category}`).
* ⚙️ **[Configuration Reference](https://livesticky.com/configuration.html)** – Full documentation for every setting, template, and mod control.
* 📜 **[Release Changelog](https://livesticky.com/changelog.html)** – Release notes, version history, and new feature announcements.
* ❓ **[FAQ](https://livesticky.com/faq.html)** – Answers regarding multistreaming, crash protection, and wiki archives.

---

## ✨ Why Subreddits Love LiveSticky

* 🔴 **100% Automated Live Posts**: When you go live on Twitch, YouTube, or Kick, LiveSticky instantly creates and pins a live discussion thread for your community with real-time viewer counts, game category, and uptime.
* 📊 **Interactive Live Dashboard**: Pin an interactive custom post widget to your subreddit displaying live status, stream preview details, and clickable platform links. Tested live on **[livesticky.com/demo](https://livesticky.com/demo)**.
* 🛡️ **OBS & Wi-Fi Crash Protection**: Built-in 6-minute grace period prevents duplicate thread spam if your stream disconnects, OBS restarts, or your internet drops briefly.
* 🎬 **Automatic VOD Archives & Top Clips**: Concludes live posts into locked VOD archives when you go offline, and automatically compiles your top Twitch clips into standalone highlight posts.
* 📱 **Real-Time Sidebar Widget**: Auto-updates a community sidebar widget showing live status, streamer user flairs (e.g. `🔴 LIVE NOW`), and current viewer statistics.

---

## ⚡ 3-Step Quick Start (Setup in < 2 Minutes)

1. **Install App**: Click **[Install on Reddit](https://developers.reddit.com/apps/live-sticky)** on the Reddit Developer Directory to add LiveSticky to your subreddit.
2. **Configure Channel**: Follow the **[Setup Guide at livesticky.com/setup](https://livesticky.com/setup.html)** to enter your Twitch, YouTube, or Kick channel names in Subreddit Settings.
3. **Go Live**: LiveSticky automatically polls your channel, posts a pinned thread when you go live, and updates viewer stats every 2 minutes!

---

## 🛠️ Complete Feature Matrix

| | Feature | Description | Reference |
| :---: | :--- | :--- | :--- |
| 📊 | **Interactive Live Dashboard** | Custom webview post pinned to your subreddit that auto-updates with stream state, viewer count, category, and platform links. | [Demo](https://livesticky.com/demo) |
| 🔴 | **Automatic Live Posts** | Polls configured channels (every 2 minutes) and creates/pins a dedicated discussion thread when you go live. | [Setup](https://livesticky.com/setup.html) |
| ⚡ | **Real-Time Statistics** | Keeps the live post body updated with live uptime, game/category, and active viewer counts. | [Config](https://livesticky.com/configuration.html) |
| 🛡️ | **Configurable Crash Protection** | Prevents duplicate thread spam if your stream crashes. LiveSticky waits a grace period (default 6 mins) before concluding. | [FAQ](https://livesticky.com/faq.html) |
| 📺 | **Multi-Platform Promotion** | Promotes your YouTube and Kick channels alongside Twitch with side-by-side platform links. | [Docs](https://livesticky.com) |
| 🏷️ | **Custom Post Flairing** | Automatically flairs live posts (e.g. "🔴 Live Now") using your community's custom post flair templates. | [Config](https://livesticky.com/configuration.html) |
| 📌 | **Pinned Moderator Comments** | Automatically posts a customizable, pinned moderator comment at the top of the thread to promote Discord or socials. | [Templates](https://livesticky.com/customization.html) |
| 😴 | **Permanent Offline Post** | Recycles a single permanent pinned post when offline to announce news and links. Unpinned when live and pinned again when offline. | [Config](https://livesticky.com/configuration.html) |
| 🏁 | **Concluding VOD Archives** | Transitions live posts into offline archive states with VOD links, locks comments to prevent late spam, and unpins them when stream ends. | [Config](https://livesticky.com/configuration.html) |
| 💬 | **Auto-Suggested Comment Sort** | Sets suggested comment sort of live thread to "New", "Live", or "Q&A" so discussions behave like a real-time stream chat. | [Tools](https://livesticky.com/tools.html) |
| 🎥 | **Stream Highlights Post** | Queries Twitch Clips API upon stream conclusion to automatically compile top clips into a standalone highlights post. | [Config](https://livesticky.com/configuration.html) |
| 🚀 | **Rate-Limit Circuit Breaker** | Built-in Redis caching and circuit breakers ensure status checks are lightweight, fast, and never hit API rate limits. | [Changelog](https://livesticky.com/changelog.html) |
| 📱 | **Real-Time Sidebar Widget** | Creates and auto-updates a "STREAM STATUS" text widget in your community sidebar reflecting live/offline state. | [Setup](https://livesticky.com/setup.html) |
| 👤 | **Streamer User Flair** | Automatically applies a custom user flair to the streamer when live (e.g. "🔴 LIVE NOW") and clears it when offline. | [Config](https://livesticky.com/configuration.html) |
| 📌 | **Community Highlights Fallback** | If both legacy sticky slots are taken, LiveSticky pins to Reddit's Community Highlights carousel (up to 6 slots). | [FAQ](https://livesticky.com/faq.html) |
| 🛠️ | **One-Click Mod Actions** | Refresh bot state (flushing cached profile images, updating dashboard, immediate status check) instantly using the mod menu. | [Tools](https://livesticky.com/tools.html) |

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

> 🔒 **Privacy & Security**: Zero user data tracking. Only moderator-configured API credentials are used for stream authentication. Read the full security disclosure at **[livesticky.com/apis.html](https://livesticky.com/apis.html)**.

---

## 👨‍💻 Author & Community

* **Official Website:** **[https://livesticky.com](https://livesticky.com)**
* **Developer:** Created by [u/iammesutkaya](https://reddit.com/u/iammesutkaya)
* **Twitch:** Follow the live channel at [twitch.tv/mesutkaya](https://twitch.tv/mesutkaya)

*Created with ❤️ for the Reddit community.*
