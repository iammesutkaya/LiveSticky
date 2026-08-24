<a href="https://livesticky.com">
  <img src="https://raw.githubusercontent.com/iammesutkaya/LiveSticky/main/assets/header.png" width="100%" alt="LiveSticky - Automated Reddit Live Streaming Hub">
</a>

# Never let your community miss a stream

**Free, zero-maintenance stream promotion for your subreddit.** LiveSticky watches your Twitch, YouTube, and Kick channels and automatically posts, pins, updates, and archives a live thread every time you go live — so you never hand-pin an "I'm live" post again, or leave a dead one up for days after the stream ended.

[![Add to your subreddit](https://img.shields.io/badge/Add%20to%20your%20subreddit-FF4500?style=for-the-badge&logo=reddit&logoColor=white)](https://developers.reddit.com/apps/live-sticky)
[![Try the live demo](https://img.shields.io/badge/Try%20the%20live%20demo-F5D474?style=for-the-badge&logo=googlechrome&logoColor=black)](https://livesticky.com/demo)

**Free** · installs in under 2 minutes · already running in streamer communities like **r/Hasan_Piker** (211K) and **r/Vinesauce** (80K).

<!-- TODO: add a GIF/screenshot here — go-live → pinned thread + dashboard appear → viewer count updates. Biggest single conversion lever. -->
See it working in the **[interactive dashboard demo →](https://livesticky.com/demo)**

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

## How it works

LiveSticky handles the whole stream lifecycle on its own. Go live and it creates and pins a live thread plus an interactive dashboard, updating viewer count, category, and uptime every 2 minutes. Go offline and it archives the thread with the VOD, locks comments against late spam, and (on Twitch) compiles your top clips into a highlights post. Along the way it keeps a sidebar status widget and streamer flair in sync, and rides out brief crashes without spamming duplicate threads.

Full feature list, setup, template variables, and every configuration option live on the website:

* **[Setup Guide](https://livesticky.com/setup.html)** — install and connect Twitch, YouTube, or Kick
* **[Mod Menu & Tools](https://livesticky.com/tools.html)** — moderator actions and subreddit controls
* **[Variables & Templates](https://livesticky.com/customization.html)** — dynamic placeholders and copy-paste post templates
* **[Configuration Reference](https://livesticky.com/configuration.html)** — every setting, template, and mod control
* **[FAQ](https://livesticky.com/faq.html)** — multistreaming, crash protection, and more

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
