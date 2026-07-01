# 🛠️ LiveSticky: Development Guide

This guide is for developers building, uploading, or modifying the "LiveSticky" bot on the Reddit Developer Platform (Devvit).

---

## 🚀 How to Deploy and Install

### 1. Build and Upload

Upload the latest build to the Reddit Developer Platform:

```bash
npx devvit upload
```

### 2. Install / Upgrade Subreddit

Select your target subreddit to install the app, or upgrade existing installations:

```bash
npx devvit install
```

### 3. Initialize the Bot

In your subreddit, click the **Mod Tools** menu and you will find two custom moderator actions:

* **"Restart LiveSticky"**: Clears cached stream status, recreates the 2-minute status checker, and restarts the bot state.
* **"Get Default LiveSticky Templates"**: Click this to immediately open a browser page with the copyable default templates for the settings inputs.

---

## 📌 Reddit Sticky vs Community Highlights

Reddit has two distinct pinning systems, and understanding the difference is critical to how LiveSticky pins posts:

### Legacy Sticky (2-slot limit)
Reddit's traditional `stickied` flag (`SetSubredditSticky` endpoint) gives a post a **pinned** position at the very top of the subreddit feed. Only **2 posts** can be legacy-stickied per subreddit at a time. Third-party Reddit clients (non-official apps, old.reddit.com, many mobile clients) rely exclusively on the `stickied: true` boolean to surface pinned content.

### Community Highlights (6-slot limit)
The newer Community Highlights carousel (`AddPostToHighlights` endpoint) supports **up to 6 posts**. Legacy stickies auto-sync into Highlights slots 1–2, but **Highlights-only slots 3–6 do NOT set `stickied=true`**. Only the official Reddit app reads Community Highlights slots 3–6.

### What LiveSticky does
`pinPostWithFallback()` in `server/livesticky.ts` handles both:
1. Calls `post.sticky()` (legacy SetSubredditSticky endpoint).
2. Re-fetches the post to check the `stickied` boolean.
3. If the legacy slots were both full (slot not granted), explicitly calls `AddPostToHighlights` with `label=ANNOUNCEMENT`.
4. Verifies success with `GetIsPostHighlighted`.

The 2-minute cron (`runStatusCheck`) calls `verifyAndRepinIfNeeded()` each tick to detect if a post lost its slot and re-pins it automatically.

**Why third-party clients may still not show the post:** If both legacy slots are occupied by other mods' pinned posts, LiveSticky will secure a Community Highlights slot but `stickied` stays `false`. Third-party clients will not show it at the top of the feed - only the official Reddit app will show it in the carousel.

## 🔒 Fetch Domains

This app requires permissions for the following external API domains configured in `devvit.json`:

* `id.twitch.tv` - Authenticates the app using Twitch Client Credentials.
* `api.twitch.tv` - Periodically polls the stream status (Helix API) and fetches clips for the highlights post.
