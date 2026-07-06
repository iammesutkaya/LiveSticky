# LiveSticky - Reddit Bot

![LiveSticky Logo](https://raw.githubusercontent.com/iammesutkaya/LiveSticky/main/assets/logo.png)

LiveSticky automates stream promotion on Reddit. It monitors Twitch, YouTube and Kick and automatically creates a pinned, interactive dashboard and live thread in your subreddit.

[![Devvit Platform](https://img.shields.io/badge/Platform-Reddit%20Devvit-FF4500?style=for-the-badge&logo=reddit)](https://developers.reddit.com)
[![Twitch Integration](https://img.shields.io/badge/Integration-Twitch%20Helix-9146FF?style=for-the-badge&logo=twitch)](https://dev.twitch.tv)
[![YouTube Integration](https://img.shields.io/badge/Integration-YouTube-FF0000?style=for-the-badge&logo=youtube)](https://developers.google.com/youtube)
[![Kick Integration](https://img.shields.io/badge/Integration-Kick-53FC18?style=for-the-badge&logo=kick)](https://kick.com)
[![Redis Cached](https://img.shields.io/badge/Database-Redis%20Cache-D82C20?style=for-the-badge&logo=redis)](https://redis.io)

LiveSticky handles the entire stream lifecycle automatically. When you go live on Twitch, YouTube, or Kick, the bot creates and pins a dedicated live thread and interactive dashboard that updates viewer statistics in real-time. Once the stream ends, it transitions the post into an offline VOD archive, locks comments to prevent late spam, and compiles the top clips into a highlights post (Twitch only).

## ✨ Core Features

| | Feature | Description |
| :---: | :--- | :--- |
| 📊 | **Interactive Live Dashboard** | An optional, premium custom post (webview) pinned to your subreddit that auto-updates with your stream state, viewer count, category, uptime, and clickable platform links. Created via the **Create LiveSticky Dashboard** mod menu item. |
| 🔴 | **Automatic Live Posts** | Polls your configured channel (every 2 minutes) and automatically creates/pins a dedicated discussion thread when you go live. |
| ⚡ | **Real-Time Statistics** | Keeps the live post body up to date with live uptime, game/category, and active viewer counts. |
| 🛡️ | **Stream Crash Protection (6-Min Grace Period)** | Prevents duplicate thread spam if your stream crashes briefly, OBS restarts, or the platform connection drops. LiveSticky waits 6 minutes before concluding the thread so you can reconnect seamlessly. |
| 📺 | **Multi-Platform Promotion** | Promotes your YouTube and Kick channels alongside Twitch. If configured, links to all active platforms are shown side-by-side. |
| 🏷️ | **Custom Post Flairing** | Automatically flairs the live post (e.g., "🔴 Live Now") using your community's custom post flair templates. |
| 📌 | **Pinned Moderator Comments** | Automatically posts a customizable, pinned moderator comment at the top of the thread to promote your Discord, socials, or highlight rules. |
| 🏁 | **Concluding VOD Archives** | When the stream concludes (offline for more than 6 minutes), LiveSticky transitions the live post into an offline archive state with VOD links, locks comments to prevent late spam, and unpins it. Optionally remove from feed or delete entirely. |
| 💬 | **Auto-Suggested Comment Sort** | Sets the suggested comment sort of the live thread to "New", "Live", or "Q&A" so the discussion section behaves like a real-time stream chat. |
| 🎥 | **Stream Highlights Post** | Queries the Twitch Clips API upon stream conclusion to automatically compile top clips and submit them as a standalone highlights post (Twitch only). |
| 🚀 | **Rate-Limit Protection** | Utilizes built-in caching via Redis to ensure status checks are lightweight, fast, and never get rate-limited by platform APIs. |
| 📱 | **Real-Time Sidebar Widget** | Creates and auto-updates a "STREAM STATUS" text widget in your community sidebar reflecting live/offline state, category, viewers, and uptime. |
| 👤 | **Streamer User Flair** | Automatically applies a custom user flair to the streamer when they go live (e.g. "🔴 LIVE NOW") and clears it when offline. |
| 📌 | **Community Highlights Fallback** | If both legacy sticky slots are taken, LiveSticky pins to Reddit's Community Highlights carousel (up to 6 slots) with an ANNOUNCEMENT label. |
| 🛠️ | **One-Click Moderator Actions** | Create dashboard, restart the status checker, refresh profile images, or get default templates instantly using custom moderator actions built into the subreddit context menu. |

---

## 📚 Documentation

Full setup instructions, configuration reference, and copy-paste templates live on the website:

* **[Setup Guide](https://livesticky.com/setup.html)** - Install the app and generate your Twitch, YouTube, and Kick API credentials.
* **[Configuration Reference](https://livesticky.com/settings.html)** - Every setting, placeholder, template, and mod menu action.
* **[FAQ](https://livesticky.com/faq.html)** - Answers regarding pricing, multistreaming, and crash protection.

## 🌐 Fetch Domains

This app makes outgoing HTTP requests to the following domains declared in [`devvit.json`](./devvit.json) (required by the Reddit App Review guidelines for transparency):

* **Platform APIs** (status checking and metadata): `id.twitch.tv`, `api.twitch.tv`, `youtube.googleapis.com`, `id.kick.com`, `api.kick.com`
* **Media CDNs** (proxying streamer avatars and thumbnails): `static-cdn.jtvnw.net`, `yt3.googleusercontent.com`, `i.ytimg.com`, `files.kick.com`, `i.redd.it`

No user data is sent to these services. Only moderator-configured API credentials are used for authentication. See the [Configuration Reference](https://livesticky.com/settings.html#fetch-domains) for what each domain is used for.

---

## 👨‍💻 Author & Credits

* **Developer:** Created by [u/iammesutkaya](https://reddit.com/u/iammesutkaya)
* **Twitch:** Follow the live channel at [twitch.tv/mesutkaya](https://twitch.tv/mesutkaya)

*Created with ❤️ for the community.*
