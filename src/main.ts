import { Devvit, SettingScope } from '@devvit/public-api';
import {
  DEFAULT_LIVE_POST_BODY,
  DEFAULT_CONCLUDING_POST_BODY,
  DEFAULT_OFFLINE_POST_BODY,
  DEFAULT_LIVE_SIDEBAR,
  DEFAULT_OFFLINE_SIDEBAR,
  DEFAULT_HIGHLIGHTS_POST_HEADER,
  DEFAULT_HIGHLIGHTS_POST_FOOTER,
  DEFAULT_LIVE_POST_TITLE,
  DEFAULT_OFFLINE_POST_TITLE,
  DEFAULT_HIGHLIGHTS_POST_TITLE,
} from './templates.js';

// Enable Reddit, Redis, and HTTP plugins
Devvit.configure({
  redditAPI: true,
  redis: true,
  http: true,
});

// Define the configuration settings for the subreddit
Devvit.addSettings([
  {
    type: 'group',
    label: 'Setup',
    fields: [
      {
        type: 'string',
        name: 'twitchChannel',
        label: 'Twitch Channel Name',
        helpText: 'The name of the Twitch channel to monitor (e.g., streamer)',
      },
      {
        type: 'string',
        name: 'twitchClientId',
        label: 'Twitch Client ID',
        isSecret: true,
        scope: SettingScope.App,
        helpText: 'Your Twitch App Client ID. Register one at https://dev.twitch.tv/console (Guide: https://github.com/iammesutkaya/LiveSticky#readme)',
      },
      {
        type: 'string',
        name: 'twitchClientSecret',
        label: 'Twitch Client Secret',
        isSecret: true,
        scope: SettingScope.App,
        helpText: 'Your Twitch App Client Secret. Keep this confidential. (Guide: https://github.com/iammesutkaya/LiveSticky#readme)',
      },
      {
        type: 'string',
        name: 'youtubeChannel',
        label: 'YouTube Channel Name / Handle (Optional)',
        helpText: 'The name or handle of your YouTube channel (e.g., @ChannelName or ChannelName)',
      },
      {
        type: 'string',
        name: 'liveFlairId',
        label: 'Live Post Flair Template ID (Optional)',
        helpText: 'The UUID of the flair template to apply to the live post (from Mod Tools ➔ Post Flair)',
      }
    ]
  },
  {
    type: 'group',
    label: 'Offline Stage',
    fields: [
      {
        type: 'boolean',
        name: 'removeOfflinePost',
        label: 'Remove Live Post from Feed when Offline',
        defaultValue: false,
        helpText: 'Mod action: Hides the live post from the community feed when offline. It remains accessible via direct links or comment histories without cluttering the feed.',
      },
      {
        type: 'boolean',
        name: 'deleteOfflinePost',
        label: 'Delete Live Post when Offline',
        defaultValue: false,
        helpText: 'Completely deletes the live post and all its comments when the stream ends.',
      },
      {
        type: 'number',
        name: 'offlineGracePeriod',
        label: 'Offline Grace Period (Minutes)',
        defaultValue: 6,
        helpText: 'How long (in minutes) to wait before concluding the live post after going offline. Prevents duplicate posts during brief stream crashes.',
      },
      {
        type: 'boolean',
        name: 'stickyOfflinePost',
        label: 'Enable Pinned Offline Post',
        defaultValue: true,
        helpText: 'Recycles a single permanent pinned post when offline to announce news and useful links. The post is unpinned when live and pinned again when offline. Because it is recycled, users are never notified of a new post after creation.',
      },
      {
        type: 'boolean',
        name: 'updateSidebarWidget',
        label: 'Enable Sidebar Widget',
        defaultValue: false,
        helpText: 'Creates and automatically updates a "Stream Status" text widget in your community sidebar.',
      },
      {
        type: 'string',
        name: 'offlinePostTitle',
        label: 'Offline Post Title (Optional)',
        defaultValue: DEFAULT_OFFLINE_POST_TITLE,
        helpText: 'Custom title for the offline post. If empty, the default template is used.',
      },
      {
        type: 'paragraph',
        name: 'offlinePostBody',
        label: 'Offline Post Body (Markdown) (Optional)',
        defaultValue: DEFAULT_OFFLINE_POST_BODY,
        helpText: 'Custom markdown for the body of the offline post. If empty, the default template is used.',
      },
      {
        type: 'paragraph',
        name: 'offlinePostFooter',
        label: 'Offline Post Custom Footer (Markdown) (Optional)',
        helpText: 'Custom markdown to append at the bottom of the offline post.',
      },
      {
        type: 'paragraph',
        name: 'offlineSidebarText',
        label: 'Offline Sidebar Widget Text (Markdown) (Optional)',
        defaultValue: DEFAULT_OFFLINE_SIDEBAR,
        helpText: 'Custom markdown for the body of the sidebar widget when the stream is offline. If empty, the default template is used.',
      },
      {
        type: 'paragraph',
        name: 'offlineSidebarFooter',
        label: 'Offline Sidebar Widget Custom Footer (Markdown) (Optional)',
        helpText: 'Custom markdown to append at the bottom of the offline sidebar widget.',
      }
    ]
  },
  {
    type: 'group',
    label: 'Live Stage',
    fields: [
      {
        type: 'paragraph',
        name: 'livePostBody',
        label: 'Live Post Body (Markdown) (Optional)',
        defaultValue: DEFAULT_LIVE_POST_BODY,
        helpText: 'Custom markdown for the body of the live post. If empty, the default template is used.',
      },
      {
        type: 'paragraph',
        name: 'livePostFooter',
        label: 'Live Post Custom Footer (Markdown) (Optional)',
        helpText: 'Custom markdown to append at the bottom of the live post.',
      },
      {
        type: 'string',
        name: 'livePostTitle',
        label: 'Live Post Title (Optional)',
        defaultValue: DEFAULT_LIVE_POST_TITLE,
        helpText: 'Custom title for the live post. If empty, the default template is used.',
      },
      {
        type: 'paragraph',
        name: 'liveCommentText',
        label: 'Auto-Pinned Comment Text (Optional)',
        helpText: 'Text to automatically post and pin as a mod comment inside the live post (e.g. Discord link).',
      },
      {
        type: 'paragraph',
        name: 'liveSidebarText',
        label: 'Live Sidebar Widget Text (Markdown) (Optional)',
        defaultValue: DEFAULT_LIVE_SIDEBAR,
        helpText: 'Custom markdown for the body of the sidebar widget when the stream is live. If empty, the default template is used.',
      },
      {
        type: 'paragraph',
        name: 'liveSidebarFooter',
        label: 'Live Sidebar Widget Custom Footer (Markdown) (Optional)',
        helpText: 'Custom markdown to append at the bottom of the sidebar widget when the stream is live.',
      },
      {
        type: 'select',
        name: 'suggestedSort',
        label: 'Suggested Comment Sort',
        options: [
          { label: 'New (Recommended)', value: 'NEW' },
          { label: 'Live', value: 'LIVE' },
          { label: 'Q&A', value: 'QA' },
          { label: 'None (Community default)', value: 'BLANK' }
        ],
        defaultValue: ['NEW'],
      }
    ]
  },
  {
    type: 'group',
    label: 'Post-Stream Stage',
    fields: [
      {
        type: 'boolean',
        name: 'enableHighlightsPost',
        label: 'Enable Stream Highlights Post',
        defaultValue: false,
        helpText: 'Automatically posts a compilation of top Twitch clips generated during the stream when it ends.',
      },
      {
        type: 'string',
        name: 'highlightsFlairId',
        label: 'Highlights Post Flair Template ID (Optional)',
        helpText: 'The UUID of the flair template to apply to the stream highlights post (from Mod Tools ➔ Post Flair).',
      },
      {
        type: 'string',
        name: 'highlightsPostTitle',
        label: 'Highlights Post Title (Optional)',
        defaultValue: DEFAULT_HIGHLIGHTS_POST_TITLE,
        helpText: 'Custom title for the stream highlights post. If empty, the default template is used.',
      },
      {
        type: 'paragraph',
        name: 'concludingPostBody',
        label: 'Concluding Post Body (Markdown) (Optional)',
        defaultValue: DEFAULT_CONCLUDING_POST_BODY,
        helpText: 'Custom markdown for the live post body after the stream ends. If empty, the default template is used.',
      },
      {
        type: 'paragraph',
        name: 'concludingPostFooter',
        label: 'Concluding Post Custom Footer (Markdown) (Optional)',
        helpText: 'Custom markdown to append at the bottom of the concluding post.',
      },
      {
        type: 'paragraph',
        name: 'highlightsHeader',
        label: 'Highlights Post Custom Header (Markdown) (Optional)',
        defaultValue: DEFAULT_HIGHLIGHTS_POST_HEADER,
        helpText: 'Custom markdown for the header of the stream highlights post. If empty, the default template is used.',
      },
      {
        type: 'paragraph',
        name: 'highlightsFooter',
        label: 'Highlights Post Custom Footer (Markdown) (Optional)',
        defaultValue: DEFAULT_HIGHLIGHTS_POST_FOOTER,
        helpText: 'Custom markdown to append at the bottom of the stream highlights post. If empty, the default template is used.',
      }
    ]
  },
  {
    type: 'group',
    label: '🏷️ Placeholder Reference',
    helpText: [
      'Use these placeholders in your custom templates:',
      '',
      '{channel} — Twitch channel login name (e.g. streamer)',
      '{display_name} — Channel display name (e.g. Streamer)',
      '{title} — Stream title',
      '{game} — Game or category being streamed (live only)',
      '{viewers} — Current viewer count (live only)',
      '{uptime} — How long the stream has been live (live only)',
      '{date} — Date the stream ended (post-stream only)',
      '{youtube_url} — YouTube channel URL',
    ].join('\n'),
    fields: []
  }
]);

const formatLivePostBody = (
  streamInfo: any,
  channelName: string,
  youtubeUrl?: string,
  customBody?: string,
  footer?: string
): string => {
  const title = streamInfo.title || 'Live Stream';
  const gameName = streamInfo.game_name || 'Just Chatting';
  const viewerCount = streamInfo.viewer_count !== undefined ? streamInfo.viewer_count.toLocaleString() : '0';
  const startedAt = streamInfo.started_at ? new Date(streamInfo.started_at) : new Date();
  
  // Calculate uptime
  const elapsedMs = Date.now() - startedAt.getTime();
  const hours = Math.floor(elapsedMs / 3600000);
  const minutes = Math.floor((elapsedMs % 3600000) / 60000);
  const uptimeText = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

  const displayName = streamInfo.user_name || channelName;

  const content = customBody || DEFAULT_LIVE_POST_BODY;

  let result = content
    .replace(/{channel}/g, channelName)
    .replace(/{display_name}/g, displayName)
    .replace(/{game}/g, gameName)
    .replace(/{viewers}/g, viewerCount)
    .replace(/{uptime}/g, uptimeText)
    .replace(/{title}/g, title);

  if (youtubeUrl) {
    result = result.replace(/{youtube_url}/g, youtubeUrl);
  } else {
    // Remove lines containing youtube_url placeholder if not configured
    result = result
      .split('\n')
      .filter(line => !line.includes('{youtube_url}'))
      .join('\n');
  }

  if (footer) {
    result += `\n\n${footer}`;
  }

  return result;
};

const formatOfflinePostBody = (
  channelName: string,
  youtubeUrl?: string,
  customBody?: string,
  footer?: string,
  defaultTemplate: string = DEFAULT_OFFLINE_POST_BODY,
  displayName?: string,
  title?: string
): string => {
  const content = customBody || defaultTemplate;

  let result = content.replace(/{channel}/g, channelName);
  if (displayName) {
    result = result.replace(/{display_name}/g, displayName);
  }
  if (title) {
    result = result.replace(/{title}/g, title);
  }
  if (youtubeUrl) {
    result = result.replace(/{youtube_url}/g, youtubeUrl);
  } else {
    // Remove lines containing youtube_url placeholder if not configured
    result = result
      .split('\n')
      .filter(line => !line.includes('{youtube_url}'))
      .join('\n');
  }

  if (footer) {
    result += `\n\n${footer}`;
  }

  return result;
};

const formatSidebarWidgetText = (
  isLive: boolean,
  streamInfo: any,
  displayName: string,
  channelName: string,
  youtubeUrl?: string,
  customLiveText?: string,
  customOfflineText?: string,
  liveFooter?: string,
  offlineFooter?: string
): string => {
  if (isLive && streamInfo) {
    const title = streamInfo.title || 'Live Stream';
    const gameName = streamInfo.game_name || 'Just Chatting';
    const viewerCount = streamInfo.viewer_count !== undefined ? streamInfo.viewer_count.toLocaleString() : '0';
    
    let uptimeStr = '';
    if (streamInfo.started_at) {
      const startTime = new Date(streamInfo.started_at).getTime();
      const diffMs = Date.now() - startTime;
      const diffHrs = Math.floor(diffMs / 3600000);
      const diffMins = Math.floor((diffMs % 3600000) / 60000);
      uptimeStr = diffHrs > 0 ? `${diffHrs}h ${diffMins}m` : `${diffMins}m`;
    }

    const content = customLiveText || DEFAULT_LIVE_SIDEBAR;

    let result = content
      .replace(/{channel}/g, channelName)
      .replace(/{display_name}/g, displayName)
      .replace(/{game}/g, gameName)
      .replace(/{viewers}/g, viewerCount)
      .replace(/{uptime}/g, uptimeStr)
      .replace(/{title}/g, title);

    if (youtubeUrl) {
      result = result.replace(/{youtube_url}/g, youtubeUrl);
    } else {
      // Remove lines containing youtube_url placeholder if not configured
      result = result
        .split('\n')
        .filter(line => !line.includes('{youtube_url}'))
        .join('\n');
    }

    if (liveFooter) {
      result += `\n\n${liveFooter}`;
    }
    return result;
  } else {
    const content = customOfflineText || DEFAULT_OFFLINE_SIDEBAR;

    let result = content
      .replace(/{channel}/g, channelName)
      .replace(/{display_name}/g, displayName);

    if (youtubeUrl) {
      result = result.replace(/{youtube_url}/g, youtubeUrl);
    } else {
      // Remove lines containing youtube_url placeholder if not configured
      result = result
        .split('\n')
        .filter(line => !line.includes('{youtube_url}'))
        .join('\n');
    }

    if (offlineFooter) {
      result += `\n\n${offlineFooter}`;
    }
    return result;
  }
};

// Helper to ensure the sticky offline post is created and stickied
const ensureStickyOfflinePost = async (context: any, channel: string, youtubeUrl?: string) => {
  const cachedDisplayName = await context.redis.get('twitch_display_name');
  const displayName = cachedDisplayName || channel;
  const customOfflineBody = await context.settings.get('offlinePostBody') as string | undefined;
  const offlinePostFooter = await context.settings.get('offlinePostFooter') as string | undefined;
  const concludingBody = formatOfflinePostBody(channel, youtubeUrl, customOfflineBody, offlinePostFooter, DEFAULT_OFFLINE_POST_BODY, displayName);
  const customOfflineTitle = await context.settings.get('offlinePostTitle') as string | undefined;
  const templateTitle = customOfflineTitle || DEFAULT_OFFLINE_POST_TITLE;
  const offlinePostTitle = templateTitle.replace(/{display_name}/g, displayName);
  const offlinePostId = await context.redis.get('offline_post_id');
  let offlinePostExists = false;

  if (offlinePostId) {
    try {
      const offlinePost = await context.reddit.getPostById(offlinePostId);
      
      // Clear existing comments to start fresh
      try {
        const comments = await offlinePost.comments.all();
        for (const comment of comments) {
          try {
            await comment.remove();
          } catch (commentError) {
            console.error(`Failed to remove comment ${comment.id}:`, commentError);
          }
        }
        console.log(`Cleared comments for existing offline post: ${offlinePostId}`);
      } catch (commentFetchError) {
        console.error('Failed to fetch/remove comments:', commentFetchError);
      }

      await offlinePost.edit({ text: concludingBody });
      await offlinePost.sticky();
      console.log(`Successfully updated and stickied existing offline post: ${offlinePostId}`);
      offlinePostExists = true;
    } catch (fetchError) {
      console.error('Failed to fetch/sticky existing offline post, will recreate:', fetchError);
    }
  }

  if (!offlinePostExists) {
    try {
      const subreddit = await context.reddit.getCurrentSubreddit();
      const offlinePost = await context.reddit.submitPost({
        title: offlinePostTitle,
        subredditName: subreddit.name,
        text: concludingBody,
      });
      await offlinePost.sticky();
      await context.redis.set('offline_post_id', offlinePost.id);
      console.log(`Successfully created, stickied, and cached new offline post: ${offlinePost.id}`);
    } catch (createError) {
      console.error('Failed to create new offline post:', createError);
    }
  }
  
  // Set redis key confirming it has been pinned
  await context.redis.set('is_offline_post_pinned', 'true');
};

// Helper to compile and post stream highlights (top Twitch clips)
const postStreamHighlights = async (
  context: any,
  clientId: string,
  token: string,
  broadcasterId: string,
  startedAt: string,
  streamTitle: string,
  channelName: string,
  displayName: string,
  customHeader?: string,
  customFooter?: string,
  flairTemplateId?: string,
  customTitle?: string
) => {
  try {
    console.log(`Fetching top clips for broadcaster ${broadcasterId} since ${startedAt}...`);
    const endedAt = new Date().toISOString();
    const url = `https://api.twitch.tv/helix/clips?broadcaster_id=${broadcasterId}&started_at=${startedAt}&ended_at=${endedAt}&first=20`;
    
    const res = await fetch(url, {
      headers: {
        'Client-ID': clientId,
        'Authorization': `Bearer ${token}`
      }
    });

    if (!res.ok) {
      console.error(`Failed to fetch clips from Twitch Helix API: ${res.status} ${res.statusText}`);
      return;
    }

    const json = await res.json();
    const clips = json.data || [];
    
    if (clips.length === 0) {
      console.log('No clips generated during this stream session.');
      return;
    }

    // Sort clips by view count descending and take top 5
    const topClips = clips
      .sort((a: any, b: any) => (b.view_count || 0) - (a.view_count || 0))
      .slice(0, 5);

    console.log(`Found ${clips.length} clips. Posting top ${topClips.length} clips to Reddit...`);

    const dateStr = new Date(startedAt).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const templateTitle = customTitle || DEFAULT_HIGHLIGHTS_POST_TITLE;
    const postTitle = templateTitle
      .replace(/{display_name}/g, displayName)
      .replace(/{date}/g, dateStr);

    const templateHeader = customHeader || DEFAULT_HIGHLIGHTS_POST_HEADER;
    const header = templateHeader
      .replace(/{display_name}/g, displayName)
      .replace(/{title}/g, streamTitle)
      .replace(/{date}/g, dateStr)
      .replace(/{channel}/g, channelName);

    let body = header;
    
    topClips.forEach((clip: any, index: number) => {
      const views = clip.view_count !== undefined ? clip.view_count.toLocaleString() : '0';
      const title = clip.title || 'Untitled Clip';
      const creator = clip.creator_name || 'Anonymous';
      
      body += `${index + 1}. **[${title}](${clip.url})**\n`;
      body += `   * **Views:** ${views}\n`;
      body += `   * **Clipped by:** ${creator}\n\n`;
    });
    
    const templateFooter = customFooter || DEFAULT_HIGHLIGHTS_POST_FOOTER;
    const footer = templateFooter
      .replace(/{channel}/g, channelName);

    body += footer;

    const subreddit = await context.reddit.getCurrentSubreddit();
    const highlightsPost = await context.reddit.submitPost({
      title: postTitle,
      subredditName: subreddit.name,
      text: body
    });

    console.log(`Successfully created stream highlights post: ${highlightsPost.id}`);

    if (flairTemplateId) {
      try {
        await context.reddit.setPostFlair({
          postId: highlightsPost.id,
          subredditName: subreddit.name,
          flairTemplateId: flairTemplateId
        });
        console.log(`Successfully applied flair to highlights post: ${flairTemplateId}`);
      } catch (flairError) {
        console.error('Failed to set flair on highlights post:', flairError);
      }
    }
  } catch (error) {
    console.error('Error creating stream highlights post:', error);
  }
};

// Define the scheduled status checking job
Devvit.addSchedulerJob({
  name: 'check-twitch-status',
  onRun: async (_, context) => {
    // 1. Get settings
    const channel = await context.settings.get('twitchChannel');
    const clientId = await context.settings.get('twitchClientId');
    const secret = await context.settings.get('twitchClientSecret');
    const liveFlairId = await context.settings.get('liveFlairId');
    const youtubeChannel = await context.settings.get('youtubeChannel') as string | undefined;
    const youtubeUrl = youtubeChannel ? `https://www.youtube.com/@${youtubeChannel.replace(/^@/, '')}` : undefined;
    const removeOfflinePost = await context.settings.get('removeOfflinePost') as boolean | undefined;
    const deleteOfflinePost = await context.settings.get('deleteOfflinePost') as boolean | undefined;
    const stickyOfflinePost = await context.settings.get('stickyOfflinePost') as boolean | undefined;
    const updateSidebarWidget = await context.settings.get('updateSidebarWidget') as boolean | undefined;
    const enableHighlightsPost = await context.settings.get('enableHighlightsPost') as boolean | undefined;
    const highlightsFlairId = await context.settings.get('highlightsFlairId') as string | undefined;
    const livePostTitle = await context.settings.get('livePostTitle') as string | undefined;
    const highlightsPostTitle = await context.settings.get('highlightsPostTitle') as string | undefined;
    const livePostBody = await context.settings.get('livePostBody') as string | undefined;
    const livePostFooter = await context.settings.get('livePostFooter') as string | undefined;
    const concludingPostBody = await context.settings.get('concludingPostBody') as string | undefined;
    const concludingPostFooter = await context.settings.get('concludingPostFooter') as string | undefined;
    const liveSidebarText = await context.settings.get('liveSidebarText') as string | undefined;
    const liveSidebarFooter = await context.settings.get('liveSidebarFooter') as string | undefined;
    const offlineSidebarText = await context.settings.get('offlineSidebarText') as string | undefined;
    const offlineSidebarFooter = await context.settings.get('offlineSidebarFooter') as string | undefined;
    const highlightsHeader = await context.settings.get('highlightsHeader') as string | undefined;
    const highlightsFooter = await context.settings.get('highlightsFooter') as string | undefined;
    const offlineGracePeriod = await context.settings.get('offlineGracePeriod') as number | undefined;
    const suggestedSort = await context.settings.get('suggestedSort') as string | undefined;
    
    if (!channel || !clientId || !secret) {
      console.log(`Missing Twitch configuration - Channel: ${!!channel}, ClientID: ${!!clientId}, Secret: ${!!secret}`);
      return;
    }

    // 2. Fetch Twitch Token (Cached in Redis for 24 hours to prevent rate limiting)
    const cachedToken = await context.redis.get('twitch_access_token');
    let token = '';
    
    if (!cachedToken) {
      console.log('Cache miss: Fetching new Twitch Access Token...');
      try {
        const tokenRes = await fetch(`https://id.twitch.tv/oauth2/token?client_id=${clientId}&client_secret=${secret}&grant_type=client_credentials`, {
          method: 'POST'
        });
        
        if (!tokenRes.ok) {
          console.error('Failed to get Twitch Token');
          return;
        }
        
        const tokenData = await tokenRes.json();
        const accessToken = tokenData.access_token as string | undefined;
        
        if (!accessToken) {
          console.error('Twitch Access Token not found in response');
          return;
        }
        
        token = accessToken;
        
        // Cache token for 24 hours (86400 seconds)
        await context.redis.set('twitch_access_token', token);
        await context.redis.expire('twitch_access_token', 86400);
        console.log('Successfully cached Twitch Access Token.');
      } catch (tokenError) {
        console.error('Error fetching Twitch token:', tokenError);
        return;
      }
    } else {
      console.log('Cache hit: Using cached Twitch Access Token.');
      token = cachedToken;
    }

    // 2.5 Fetch and cache Twitch display name if not already cached
    let cachedDisplayName = await context.redis.get('twitch_display_name');
    if (!cachedDisplayName) {
      try {
        console.log(`Cache miss for twitch_display_name. Fetching user info for ${channel} from Twitch...`);
        const userRes = await fetch(`https://api.twitch.tv/helix/users?login=${channel}`, {
          headers: {
            'Client-ID': clientId as string,
            'Authorization': `Bearer ${token}`
          }
        });
        if (userRes.ok) {
          const userData = await userRes.json();
          if (userData.data && userData.data.length > 0) {
            const resolvedDisplayName = userData.data[0].display_name as string;
            cachedDisplayName = resolvedDisplayName;
            await context.redis.set('twitch_display_name', resolvedDisplayName);
            console.log(`Successfully fetched and cached Twitch display name: ${resolvedDisplayName}`);
          }
        } else {
          console.error(`Failed to fetch user info from Twitch: ${userRes.statusText}`);
        }
      } catch (userError) {
        console.error('Error fetching Twitch user info:', userError);
      }
    }

    // 3. Check Stream Status
    let isLive = false;
    let streamInfo: any = null;
    try {
      const streamRes = await fetch(`https://api.twitch.tv/helix/streams?user_login=${channel}`, {
        headers: {
          'Client-ID': clientId as string,
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!streamRes.ok) {
        console.error('Failed to fetch Twitch stream status');
        return;
      }

      const streamData = await streamRes.json();
      isLive = streamData.data && streamData.data.length > 0;
      if (isLive) {
        streamInfo = streamData.data[0];
      }
    } catch (streamError) {
      console.error('Error checking stream status:', streamError);
      return;
    }
    
    // 4. Update Reddit State
    const isCurrentlyPinned = await context.redis.get('is_live_pinned');
    
    if (isLive && streamInfo) {
      const postBody = formatLivePostBody(streamInfo, channel as string, youtubeUrl, livePostBody, livePostFooter);
      const displayName = streamInfo.user_name || channel;
      const templateTitle = livePostTitle || DEFAULT_LIVE_POST_TITLE;
      const postTitle = templateTitle
        .replace(/{display_name}/g, displayName)
        .replace(/{title}/g, streamInfo.title || 'Live Stream');

      // Reset offline grace period timer if it was active
      const offlineSince = await context.redis.get('offline_since');
      if (offlineSince) {
        await context.redis.del('offline_since');
        console.log('Stream went back online. Cancelled offline grace period.');
      }

      if (!isCurrentlyPinned) {
        // Set the flag immediately to lock out concurrent job executions and prevent race conditions
        await context.redis.set('is_live_pinned', 'true');
        await context.redis.set('twitch_display_name', displayName);

        // Cache stream details to fetch highlights later when the stream concludes
        if (streamInfo.user_id) {
          await context.redis.set('twitch_broadcaster_id', streamInfo.user_id);
        }
        if (streamInfo.started_at) {
          await context.redis.set('twitch_started_at', streamInfo.started_at);
        }
        if (streamInfo.title) {
          await context.redis.set('twitch_stream_title', streamInfo.title);
        }

        console.log('Stream went live! Posting and pinning...');
        
        try {
          // Unsticky offline post if active
          if (stickyOfflinePost) {
            await context.redis.del('is_offline_post_pinned');
            const offlinePostId = await context.redis.get('offline_post_id');
            if (offlinePostId) {
              try {
                const offlinePost = await context.reddit.getPostById(offlinePostId);
                await offlinePost.unsticky();
                console.log(`Successfully unstickied offline post: ${offlinePostId}`);
              } catch (unstickyError) {
                console.error('Failed to unsticky offline post:', unstickyError);
              }
            }
          }

          const subreddit = await context.reddit.getCurrentSubreddit();
          const post = await context.reddit.submitPost({
            title: postTitle,
            subredditName: subreddit.name,
            text: postBody,
          });
          await post.sticky();

          // Set suggested comment sort
          if (suggestedSort && suggestedSort !== 'BLANK') {
            try {
              await post.setSuggestedCommentSort(suggestedSort as any);
              console.log(`Successfully set suggested comment sort to ${suggestedSort}.`);
            } catch (sortError) {
              console.error(`Failed to set suggested comment sort to ${suggestedSort}:`, sortError);
            }
          }
          
          // Apply custom flair if template ID is provided
          if (liveFlairId) {
            try {
              await context.reddit.setPostFlair({
                postId: post.id,
                subredditName: subreddit.name,
                flairTemplateId: liveFlairId as string,
              });
              console.log(`Successfully applied post flair: ${liveFlairId}`);
            } catch (flairError) {
              console.error('Failed to set post flair:', flairError);
            }
          }

          // Submit and sticky comment if text is provided
          const liveCommentText = await context.settings.get('liveCommentText');
          if (liveCommentText) {
            try {
              const comment = await context.reddit.submitComment({
                id: post.id,
                text: liveCommentText as string,
              });
              await comment.distinguish(true);
              console.log('Successfully posted and pinned moderator comment.');
            } catch (commentError) {
              console.error('Failed to post moderator comment:', commentError);
            }
          }
          
          // Save post ID to redis
          await context.redis.set('live_post_id', post.id);
          console.log(`Successfully posted and pinned: ${post.id}`);
        } catch (e) {
          console.error('Failed to post stream status to Reddit, resetting lock:', e);
          // Clear lock if the operation failed, so we can retry on next cron execution
          await context.redis.del('is_live_pinned');
        }
      } else {
        // Stream is already live. Let's update the post with real-time stats (viewer count, uptime, game, etc.)
        console.log('Stream is still live. Updating post stats in real-time...');
        const postId = await context.redis.get('live_post_id');
        if (postId) {
          try {
            const post = await context.reddit.getPostById(postId);
            await post.edit({ text: postBody });
            console.log(`Successfully updated live post stats for: ${postId}`);
          } catch (e) {
            console.error('Failed to update live post stats:', e);
          }
        }
      }
      
    } else if (!isLive && isCurrentlyPinned) {
      // Stream is detected offline but was marked pinned. Check offline grace period!
      const offlineSince = await context.redis.get('offline_since');
      
      const gracePeriodMin = (offlineGracePeriod !== undefined && offlineGracePeriod >= 0) ? offlineGracePeriod : 6;
      
      if (!offlineSince) {
        // First check detecting offline status. Start the grace period!
        const timestamp = Date.now().toString();
        await context.redis.set('offline_since', timestamp);
        console.log(`Stream detected offline. Starting ${gracePeriodMin}-minute grace period buffer...`);
      } else {
        // Subsequent check detecting offline status. Parse and check elapsed time.
        const firstOfflineTime = parseInt(offlineSince, 10);
        const elapsedMinutes = (Date.now() - firstOfflineTime) / 60000;
        
        console.log(`Stream is still offline. Grace period active: ${elapsedMinutes.toFixed(1)}m elapsed of ${gracePeriodMin}m.`);
        
        if (elapsedMinutes >= gracePeriodMin) {
          console.log('Grace period expired! Concluding post and unpinning...');
          
          // Clear live state immediately to prevent duplicate conclude/unpin calls
          await context.redis.del('is_live_pinned');
          await context.redis.del('offline_since');
          const postId = await context.redis.get('live_post_id');
          await context.redis.del('live_post_id');
          
          // Get the details we cached when the stream went live
          const broadcasterId = await context.redis.get('twitch_broadcaster_id');
          const startedAt = await context.redis.get('twitch_started_at');
          const streamTitle = await context.redis.get('twitch_stream_title') || 'Recent Stream';
          const cachedDisplayName = await context.redis.get('twitch_display_name');
          const displayName = cachedDisplayName || (channel as string);
          
          // Clean up the cached stream details
          await context.redis.del('twitch_broadcaster_id');
          await context.redis.del('twitch_started_at');
          await context.redis.del('twitch_stream_title');
          await context.redis.del('twitch_display_name');
          
          if (postId) {
            try {
              const post = await context.reddit.getPostById(postId);
              
              if (deleteOfflinePost) {
                console.log(`Deleting post completely: ${postId}`);
                await post.delete();
              } else {
                if (removeOfflinePost) {
                  console.log(`Removing post from feed: ${postId}`);
                  await post.remove();
                } else {
                  // Update live post body with the concluding message
                  try {
                    const concludingBody = formatOfflinePostBody(
                      channel as string,
                      youtubeUrl,
                      concludingPostBody,
                      concludingPostFooter,
                      DEFAULT_CONCLUDING_POST_BODY,
                      displayName,
                      streamTitle
                    );
                    await post.edit({ text: concludingBody });
                    console.log(`Successfully updated concluding body for post: ${postId}`);
                  } catch (editError) {
                    console.error('Failed to update concluding body:', editError);
                  }
                  
                  // Unpin the concluding post
                  await post.unsticky();
                  console.log(`Successfully unpinned concluding post: ${postId}`);
                }

                // Lock the post to prevent further comments since stream has ended
                try {
                  await post.lock();
                  console.log(`Successfully locked concluding post: ${postId}`);
                } catch (lockError) {
                  console.error('Failed to lock concluding post:', lockError);
                }
              }
            } catch (e) {
              console.error('Failed to conclude/unsticky/delete/remove post:', e);
            }
          }

          // Trigger stream highlights compilation if enabled
          if (enableHighlightsPost && broadcasterId && startedAt) {
            try {
              await postStreamHighlights(
                context,
                clientId as string,
                token,
                broadcasterId,
                startedAt,
                streamTitle,
                channel as string,
                displayName,
                highlightsHeader,
                highlightsFooter,
                highlightsFlairId,
                highlightsPostTitle
              );
            } catch (highlightsError) {
              console.error('Failed to trigger postStreamHighlights:', highlightsError);
            }
          }

          // Handle sticky offline post if enabled
          if (stickyOfflinePost) {
            await ensureStickyOfflinePost(context, channel as string, youtubeUrl);
          }
        }
      }
    } else if (!isLive && !isCurrentlyPinned) {
      // Stream is offline and we are not currently transitioning. Ensure offline post is active if enabled.
      if (stickyOfflinePost) {
        const isOfflinePostPinned = await context.redis.get('is_offline_post_pinned');
        if (!isOfflinePostPinned) {
          console.log('Offline post is not marked as pinned in Redis. Ensuring sticky offline post is active...');
          await ensureStickyOfflinePost(context, channel as string, youtubeUrl);
        }
      }
    }

    // 5. Update Sidebar Widget if enabled
    if (updateSidebarWidget) {
      try {
        const cachedDisplayName = await context.redis.get('twitch_display_name');
        const displayName = isLive && streamInfo ? (streamInfo.user_name || channel) : (cachedDisplayName || channel);
        const widgetText = formatSidebarWidgetText(
          isLive,
          streamInfo,
          displayName as string,
          channel as string,
          youtubeUrl,
          liveSidebarText,
          offlineSidebarText,
          liveSidebarFooter,
          offlineSidebarFooter
        );
        
        const currentSubredditName = await context.reddit.getCurrentSubredditName();
        const widgets = await context.reddit.getWidgets(currentSubredditName);
        const widgetName = 'STREAM STATUS';
        
        let statusWidget = widgets.find(
          (w) => w.name === widgetName || (w.name && w.name.toLowerCase().includes('stream status'))
        );

        if (statusWidget) {
          await context.reddit.updateWidget({
            type: 'textarea',
            subreddit: currentSubredditName,
            id: statusWidget.id,
            shortName: widgetName,
            text: widgetText
          });
          console.log(`Successfully updated sidebar widget: ${statusWidget.id}`);
        } else {
          const newWidget = await context.reddit.addWidget({
            type: 'textarea',
            subreddit: currentSubredditName,
            shortName: widgetName,
            text: widgetText
          });
          console.log(`Successfully created and added sidebar widget: ${newWidget.id}`);
        }
      } catch (widgetError) {
        console.error('Failed to update sidebar widget:', widgetError);
      }
    }
  }
});

// Helper function to safely clear existing jobs and schedule a new one
const scheduleCheckStatusJob = async (context: any) => {
  console.log('Clearing existing scheduled jobs to prevent duplicates...');
  try {
    const jobs = await context.scheduler.listJobs();
    for (const job of jobs) {
      if (job.name === 'check-twitch-status') {
        console.log(`Cancelling duplicate/old scheduled job: ${job.id}`);
        await context.scheduler.cancelJob(job.id);
      }
    }
    
    console.log('Scheduling check-twitch-status job (every 2 minutes)...');
    await context.scheduler.runJob({
      name: 'check-twitch-status',
      cron: '*/2 * * * *',
    });
    console.log('Scheduling immediate check-twitch-status execution...');
    await context.scheduler.runJob({
      name: 'check-twitch-status',
      runAt: new Date(Date.now() + 1000),
    });
    console.log('Successfully scheduled check-twitch-status job.');
  } catch (e) {
    console.error('Failed to setup scheduled job:', e);
  }
};

// Trigger the job to start running when the app is installed or upgraded
Devvit.addTrigger({
  event: 'AppInstall',
  onEvent: async (_, context) => {
    console.log('App installed trigger fired.');
    await scheduleCheckStatusJob(context);
  }
});

Devvit.addTrigger({
  event: 'AppUpgrade',
  onEvent: async (_, context) => {
    console.log('App upgraded trigger fired.');
    await scheduleCheckStatusJob(context);
  }
});

// Add a moderator menu item to manually restart the scheduler and clear bot state
Devvit.addMenuItem({
  label: 'Restart LiveSticky',
  description: 'Clears cached stream status and restarts the background status checker.',
  location: 'subreddit',
  forUserType: 'moderator',
  onPress: async (_, context) => {
    console.log('Manual LiveSticky restart triggered by moderator. Clearing scheduler and Redis state...');
    await scheduleCheckStatusJob(context);
    await context.redis.del('is_live_pinned');
    await context.redis.del('live_post_id');
    await context.redis.del('offline_since');
    await context.redis.del('offline_post_id');
    await context.redis.del('twitch_display_name');
    await context.redis.del('is_offline_post_pinned');
    context.ui.showToast('LiveSticky has been restarted!');
  },
});

// Add a moderator menu item to quickly access the default settings templates
Devvit.addMenuItem({
  label: 'Get Default LiveSticky Templates',
  description: 'Opens the GitHub page with copy-pasteable templates for your settings.',
  location: 'subreddit',
  forUserType: 'moderator',
  onPress: async (_, context) => {
    context.ui.navigateTo('https://github.com/iammesutkaya/LiveSticky#-default-templates-for-copy-pasting');
  },
});

export default Devvit;
