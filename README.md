# LiveSticky - Reddit Devvit Bot

![LiveSticky Logo](https://raw.githubusercontent.com/iammesutkaya/LiveSticky/main/assets/logo.png)

The Bot monitors the livestreaming status of a designated Twitch channel and creates a sticky post on the community's subreddit.

[![Devvit Platform](https://img.shields.io/badge/Platform-Reddit%20Devvit-FF4500?style=for-the-badge&logo=reddit)](https://developers.reddit.com)
[![Twitch Integration](https://img.shields.io/badge/Integration-Twitch%20Helix-9146FF?style=for-the-badge&logo=twitch)](https://dev.twitch.tv)
[![YouTube Integration](https://img.shields.io/badge/Integration-YouTube-FF0000?style=for-the-badge&logo=youtube)](https://developers.google.com/youtube)
[![Redis Cached](https://img.shields.io/badge/Database-Redis%20Cache-D82C20?style=for-the-badge&logo=redis)](https://redis.io)

This bot automatically monitors a specified Twitch stream, creates and flairs a dedicated live discussion thread when the stream goes live, updates the stats (viewers, uptime, category) in real-time every 2 minutes, auto-pins a customizable moderator comment, and unpins/concludes the thread with VOD archives when the stream goes offline.

## ✨ Core Features

**🔴 Automatic Live Threads**  
Periodically polls your Twitch stream (every 2 minutes) and posts a beautifully stickied live discussion thread when you go live.

---

**⚡ Real-Time Statistics**  
Keeps the post body up-to-date in real-time with current uptime, game/category, and live viewer count.

---

**🛡️ Flapping & Disconnect Protection (6-Min Grace Period)**  
Prevents duplicate thread spam if your stream crashes briefly, OBS restarts, or Twitch’s API has a hiccup. It buffers the offline status for 6 minutes before concluding the thread.

---

**📺 Dual-Platform Promotion**  
Optionally promotes your YouTube stream alongside Twitch. If configured, links to both platforms are displayed side-by-side in both live and concluding posts.

---

**🏷️ Custom Post Flairing**  
Automatically flairs the live post (e.g., "🔴 Live Now") using your subreddit's custom post flair templates.

---

**📌 Pinned Moderator Comments**  
Auto-posts a distinguished, stickied moderator comment at the top of the discussion section to drive users to your Discord, social media, or list rules.

---

**🏁 Concluding VOD Archives**  
When the stream goes offline for more than 6 minutes, the bot edits the post to a clean "Offline / Thanks for watching!" archive state, highlights VOD links, locks the post to prevent late spam, and unstickies it.

---

**💬 Auto-Suggested Comment Sort**  
Automatically sets the suggested comment sort of the live post to "New" so the comment section behaves like a real-time stream chat.

---

**🎥 Stream Highlights Post**  
Queries Twitch Helix Clips API upon stream conclusion to automatically compile the top 5 clips generated during that stream and submit them as a standalone highlights thread.

---

**🚀 Efficient Redis Caching**  
Caches Twitch OAuth credentials for 24 hours to ensure high speed and prevent rate-limiting.

---

**🛠️ Unified Admin Reset**  
Includes a single-click moderator action in your subreddit mod tools to reset the scheduler and clear the cached database state instantly.

---

## ⚙️ Configuration Settings

Configure these options by going to **Mod Tools** ➔ **Apps** ➔ **live-sticky** ➔ **Settings**:

### 🛠️ Setup

| Setting Name | Type | Description |
| :--- | :--- | :--- |
| **Twitch Channel Name** | `String` | The Twitch username to monitor (e.g. `ninja`). |
| **Twitch Client ID** | `String (Secret)` | Your Twitch Developer Client ID (scoped to App). |
| **Twitch Client Secret** | `String (Secret)` | Your Twitch Developer Client Secret (scoped to App). |
| **YouTube Channel/Live URL (Optional)** | `String` | The full link to your YouTube channel or live stream (e.g. `https://youtube.com/c/mesut/live`). |
| **Live Post Flair Template ID (Optional)** | `String` | The UUID of the flair template to apply to the post (found in Subreddit Mod Tools ➔ Post Flair). |

### 😴 Offline Stage

| Setting Name | Type | Description |
| :--- | :--- | :--- |
| **Remove Live Post from Feed when Offline** | `Boolean` | Moderator action: Hides the live post from the main subreddit listing when offline (prevents feed flooding while keeping comments/links active). |
| **Delete Live Post completely when Offline** | `Boolean` | Completely deletes the live post and all its comments from Reddit when the stream ends. |
| **Offline Grace Period (Minutes)** | `Number` | The buffer period (in minutes) to wait before concluding the stream post when detected offline (defaults to `6`). Prevents duplicate threads during brief stream crashes. |
| **Enable Sticky Offline Post** | `Boolean` | Recycles a single permanent stickied post when offline (e.g. `😴 {display_name} is Offline. 😴`) to prevent new-post notifications, automatically clearing/flushing old comments on each transition so the comment section starts fresh. |
| **Enable Sidebar Widget** | `Boolean` | Creates and automatically updates a "STREAM STATUS" text widget in your subreddit sidebar reflecting the live/offline state, category, viewers, and uptime in real-time. |
| **Offline Post Title (Optional)** | `String` | Custom title for the offline post. If empty, the default template is used. Supports placeholder: `{display_name}`. |
| **Offline Post Body (Optional)** | `Paragraph` | Custom markdown for the body of the offline post. If empty, the default template is used. You can use `{channel}`, `{display_name}`, and `{youtube_url}` as dynamic placeholders. |
| **Offline Post Custom Footer (Optional)** | `Paragraph` | Custom markdown to append at the bottom of the offline post (works with both custom and default templates). Useful for adding Discord/social links or rules. |
| **Offline Sidebar Widget Text (Optional)** | `Paragraph` | Custom markdown for the sidebar widget when offline. If empty, the default template is used. You can use `{channel}`, `{display_name}`, and `{youtube_url}` as placeholders. |
| **Offline Sidebar Widget Custom Footer (Optional)** | `Paragraph` | Custom markdown to append at the bottom of the offline sidebar widget (works with both custom and default templates). Useful for adding Discord/social links or rules. |

### 🔴 Live Stage

| Setting Name | Type | Description |
| :--- | :--- | :--- |
| **Live Post Title (Optional)** | `String` | Custom title for the live post. If empty, the default template is used. Supports placeholders: `{display_name}`, `{title}`. |
| **Live Post Body (Optional)** | `Paragraph` | Custom markdown for the body of the live post. If empty, the default template is used. You can use `{channel}`, `{display_name}`, `{game}`, `{viewers}`, `{uptime}`, `{title}`, and `{youtube_url}` as dynamic placeholders. |
| **Live Post Custom Footer (Optional)** | `Paragraph` | Custom markdown to append at the bottom of the live post (works with both custom and default templates). Useful for adding Discord/social links or rules. |
| **Auto-Pinned Comment Text (Optional)** | `Paragraph` | Custom multiline markdown to pin at the top of the comment section (supports paragraphs, list formatting, and links). |
| **Live Sidebar Widget Text (Optional)** | `Paragraph` | Custom markdown for the sidebar widget when the stream is live. If empty, the default template is used. You can use `{channel}`, `{display_name}`, `{game}`, `{viewers}`, `{uptime}`, `{title}`, and `{youtube_url}` as placeholders. |
| **Live Sidebar Widget Custom Footer (Optional)** | `Paragraph` | Custom markdown to append at the bottom of the sidebar widget when the stream is live. Perfect for adding Discord links, rules, etc. |
| **Suggested Comment Sort** | `Select` | The default comment sorting applied to the live post (options: `New`, `Live`, `Q&A`, or `None` to leave it to the subreddit default). Defaults to `New`. |

### 🎥 Post-Stream Stage

| Setting Name | Type | Description |
| :--- | :--- | :--- |
| **Enable Stream Highlights Post** | `Boolean` | Automatically compiles and posts the top Twitch clips generated during the stream when it ends. |
| **Highlights Post Flair Template ID (Optional)** | `String` | The UUID of the flair template to apply to the stream highlights post. |
| **Highlights Post Title (Optional)** | `String` | Custom title for the stream highlights post. If empty, the default template is used. Supports placeholders: `{display_name}`, `{date}`. |
| **Highlights Post Custom Header (Optional)** | `Paragraph` | Custom markdown for the header of the stream highlights post. If empty, the default template is used. You can use `{channel}`, `{display_name}`, `{title}`, and `{date}` as dynamic placeholders. |
| **Highlights Post Custom Footer (Optional)** | `Paragraph` | Custom markdown to append at the bottom of the stream highlights post. If empty, the default template is used. You can use `{channel}` as a dynamic placeholder. |

### 📝 Default Templates for Copy-Pasting

If you need to restore or tweak the default texts, you can copy these markdown templates:

#### 1. Live Post Templates

**Default Live Post Title:**

```text
🚨 {display_name} is LIVE! 🚨 — {title}
```

**Default Live Post Body:**

```markdown
* **Category/Game:** {game}
* **Current Viewers:** {viewers}
* **Uptime:** live for {uptime}

---
#### 📺 Channels:
* **🟣 Twitch:** [Watch Live on Twitch](https://twitch.tv/{channel})
* **▶️ YouTube:** [Watch Live on YouTube]({youtube_url})

---
*Stats are auto-updated in real-time by LiveSticky.*
```

#### 2. Default Concluding Post Body

```markdown
### 👋 Stream Ended — Thanks for watching! 👋

**Title:**
{title}

The stream has concluded. VODs and highlights may be available via the links below.

---
#### 📺 Channels:
* **🟣 Twitch:** [Watch VODs on Twitch](https://twitch.tv/{channel})
* **▶️ YouTube:** [Watch VODs on YouTube]({youtube_url})

---
*This live thread has concluded and is now locked.*
```

#### 3. Offline Post Templates

**Default Offline Post Title:**

```text
😴 {display_name} is Offline. 😴
```

**Default Offline Post Body:**

```markdown
The stream is currently offline. Check back soon or follow the channels below to get notified when {display_name} goes live!

---
#### 📺 Channels:
* **🟣 Twitch:** [Watch VODs on Twitch](https://twitch.tv/{channel})
* **▶️ YouTube:** [Watch VODs on YouTube]({youtube_url})
```

#### 4. Default Live Sidebar Widget Text

```markdown
# 🚨 {display_name} is LIVE! 🚨

**Title:**
{title}

* **Category/Game:** {game}
* **Current Viewers:** {viewers}
* **Uptime:** live for {uptime}

---
#### 📺 Channels:
* **🟣 Twitch:** [Watch Live on Twitch](https://twitch.tv/{channel})
* **▶️ YouTube:** [Watch Live on YouTube]({youtube_url})
```

#### 5. Default Offline Sidebar Widget Text

```markdown
# 😴 {display_name} is OFFLINE. 😴

Follow the channels below to get notified when {display_name} goes live!

---
#### 📺 Channels:
* **🟣 Twitch:** [Watch VODs on Twitch](https://twitch.tv/{channel})
* **▶️ YouTube:** [Watch VODs on YouTube]({youtube_url})
```

#### 6. Stream Highlights Templates

**Default Highlights Post Title:**

```text
🎬 Top Clips from {display_name}'s stream ({date})
```

**Default Highlights Post Custom Header:**

```markdown
**Title:**
{title}

Here are the most-watched Twitch clips from today's stream, compiled automatically by LiveSticky.
```

#### 7. Default Stream Highlights Footer

```markdown
---
*Watch VODs and catch the next stream live on [twitch.tv/{channel}](https://twitch.tv/{channel})!*
```

## 🔑 How to Get Twitch Credentials

To configure the bot, you need a **Twitch Client ID** and **Twitch Client Secret** so the bot can securely request live status updates from Twitch's API:

1. Go to the [Twitch Developer Console](https://dev.twitch.tv/console) and log in with your Twitch account.
2. Click **Register Your Application** (or navigate to **Applications** ➔ **Register Your Application**).
3. Fill in the registration form:
   * **Name**: Choose a unique name (e.g., `Subreddit-Stream-Notifier-Bot`).
   * **OAuth Redirect URLs**: Enter `http://localhost` (a placeholder is fine; the bot uses the secure Client Credentials flow and does not need a redirect web page).
   * **Category**: Select **Application Integration** or **Chat Bot**.
   * **Client Type**: Select **Confidential** (required to generate a Client Secret for secure server-to-server requests).
4. Click **Create**.
5. Find your newly created application and click **Manage**:
   * Copy the **Client ID** and paste it into the bot settings.
   * Click **New Secret** to generate a secret. Copy the **Client Secret** and paste it into the bot settings.

> [!IMPORTANT]
> Never share your Client Secret. Reddit securely encrypts this secret so it is never exposed to regular users or shown in plain text on the page once saved.

## 🌐 Fetch Domains

This app makes HTTP requests to the following external domains (declared in [`devvit.json`](./devvit.json)):

| Domain | Purpose |
| :--- | :--- |
| `id.twitch.tv` | Twitch OAuth 2.0 token endpoint. Used to obtain a short-lived App Access Token via the Client Credentials flow, which is required to authenticate all Twitch Helix API requests. |
| `api.twitch.tv` | Twitch Helix REST API. Used to poll the live status of the configured channel (`/streams`), fetch stream metadata (title, game, viewer count), and retrieve top clips (`/clips`) for the post-stream highlights post. |

No user data is sent to these external services. Only the bot's own Client ID and Client Secret (configured by the moderator) are used for authentication.

---

## 🗺️ Roadmap

See the [ROADMAP.md](./ROADMAP.md) file for our upcoming features, integrations, and future enhancements!

---

## 👨‍💻 Author & Credits

* **Developer:** Created by [u/iammesutkaya](https://reddit.com/u/iammesutkaya)
* **Twitch:** Follow the live channel at [twitch.tv/mesutkaya](https://twitch.tv/mesutkaya)

*Created with ❤️ for the community.*
