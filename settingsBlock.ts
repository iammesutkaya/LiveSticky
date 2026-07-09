Devvit.addSettings([\n  {
    name: "group_global",
    type: "group",
    label: "GLOBAL TOGGLES",
    fields: [\n      { name: "enableDashboard", type: "boolean", label: "📊 Enable Custom Post Dashboard", defaultValue: false, helpText: "If enabled, LiveSticky will power a persistent interactive dashboard post." },\n      { name: "enableLivePost", type: "boolean", label: "📝 Enable Live Text Post", defaultValue: true, helpText: "If enabled, automatically creates and pins a standard text post when the stream goes live." },\n      { name: "updateSidebarWidget", type: "boolean", label: "📱 Enable Sidebar Widget", defaultValue: false, helpText: "Creates and automatically updates a \"Stream Status\" text widget in your community sidebar." },\n      { name: "removeOfflinePost", type: "boolean", label: "😴 Remove Live Post from Feed when Offline", defaultValue: false, helpText: "Mod action: Hides the live post from the community feed when offline. It remains accessible via direct links or comment histories without cluttering the feed." },\n      { name: "deleteOfflinePost", type: "boolean", label: "😴 Delete Live Post when Offline", defaultValue: false, helpText: "Completely deletes the live post and all its comments when the stream ends." },\n      { name: "stickyOfflinePost", type: "boolean", label: "😴 Enable Pinned Offline Post", defaultValue: true, helpText: "Recycles a single permanent pinned post when offline to announce news and useful links. The post is unpinned when live and pinned again when offline. Because it is recycled, users are never notified of a new post after creation." },\n      { name: "enableHighlightsPost", type: "boolean", label: "🎬 Enable Stream Highlights Post", defaultValue: false, helpText: "Automatically posts a compilation of top Twitch clips generated during the stream when it ends." },\n      { name: "offlineGracePeriod", type: "number", label: "😴 Offline Grace Period (Minutes)", defaultValue: 6, helpText: "How long (in minutes) to wait before concluding the live post after going offline. Prevents duplicate posts during brief stream crashes." },\n    ]
  },\n  {
    name: "group_setup",
    type: "group",
    label: "SETUP & CREDENTIALS",
    fields: [\n      { name: "suggestedSort", type: "select", label: "💬 Suggested Comment Sort", options: [{"label":"New (Recommended)","value":"NEW"},{"label":"Live","value":"LIVE"},{"label":"Q&A","value":"QA"},{"label":"None (Community default)","value":"BLANK"}], defaultValue: "NEW" },\n      { name: "primaryPlatform", type: "select", label: "👑 Primary Platform", options: [{"label":"Twitch","value":"Twitch"},{"label":"YouTube","value":"YouTube"},{"label":"Kick","value":"Kick"}], defaultValue: "Twitch", helpText: "This platform will always appear at the top of the multistream dashboard." },\n      { name: "customAvatarUrl", type: "string", label: "👑 Custom Avatar Image URL (Optional)", helpText: "Override your profile picture with a DIRECT Reddit image link (i.redd.it/…). Upload an image to Reddit, then copy its direct link. Leave blank to auto-fetch from your primary platform.", placeholder: "https://..." },\n      { name: "twitchChannel", type: "string", label: "🟪 Twitch Channel Name (Optional)", helpText: "The name of the Twitch channel to monitor (e.g., streamer)", placeholder: "streamer" },\n      { name: "twitchClientId", type: "string", label: "🟪 Twitch Client ID (Optional)", helpText: "Your Twitch App Client ID. Register one at https://dev.twitch.tv/console (Guide: https://livesticky.com/setup.html). Sensitive - only mods of this community can see it.", placeholder: "your Twitch app Client ID" },\n      { name: "twitchClientSecret", type: "string", label: "🟪 Twitch Client Secret (Optional)", helpText: "Your Twitch App Client Secret. Sensitive - keep it confidential; only mods of this community can see it. (Guide: https://livesticky.com/setup.html)", placeholder: "your Twitch app Client Secret" },\n      { name: "youtubeChannel", type: "string", label: "🟥 YouTube Channel Name / Handle (Optional)", helpText: "The name or handle of your YouTube channel (e.g., @ChannelName or ChannelName)", placeholder: "@ChannelName" },\n      { name: "youtubeApiKey", type: "string", label: "🟥 YouTube Data API Key (Optional)", helpText: "Your Google Developer API Key with YouTube Data API v3 enabled. Required if using YouTube Live status check. Sensitive - only mods of this community can see it.", placeholder: "your YouTube Data API v3 key" },\n      { name: "kickChannel", type: "string", label: "🟩 Kick Channel Name (Optional)", helpText: "The name of your Kick channel (e.g., ChannelName)", placeholder: "ChannelName" },\n      { name: "kickClientId", type: "string", label: "🟩 Kick API Client ID (Optional)", helpText: "Your Kick Developer API Client ID. Required if using Kick status check. Sensitive - only mods of this community can see it.", placeholder: "your Kick Client ID" },\n      { name: "kickClientSecret", type: "string", label: "🟩 Kick API Client Secret (Optional)", helpText: "Your Kick Developer API Client Secret. Required if using Kick status check. Sensitive - only mods of this community can see it.", placeholder: "your Kick Client Secret" },\n      { name: "placeholderReference", type: "paragraph", label: "ℹ️ Available Placeholders (for reference)", defaultValue: "Please refer to https://livesticky.com/customization.html for a full list of available placeholders to use in your text." },\n      { name: "dashboardPostTitle", type: "string", label: "📺 Dashboard Post Title (Optional)", helpText: "Custom title for the persistent dashboard post. If empty, the default is used.", defaultValue: "LiveSticky Dashboard" },\n    ]
  },\n  {\n    name: "group_flair",\n    type: "group",\n    label: "FLAIR SETTINGS",\n    fields: [\n      { name: "enableDynamicFlair", type: "boolean", label: "🔧 Enable Dynamic Post Flair Updates", defaultValue: false, helpText: "Periodically updates the live post (or dashboard post) flair with active game and live viewers (e.g. 🔴 LIVE: Just Chatting [15.4K])." },\n      { name: "streamerRedditUsername", type: "string", label: "👤 Streamer Reddit Username (Optional)", helpText: "The exact Reddit username of the streamer (without the u/). Used for User Flair updates.", placeholder: "iammesutkaya" },\n      { name: "liveUserFlairText", type: "string", label: "👤 Live User Flair Text (Optional)", helpText: "The User Flair text applied to the Streamer when they go live.", defaultValue: "🔴 LIVE NOW" },\n      { name: "offlineUserFlairText", type: "string", label: "👤 Offline User Flair Text (Optional)", helpText: "The User Flair text applied to the Streamer when they go offline. Leave blank to clear their flair completely.", defaultValue: " " },\n      { name: "liveFlairId", type: "string", label: "🔧 Live Post Flair Template ID (Optional)", helpText: "The UUID of the flair template to apply to the live post (from Mod Tools ➔ Post Flair)", placeholder: "e.g. 11111111-2222-3333-4444-555555555555" },\n      { name: "offlineFlairText", type: "string", label: "😴 Offline Flair Text (Optional)", helpText: "Text to set as the post flair when the stream goes offline. Defaults to '⚫ OFFLINE' if left empty.", placeholder: "e.g. ⚫ OFFLINE" },\n      { name: "highlightsFlairId", type: "string", label: "🎬 Highlights Post Flair Template ID (Optional)", helpText: "The UUID of the flair template to apply to the stream highlights post (from Mod Tools ➔ Post Flair).", placeholder: "e.g. 11111111-2222-3333-4444-555555555555" },\n    ]\n  },\n  {
    name: "group_templates",
    type: "group",
    label: "TEMPLATES & TEXTS",
    fields: [
      { name: "livePostTitle", type: "string", label: "🔴 Live Post Title (Optional)", helpText: "Custom title for the live post. If empty, the default template is used.", defaultValue: "🚨 {display_name} is LIVE! 🚨 - {title}" },
      { name: "livePostBody", type: "paragraph", label: "🔴 Live Post Body (Markdown) (Optional)", helpText: "Custom markdown for the body of the live post. If empty, the default template is used.", defaultValue: "* **Category/Game:** {game}
* **Current Viewers:** {viewers}
* **Uptime:** live for {uptime}

---
**Watch the stream on:**

🟪 **[Twitch]({twitch_url})**  •  🟥 **[YouTube]({youtube_url})**  •  🟩 **[Kick]({kick_url})**

---
*Stats are auto-updated in real-time by LiveSticky.*" },
      { name: "livePostFooter", type: "paragraph", label: "🔴 Live Post Custom Footer (Markdown) (Optional)", helpText: "Custom markdown to append at the bottom of the live post.", placeholder: "Optional - appended below the live post (Discord, socials, rules…)" },
      { name: "liveCommentText", type: "paragraph", label: "🔴 Auto-Pinned Comment Text (Optional)", helpText: "Text to automatically post and pin as a mod comment inside the live post (e.g. Discord link).", placeholder: "Optional - pinned mod comment (Discord link, rules…)" },
      { name: "concludingPostBody", type: "paragraph", label: "🎬 Concluding Post Body (Markdown) (Optional)", helpText: "Custom markdown for the live post body after the stream ends. If empty, the default template is used.", defaultValue: "### 👋 Stream Ended - Thanks for watching! 👋

**Title:**
{title}

The stream has concluded. VODs and highlights may be available via the links below.

---
**Watch the VODs on:**

🟪 **[Twitch]({twitch_url})**  •  🟥 **[YouTube]({youtube_url})**  •  🟩 **[Kick]({kick_url})**

---
*This post is now locked as the stream has ended.*" },
      { name: "concludingPostFooter", type: "paragraph", label: "🎬 Concluding Post Custom Footer (Markdown) (Optional)", helpText: "Custom markdown to append at the bottom of the concluding post.", placeholder: "Optional - appended below the concluding post" },
      { name: "offlinePostTitle", type: "string", label: "😴 Offline Post Title (Optional)", helpText: "Custom title for the offline post. If empty, the default template is used.", defaultValue: "😴 {display_name} is offline 😴" },
      { name: "offlinePostBody", type: "paragraph", label: "😴 Offline Post Body (Markdown) (Optional)", helpText: "Custom markdown for the body of the offline post. If empty, the default template is used.", defaultValue: "The stream is currently offline. Check back soon or follow the channels below to get notified when {display_name} goes live!

---
**Watch the VODs on:**

🟪 **[Twitch]({twitch_url})**  •  🟥 **[YouTube]({youtube_url})**  •  🟩 **[Kick]({kick_url})**" },
      { name: "offlinePostFooter", type: "paragraph", label: "😴 Offline Post Custom Footer (Markdown) (Optional)", helpText: "Custom markdown to append at the bottom of the offline post.", placeholder: "Optional - appended below the offline post (Discord, socials, rules…)" },
      { name: "liveSidebarText", type: "paragraph", label: "🔴 Live Sidebar Widget Text (Markdown) (Optional)", helpText: "Custom markdown for the body of the sidebar widget when the stream is live. If empty, the default template is used.", defaultValue: "# 🚨 {display_name} is LIVE! 🚨

**Title:**
{title}

* **Category/Game:** {game}
* **Current Viewers:** {viewers}
* **Uptime:** live for {uptime}

---
**Watch the stream on:**

🟪 **[Twitch]({twitch_url})**  •  🟥 **[YouTube]({youtube_url})**  •  🟩 **[Kick]({kick_url})**" },
      { name: "liveSidebarFooter", type: "paragraph", label: "🔴 Live Sidebar Widget Custom Footer (Markdown) (Optional)", helpText: "Custom markdown to append at the bottom of the sidebar widget when the stream is live.", placeholder: "Optional - appended below the live sidebar widget" },
      { name: "offlineSidebarText", type: "paragraph", label: "😴 Offline Sidebar Widget Text (Markdown) (Optional)", helpText: "Custom markdown for the body of the sidebar widget when the stream is offline. If empty, the default template is used.", defaultValue: "# 😴 {display_name} is offline 😴

Follow the channels below to get notified when {display_name} goes live!

---
**Watch the VODs on:**

🟪 **[Twitch]({twitch_url})**  •  🟥 **[YouTube]({youtube_url})**  •  🟩 **[Kick]({kick_url})**" },
      { name: "offlineSidebarFooter", type: "paragraph", label: "😴 Offline Sidebar Widget Custom Footer (Markdown) (Optional)", helpText: "Custom markdown to append at the bottom of the offline sidebar widget.", placeholder: "Optional - appended below the offline sidebar widget" },
      { name: "highlightsPostTitle", type: "string", label: "🎬 Highlights Post Title (Optional)", helpText: "Custom title for the stream highlights post. If empty, the default template is used.", defaultValue: "🎬 Top Clips from {display_name}'s stream ({date})" },
      { name: "highlightsHeader", type: "paragraph", label: "🎬 Highlights Post Custom Header (Markdown) (Optional)", helpText: "Custom markdown for the header of the stream highlights post. If empty, the default template is used.", defaultValue: "**Title:**
{title}

Here are the most-watched Twitch clips from today's stream, compiled automatically by LiveSticky." },
      { name: "highlightsFooter", type: "paragraph", label: "🎬 Highlights Post Custom Footer (Markdown) (Optional)", helpText: "Custom markdown to append at the bottom of the stream highlights post. If empty, the default template is used.", defaultValue: "---
*Watch VODs and catch the next stream live on [twitch.tv/{channel}](https://twitch.tv/{channel})!*" },
    ]
  },
]);
