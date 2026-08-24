[![LiveSticky](https://raw.githubusercontent.com/iammesutkaya/LiveSticky/main/assets/banner.png)](https://livesticky.com)

[![Platform](https://badgen.net/badge/platform/Reddit%20Devvit/ff4500)](https://developers.reddit.com/apps/live-sticky) [![Version](https://badgen.net/badge/version/v1.1.298/10b981)](https://livesticky.com/changelog.html)  
![Twitch](https://badgen.net/badge/integration/Twitch%20Helix/9146ff) ![YouTube](https://badgen.net/badge/integration/YouTube/ff0000) ![Kick](https://badgen.net/badge/integration/Kick/53fc18) [![Docs](https://badgen.net/badge/docs/livesticky.com/f5d474)](https://livesticky.com)

### Automated live threads and dashboards for streamer subreddits

[Website](https://livesticky.com) · [Setup Guide](https://livesticky.com/setup.html) · [Live Demo](https://livesticky.com/demo) · [Configuration](https://livesticky.com/configuration.html) · [Changelog](https://livesticky.com/changelog.html)

Never let your community miss a stream. LiveSticky watches your Twitch, YouTube, and Kick channels and automatically posts, pins, updates, and archives a live thread every time you go live, so you never hand-pin an "I'm live" post again, or leave a dead one up for days after the stream ended.

* **Free & no code required**: Installing takes a couple of clicks. Connecting a platform means creating API credentials once, and the Setup Guide walks you through each one.
* **Active in Top Streamer Subreddits**: Already running in communities like **r/Hasan_Piker** (211K) and **r/Vinesauce** (80K).

<!-- github-only:start -->
[![Install on Reddit](https://raw.githubusercontent.com/iammesutkaya/LiveSticky/main/assets/ui/btn-install-reddit.svg)](https://developers.reddit.com/apps/live-sticky) [![Setup Guide](https://raw.githubusercontent.com/iammesutkaya/LiveSticky/main/assets/ui/btn-setup.svg)](https://livesticky.com/setup.html)
<!-- github-only:end -->

## Why mods install it

* **Zero manual work.** Go live, and a pinned discussion thread appears on its own. Go offline, and it is archived and unpinned. No mod lifts a finger.
* **Nothing unfamiliar in your subreddit.** LiveSticky posts normal Reddit threads, sidebar widgets, and flair, the same things a human mod would have posted by hand.
* **Won't spam your sub.** A 6-minute grace period rides out OBS restarts, dropped Wi-Fi, and brief disconnects, so no duplicate threads. Redis caching and circuit breakers mean it never trips platform rate limits.
* **Live stats, always current.** Viewer count, game or category, and uptime refresh every 2 minutes in the thread and in a sidebar status widget.
* **Works across Twitch, YouTube, and Kick.** One app, side-by-side platform links, per-platform live detection.

## Quick start

1. **[Add LiveSticky to your subreddit](https://developers.reddit.com/apps/live-sticky)** from the Reddit Developer Directory.
2. Create API credentials for Twitch, YouTube, or Kick and paste them into Subreddit Settings with your channel name. One-time job, walked through step by step in the **[Setup Guide](https://livesticky.com/setup.html)**.
3. Go live. LiveSticky posts a pinned thread and keeps it updated every 2 minutes.

## How it works

LiveSticky handles the whole stream lifecycle on its own. Go live and it creates and pins a live discussion thread, updating viewer count, category, and uptime every 2 minutes. Go offline and it archives the thread with the VOD link, locks comments against late spam, and unpins it. On Twitch it also compiles your top clips into a standalone highlights post. Along the way it keeps a sidebar status widget and the streamer's user flair in sync, and rides out brief crashes without spamming duplicate threads.

Every part is optional and configurable. Turn on only what your community wants.

## Features

**🔴 Automatic live posts**

* Polls your channels every 2 minutes, then creates and pins a discussion thread when you go live.
* Flairs the post using your community's own post flair templates.
* Sets the suggested comment sort to New, Live, or Q&A so it behaves like a real-time chat.
* Recycles a single permanent pinned post between streams to announce news and links.

**📊 Real-time stats**

* Keeps the thread updated with uptime, game or category, and viewer count.

**📺 Multistream aware**

* Tracks Twitch, YouTube, and Kick together, with side-by-side platform links.
* Optional interactive dashboard post showing live status, stream preview, and platform links.

**🎬 Clean archive when you wrap**

* Configurable grace period (default 6 minutes) rides out crashes and brief drops without duplicate threads.
* Turns the live thread into a locked offline archive with the VOD link, then unpins it.
* Compiles your top Twitch clips into a standalone highlights post.
* Publishes a monthly Top 20 clips post on a schedule you choose.
* Keeps the full clip history on subreddit wiki pages, one for stream clips and one for the monthly Top 20, and links to them from the posts.

**📌 Sidebar widget**

* Creates and auto-updates a "STREAM STATUS" widget reflecting live and offline state.
* Applies a "LIVE NOW" user flair to the streamer while live, and clears it when offline.

**🛠️ Built for mods**

* Auto-posts a customizable pinned comment to promote your Discord, socials, or rules.
* Refresh state, flush cached images, and force a status check from the mod menu.
* Redis caching and circuit breakers keep status checks light and never hit API limits.
* Pins to Reddit's Community Highlights carousel when both sticky slots are taken.

**✏️ Every word is yours**

LiveSticky never forces its own voice on your community. Post titles, bodies, footers, the pinned mod comment, sidebar text, and the highlights and monthly headers are all editable templates, with placeholders that fill themselves in:

`{stream_title}` `{stream_game}` `{stream_viewers}` `{stream_uptime}` `{stream_display_name}` `{date}` `{month}` `{twitch_url}` `{youtube_url}` `{kick_url}`

Full list and copy-paste examples in **[Variables & Templates](https://livesticky.com/customization.html)**.

## Want more than a thread?

LiveSticky also includes an **interactive live dashboard**: a custom post you can pin to the top of your subreddit showing live status, stream preview, viewer stats, and clickable platform links, all updating in real time.

Completely optional. Supports both **Compact (320px)** and **Tall (512px)** post heights:

[![LiveSticky dashboard in Compact and Tall post heights](https://raw.githubusercontent.com/iammesutkaya/LiveSticky/main/assets/dashboards.png)](https://livesticky.com/demo)

**[Try the interactive dashboard demo](https://livesticky.com/demo)**

## Documentation

Full feature list, setup, template variables, and every configuration option live on the website:

* **[Setup Guide](https://livesticky.com/setup.html)**: install and connect Twitch, YouTube, or Kick
* **[Mod Menu & Tools](https://livesticky.com/tools.html)**: moderator actions and subreddit controls
* **[Variables & Templates](https://livesticky.com/customization.html)**: dynamic placeholders and copy-paste post templates
* **[Configuration Reference](https://livesticky.com/configuration.html)**: every setting, template, and mod control
* **[FAQ](https://livesticky.com/faq.html)**: multistreaming, crash protection, and more

## Privacy & security

Zero user-data tracking. LiveSticky only uses the API credentials a moderator configures. Every outbound request goes to one of the domains below, all declared and locked in [`devvit.json`](https://github.com/iammesutkaya/LiveSticky/blob/main/devvit.json):

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

Free for any subreddit · [source-available](https://github.com/iammesutkaya/LiveSticky/blob/main/LICENSE) · Created by [u/iammesutkaya](https://reddit.com/u/iammesutkaya) · **[livesticky.com](https://livesticky.com)** · [twitch.tv/mesutkaya](https://twitch.tv/mesutkaya)
