/**
 * Pure template-formatting functions with no Devvit dependencies.
 * Extracted here so they can be imported by tests without loading
 * the Devvit runtime (which requires a live app context).
 */

import {
  DEFAULT_LIVE_POST_BODY,
  DEFAULT_OFFLINE_POST_BODY,
} from './templates.js';

export interface TemplateVariables {
  twitchChannel?: string;
  youtubeChannel?: string;
  kickChannel?: string;
  twitchUrl?: string;
  youtubeUrl?: string;
  kickUrl?: string;
  streamHandle?: string;
  streamDisplayName?: string;
  streamTitle?: string;
  streamGame?: string;
  streamViewers?: string;
  streamUptime?: string;
  dateStr?: string;
  monthLabel?: string;
  previousHighlightsUrl?: string;
}

// ---------------------------------------------------------------------------
// Placeholder removal helpers
// ---------------------------------------------------------------------------

export const removeYoutubeLink = (text: string): string =>
  text
    .split('\n')
    .map((line) => {
      if (line.includes('{youtube_url}')) {
        const cleaned = line.replace(
          /\s*([|•·\-‐‑⁃]|\s{2,})\s*(🟥\s*)?(\*\*)?\[.*?\]\(\{youtube_url\}\)(\*\*)?/gi,
          ''
        );
        return cleaned.includes('{youtube_url}') ? null : cleaned;
      }
      return line;
    })
    .filter((line): line is string => line !== null)
    .join('\n');

export const removeTwitchLink = (text: string): string =>
  text
    .split('\n')
    .map((line) => {
      if (line.includes('{twitch_url}') || line.includes('twitch.tv/{twitch_channel}') || line.includes('twitch.tv/{stream_handle}')) {
        const cleaned = line
          .replace(
            /\s*([|•·\-‐‑⁃]|\s{2,})?\s*(🟪\s*)?(\*\*)?\[.*?\]\((https:\/\/twitch\.tv\/\{twitch_channel\}|https:\/\/twitch\.tv\/\{stream_handle\}|\{twitch_url\})\)(\*\*)?/gi,
            ''
          )
          .replace(/^\s*([|•·\-‐‑⁃])\s*/, '')
          .replace(/\s*([|•·\-‐‑⁃])\s*$/, '');
        return cleaned.includes('{twitch_url}') || cleaned.includes('twitch.tv/{twitch_channel}') || cleaned.includes('twitch.tv/{stream_handle}')
          ? null
          : cleaned;
      }
      return line;
    })
    .filter((line): line is string => line !== null)
    .join('\n');

export const removeKickLink = (text: string): string =>
  text
    .split('\n')
    .map((line) => {
      if (line.includes('{kick_url}')) {
        const cleaned = line.replace(
          /\s*([|•·\-‐‑⁃]|\s{2,})\s*(🟩\s*)?(\*\*)?\[.*?\]\(\{kick_url\}\)(\*\*)?/gi,
          ''
        );
        return cleaned.includes('{kick_url}') ? null : cleaned;
      }
      return line;
    })
    .filter((line): line is string => line !== null)
    .join('\n');

// ---------------------------------------------------------------------------
// URL builders
// ---------------------------------------------------------------------------

export const buildYouTubeUrl = (channel?: string | null): string | undefined => {
  const trimmed = channel?.trim();
  if (!trimmed) return undefined;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^UC[a-zA-Z0-9_-]{22}$/.test(trimmed)) {
    return `https://www.youtube.com/channel/${trimmed}`;
  }
  return `https://www.youtube.com/@${trimmed.replace(/^@/, '')}`;
};

export const buildKickUrl = (channel?: string | null): string | undefined => {
  const trimmed = channel?.trim();
  return trimmed ? `https://kick.com/${trimmed}` : undefined;
};

// ---------------------------------------------------------------------------
// Post body formatters
// ---------------------------------------------------------------------------

export const replaceTemplateVariables = (text: string, vars: TemplateVariables, isLive: boolean): string => {
  let result = text;
  
  // Platform specific variables
  result = result.replace(/{twitch_channel}/g, vars.twitchChannel || '');
  result = result.replace(/{youtube_channel}/g, vars.youtubeChannel || '');
  result = result.replace(/{kick_channel}/g, vars.kickChannel || '');

  // Active stream variables
  if (isLive) {
    result = result
      .replace(/{stream_handle}/g, vars.streamHandle || '')
      .replace(/{stream_display_name}/g, vars.streamDisplayName || '')
      .replace(/{stream_title}/g, vars.streamTitle || '')
      .replace(/{stream_game}/g, vars.streamGame || '')
      .replace(/{stream_viewers}/g, vars.streamViewers || '')
      .replace(/{stream_uptime}/g, vars.streamUptime || '')
      // Backward-compatible fallback aliases for old template settings
      .replace(/{display_name}/g, vars.streamDisplayName || '')
      .replace(/{title}/g, vars.streamTitle || '')
      .replace(/{game}/g, vars.streamGame || '')
      .replace(/{viewers}/g, vars.streamViewers || '')
      .replace(/{uptime}/g, vars.streamUptime || '');
  } else {
    // Offline fallback aliases
    result = result
      .replace(/{stream_handle}/g, vars.streamHandle || '')
      .replace(/{stream_display_name}/g, vars.streamDisplayName || '')
      .replace(/{stream_title}/g, vars.streamTitle || '')
      // Backward-compatible fallback aliases for old template settings
      .replace(/{display_name}/g, vars.streamDisplayName || '')
      .replace(/{title}/g, vars.streamTitle || '');
  }

  if (vars.dateStr) {
    result = result.replace(/{date}/g, vars.dateStr);
  }

  if (vars.monthLabel) {
    result = result.replace(/{month}/g, vars.monthLabel);
  }

  if (vars.previousHighlightsUrl) {
    result = result.replace(/{previous_highlights_url}/g, vars.previousHighlightsUrl);
  }

  // Link variables (with cleanup if missing)
  result = vars.twitchUrl ? result.replace(/{twitch_url}/g, vars.twitchUrl) : removeTwitchLink(result);
  result = vars.youtubeUrl ? result.replace(/{youtube_url}/g, vars.youtubeUrl) : removeYoutubeLink(result);
  result = vars.kickUrl ? result.replace(/{kick_url}/g, vars.kickUrl) : removeKickLink(result);

  return result;
};

export const formatLivePostBody = (
  vars: TemplateVariables,
  customBody?: string,
  footer?: string
): string => {
  const content = customBody?.trim() || DEFAULT_LIVE_POST_BODY;
  let result = replaceTemplateVariables(content, vars, true);

  if (footer?.trim()) {
    result += `\n\n${replaceTemplateVariables(footer.trim(), vars, true)}`;
  }
  return result;
};

export const formatOfflinePostBody = (
  vars: TemplateVariables,
  customBody?: string,
  footer?: string,
  defaultTemplate: string = DEFAULT_OFFLINE_POST_BODY
): string => {
  const content = customBody?.trim() || defaultTemplate;
  let result = replaceTemplateVariables(content, vars, false);

  if (footer?.trim()) {
    result += `\n\n${replaceTemplateVariables(footer.trim(), vars, false)}`;
  }
  return result;
};

/**
 * Compute a human-readable uptime string from a started-at ISO timestamp.
 */
export const computeUptime = (startedAt: string | null | undefined): string => {
  if (!startedAt) return '';
  const startTime = new Date(startedAt).getTime();
  if (isNaN(startTime)) return '';
  const elapsedMs = Date.now() - startTime;
  if (elapsedMs < 0) return '';
  const hours = Math.floor(elapsedMs / 3600000);
  const minutes = Math.floor((elapsedMs % 3600000) / 60000);
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
};

// ---------------------------------------------------------------------------
// Clip compilation body building (shared by the reused per-stream highlights
// post and the monthly top-20 post)
// ---------------------------------------------------------------------------

export interface ClipInfo {
  title: string;
  url: string;
  views: number;
  creator: string;
  thumbnailUrl?: string;
  redditThumbnailUrl?: string;
}

/** Render an HTML ordered list from clips for Wiki pages. */
export const renderClipListHtml = (clips: ClipInfo[]): string =>
  '<ol>\n' +
  clips
    .map((c) => {
      const imgUrl =
        c.redditThumbnailUrl ||
        (c.thumbnailUrl && (c.thumbnailUrl.includes('redd.it') || c.thumbnailUrl.includes('reddit.com')) ? c.thumbnailUrl : '');
      const thumbHtml = imgUrl
        ? `<a href="${c.url}"><img src="${imgUrl}" alt="${c.title || 'Clip Thumbnail'}" width="360" style="border-radius: 8px; margin: 6px 0; display: block; max-width: 100%;"></a>\n`
        : '';
      return (
        `  <li style="margin-bottom: 16px;">\n` +
        `    <strong><a href="${c.url}">${c.title || 'Untitled Clip'}</a></strong><br>\n` +
        `    ${thumbHtml}` +
        `    👁️ <strong>Views:</strong> ${(c.views || 0).toLocaleString()} &bull; 👤 <strong>Clipped by:</strong> ${c.creator || 'Anonymous'}\n` +
        `  </li>`
      );
    })
    .join('\n') +
  '\n</ol>';

/** One stream's worth of clips, kept in the reused highlights post's archive. */
export interface HighlightsEdition {
  dateStr: string;
  clips: ClipInfo[];
}

/** Render a numbered markdown list from clips (no header/footer). */
export const renderClipList = (clips: ClipInfo[]): string =>
  clips
    .map(
      (c, i) =>
        `${i + 1}. **[${c.title || 'Untitled Clip'}](${c.url})**\n` +
        `   * **Views:** ${(c.views || 0).toLocaleString()}\n` +
        `   * **Clipped by:** ${c.creator || 'Anonymous'}`
    )
    .join('\n\n');

/**
 * Build the full body of the reused highlights post: header, the newest stream's
 * clips, then up to `maxEditions - 1` older editions under a "Previous
 * compilations" divider, then footer. `editions` is newest-first.
 */
export const buildHighlightsBody = (
  editions: HighlightsEdition[],
  vars: TemplateVariables,
  headerTemplate: string,
  footerTemplate: string,
  maxEditions: number
): string => {
  const header = replaceTemplateVariables(headerTemplate, vars, false);
  const capped = editions.slice(0, maxEditions);

  let body = header ? `${header}\n\n` : '';
  capped.forEach((edition, idx) => {
    if (idx === 0) {
      body += `## 🎬 ${edition.dateStr}\n\n${renderClipList(edition.clips)}\n`;
    } else {
      if (idx === 1) body += `\n---\n\n### Previous compilations\n\n`;
      body += `#### ${edition.dateStr}\n\n${renderClipList(edition.clips)}\n`;
    }
  });

  if (vars.previousHighlightsUrl && !headerTemplate.includes('{previous_highlights_url}') && !footerTemplate.includes('{previous_highlights_url}')) {
    body += `\n📌 **Previous Stream Clips:** [View highlights from previous stream](${vars.previousHighlightsUrl})\n\n`;
  }

  body += replaceTemplateVariables(footerTemplate, vars, false);
  return body;
};

/**
 * Build the reused post body when the full history lives in a wiki page: header,
 * only the newest stream's clips, a link to the wiki archive, then footer.
 */
export const buildLatestClipsBody = (
  latest: HighlightsEdition,
  vars: TemplateVariables,
  headerTemplate: string,
  footerTemplate: string,
  archiveUrl: string
): string => {
  const header = replaceTemplateVariables(headerTemplate, vars, false);
  let body = header ? `${header}\n\n` : '';
  body += `## 🎬 ${latest.dateStr}\n\n${renderClipList(latest.clips)}\n`;

  if (vars.previousHighlightsUrl && !headerTemplate.includes('{previous_highlights_url}') && !footerTemplate.includes('{previous_highlights_url}')) {
    body += `\n📌 **Previous Stream Clips:** [View highlights from previous stream](${vars.previousHighlightsUrl})\n`;
  }

  body += `\n📚 **[Browse the full clip archive →](${archiveUrl})**\n\n`;
  body += replaceTemplateVariables(footerTemplate, vars, false);
  return body;
};



/**
 * Build the full wiki archive page HTML: every stored edition, newest first.
 */
export const buildWikiArchiveHtml = (
  editions: HighlightsEdition[],
  displayName: string,
  title: string = 'Clip Archive',
  intro: string = 'Top Twitch clips from every stream, compiled automatically by LiveSticky. Newest first.',
  subredditName?: string
): string => {
  const who = displayName ? ` - ${displayName}` : '';
  const hubBacklink = subredditName ? `<p>📚 <strong><a href="/r/${subredditName}/wiki/livesticky">← Return to LiveSticky Archive Hub</a></strong></p>\n` : '';
  let out = `<h1>${title}${who}</h1>\n${hubBacklink}<p><em>${intro}</em></p>\n<hr>\n`;
  editions.forEach((edition, idx) => {
    out += `<h1>${edition.dateStr}</h1>\n${renderClipListHtml(edition.clips)}\n`;
    if (idx < editions.length - 1) {
      out += `<hr>\n`;
    }
  });
  if (subredditName) {
    out += `<hr>\n<p>📚 <strong><a href="/r/${subredditName}/wiki/livesticky">← Return to LiveSticky Archive Hub</a></strong></p>\n`;
  }
  return out;
};

/**
 * Build the full wiki archive page markdown: every stored edition, newest first.
 * `title` and `intro` default to the per-stream clip archive wording; the monthly
 * archive passes its own.
 */
export const buildWikiArchive = (
  editions: HighlightsEdition[],
  displayName: string,
  title: string = 'Clip Archive',
  intro: string = 'Top Twitch clips from every stream, compiled automatically by LiveSticky. Newest first.',
  subredditName?: string
): string => {
  const who = displayName ? ` - ${displayName}` : '';
  const hubBacklink = subredditName ? `📚 **[← Return to LiveSticky Archive Hub](/r/${subredditName}/wiki/livesticky)**\n\n` : '';
  let out = `# ${title}${who}\n\n${hubBacklink}*${intro}*\n\n---\n\n`;
  editions.forEach((edition, idx) => {
    out += `# ${edition.dateStr}\n\n${renderClipList(edition.clips)}\n\n`;
    if (idx < editions.length - 1) {
      out += `---\n\n`;
    }
  });
  if (subredditName) {
    out += `---\n\n📚 **[← Return to LiveSticky Archive Hub](/r/${subredditName}/wiki/livesticky)**\n`;
  }
  return out;
};

/**
 * Build a single-section clips post body (used by the monthly top-20 post). When
 * `archiveUrl` is given, links to the wiki archive of past compilations.
 */
export const buildSingleClipsBody = (
  clips: ClipInfo[],
  vars: TemplateVariables,
  headerTemplate: string,
  footerTemplate: string,
  archiveUrl?: string
): string => {
  const header = replaceTemplateVariables(headerTemplate, vars, false);
  let body = header ? `${header}\n\n` : '';
  body += `${renderClipList(clips)}\n`;
  if (archiveUrl) body += `\n📚 **[Browse all monthly compilations →](${archiveUrl})**\n\n`;
  body += replaceTemplateVariables(footerTemplate, vars, false);
  return body;
};
