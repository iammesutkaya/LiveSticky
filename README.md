# LiveSticky - Reddit Bot

![LiveSticky Logo](https://raw.githubusercontent.com/iammesutkaya/LiveSticky/main/assets/logo.png)

LiveSticky monitors your Twitch stream and updates your community by pinning a post, updating your sidebar, and sharing highlights when the stream ends.

[![Devvit Platform](https://img.shields.io/badge/Platform-Reddit%20Devvit-FF4500?style=for-the-badge&logo=reddit)](https://developers.reddit.com)
[![Twitch Integration](https://img.shields.io/badge/Integration-Twitch%20Helix-9146FF?style=for-the-badge&logo=twitch)](https://dev.twitch.tv)
[![YouTube Integration](https://img.shields.io/badge/Integration-YouTube-FF0000?style=for-the-badge&logo=youtube)](https://developers.google.com/youtube)
[![Kick Integration](https://img.shields.io/badge/Integration-Kick-53FC18?style=for-the-badge&logo=kick)](https://kick.com)
[![Redis Cached](https://img.shields.io/badge/Database-Redis%20Cache-D82C20?style=for-the-badge&logo=redis)](https://redis.io)

It handles the entire stream lifecycle automatically: from flairing and pinning a new live post when you go live, to updating viewer stats in real-time, and sharing a highlights post with a VOD archive when the stream ends. It can also pin an interactive **dashboard** - a live-updating custom post showing your current status, viewer count, category, uptime, and platform links.

## ✨ Core Features

| | Feature | Description |
| :---: | :--- | :--- |
| 🔴 | **Automatic Live Posts** | Periodically polls your Twitch stream (every 2 minutes) and creates a pinned live post when you go live. |
| ⚡ | **Real-Time Statistics** | Keeps the live post body up-to-date in real-time with current uptime, game/category, and live viewer count. |
| 🛡️ | **Stream Crash Protection (6-Min Grace Period)** | Prevents duplicate post spam if your stream crashes briefly, OBS restarts, or Twitch has a quick hiccup. LiveSticky waits 6 minutes before concluding the post so you can reconnect seamlessly. |
| 📺 | **Multi-Platform Promotion** | Optionally promotes your YouTube and Kick channels alongside Twitch. If configured, links to all platforms are displayed side-by-side in both live and concluding posts. |
| 🏷️ | **Custom Post Flairing** | Automatically flairs the live post (e.g., "🔴 Live Now") using your community's custom post flair templates. |
| 📌 | **Pinned Moderator Comments** | Auto-posts a customizable, pinned moderator comment at the top of the discussion section, where you can promote your Discord & social media, or list community rules. |
| 🏁 | **Concluding VOD Archives** | When the stream goes offline for more than 6 minutes, LiveSticky edits the live post to a clean "Offline / Thanks for watching!" archive state, highlights VOD links, locks the post to prevent late spam, and unpins it. |
| 💬 | **Auto-Suggested Comment Sort** | Automatically sets the suggested comment sort of the live post to "New" so the comment section behaves like a real-time stream chat. |
| 🎥 | **Stream Highlights Post** | Queries Twitch Helix Clips API upon stream conclusion to automatically compile the top 5 clips generated during that stream and submit them as a standalone highlights post. |
| 🚀 | **Speed & Rate-Limit Protection** | Uses built-in caching to ensure status checks are fast, lightweight, and never get rate-limited by Twitch's API. |
| 📊 | **Interactive Live Dashboard** | An optional pinned custom post (webview) that auto-updates with the live/offline state, viewer count, category, uptime, and clickable platform links. Create it from the **Create LiveSticky Dashboard** mod menu item. |
| 🛠️ | **One-Click Moderator Reset** | Restart the status checker or clear the cache instantly using a custom mod tools shortcut directly on your community. |

---

## 📚 Documentation

Full setup instructions, the complete settings/placeholder reference, and copy-paste default templates now live on the website instead of this README:

* **[Setup Guide](https://livesticky.com/setup.html)** - install the app and generate your Twitch, YouTube, and Kick API credentials.
* **[Configuration Reference](https://livesticky.com/settings.html)** - every setting, placeholder, default template, and mod menu action.
* **[FAQ](https://livesticky.com/faq.html)** - common questions about pricing, multistreaming, and crash protection.

## 🌐 Fetch Domains

This app makes HTTP requests to `id.twitch.tv`, `api.twitch.tv`, `youtube.googleapis.com`, `id.kick.com`, and `api.kick.com` (declared in [`devvit.json`](./devvit.json)) to poll live status and fetch stream metadata. No user data is sent to these services - only moderator-configured Client IDs, Client Secrets, and API keys are used for authentication. See the [Configuration Reference](https://livesticky.com/settings.html#fetch-domains) for what each domain is used for.

---

## 🗺️ Roadmap

See the [ROADMAP.md](./ROADMAP.md) file for our upcoming features, integrations, and future enhancements!

---

## 👨‍💻 Author & Credits

* **Developer:** Created by [u/iammesutkaya](https://reddit.com/u/iammesutkaya)
* **Twitch:** Follow the live channel at [twitch.tv/mesutkaya](https://twitch.tv/mesutkaya)

*Created with ❤️ for the community.*
