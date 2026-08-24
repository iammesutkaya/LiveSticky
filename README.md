<a href="https://livesticky.com">
  <img src="https://raw.githubusercontent.com/iammesutkaya/LiveSticky/main/assets/header.png" width="100%" alt="LiveSticky - Automated Reddit Live Streaming Hub">
</a>

# LiveSticky: automated live threads and dashboards for streamer subreddits

### Never let your community miss a stream

**Free, zero-maintenance stream promotion for your subreddit.** LiveSticky watches your Twitch, YouTube, and Kick channels and automatically posts, pins, updates, and archives a live thread every time you go live, so you never hand-pin an "I'm live" post again, or leave a dead one up for days after the stream ended.

[![Add to your subreddit](https://img.shields.io/badge/Add%20to%20your%20subreddit-FF4500?style=for-the-badge&logo=reddit&logoColor=white)](https://developers.reddit.com/apps/live-sticky)
[![Read the docs](https://img.shields.io/badge/Read%20the%20docs-F5D474?style=for-the-badge&logo=googlechrome&logoColor=black)](https://livesticky.com)

![Twitch](https://img.shields.io/badge/Twitch-9146FF?style=for-the-badge&logo=twitch&logoColor=white)
![YouTube](https://img.shields.io/badge/YouTube-FF0000?style=for-the-badge&logo=youtube&logoColor=white)
![Kick](https://img.shields.io/badge/Kick-53FC18?style=for-the-badge&logo=kick&logoColor=black)

**Free** · installs in under 2 minutes · already running in streamer communities like **r/Hasan_Piker** (211K) and **r/Vinesauce** (80K).

<!-- TODO: add stills or a GIF here: pinned live thread, offline VOD archive, sidebar widget. Biggest single conversion lever. -->

---

## Why mods install it

* **Zero manual work.** Go live, and a pinned discussion thread appears on its own. Go offline, and it is archived and unpinned. No mod lifts a finger.
* **Nothing unfamiliar in your subreddit.** LiveSticky posts normal Reddit threads, sidebar widgets, and flair, the same things a human mod would have posted by hand.
* **Won't spam your sub.** A 6-minute grace period rides out OBS restarts, dropped Wi-Fi, and brief disconnects, so no duplicate threads. Redis caching and circuit breakers mean it never trips platform rate limits.
* **Live stats, always current.** Viewer count, game or category, and uptime refresh every 2 minutes in the thread and in a sidebar status widget.
* **Works across Twitch, YouTube, and Kick.** One app, side-by-side platform links, per-platform live detection.

---

## Quick start

1. **[Add LiveSticky to your subreddit](https://developers.reddit.com/apps/live-sticky)** from the Reddit Developer Directory.
2. Enter your Twitch, YouTube, or Kick channel names in Subreddit Settings. Full walkthrough in the **[2-minute Setup Guide](https://livesticky.com/setup.html)**.
3. Go live. LiveSticky posts a pinned thread and keeps it updated every 2 minutes.

---

## How it works

LiveSticky handles the whole stream lifecycle on its own. Go live and it creates and pins a live discussion thread, updating viewer count, category, and uptime every 2 minutes. Go offline and it archives the thread with the VOD link, locks comments against late spam, and unpins it. On Twitch it also compiles your top clips into a standalone highlights post. Along the way it keeps a sidebar status widget and the streamer's user flair in sync, and rides out brief crashes without spamming duplicate threads.

Every part is optional and configurable. Turn on only what your community wants.

---

## Want more than a thread?

LiveSticky also includes an **interactive live dashboard**: a custom post you can pin to the top of your subreddit showing live status, stream preview, viewer stats, and clickable platform links, all updating in real time.

Completely optional. Create it from the mod menu whenever you want it, or never. The rest of the app works exactly the same either way.

**[Try the interactive dashboard demo](https://livesticky.com/demo)**

---

## Documentation

Full feature list, setup, template variables, and every configuration option live on the website:

* **[Setup Guide](https://livesticky.com/setup.html)**: install and connect Twitch, YouTube, or Kick
* **[Mod Menu & Tools](https://livesticky.com/tools.html)**: moderator actions and subreddit controls
* **[Variables & Templates](https://livesticky.com/customization.html)**: dynamic placeholders and copy-paste post templates
* **[Configuration Reference](https://livesticky.com/configuration.html)**: every setting, template, and mod control
* **[FAQ](https://livesticky.com/faq.html)**: multistreaming, crash protection, and more

---

## Privacy & security

Zero user-data tracking. LiveSticky only uses the API credentials a moderator configures. Every outbound request goes to one of the domains below, all declared and locked in [`devvit.json`](./devvit.json):

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
