/**
 * Pure template-formatting functions with no Devvit dependencies.
 * Extracted here so they can be imported by tests without loading
 * the Devvit runtime (which requires a live app context).
 */

import {
  DEFAULT_LIVE_POST_BODY,
  DEFAULT_OFFLINE_POST_BODY,
} from './templates.js';
import type { UnifiedStreamInfo } from './platforms.js';

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
      if (line.includes('twitch.tv/{channel}') || line.includes('{twitch_url}') || line.includes('twitch.tv/{twitch_channel}') || line.includes('twitch.tv/{stream_handle}')) {
        const cleaned = line
          .replace(
            /\s*([|•·\-‐‑⁃]|\s{2,})?\s*(🟪\s*)?(\*\*)?\[.*?\]\((https:\/\/twitch\.tv\/\{channel\}|https:\/\/twitch\.tv\/\{twitch_channel\}|https:\/\/twitch\.tv\/\{stream_handle\}|\{twitch_url\})\)(\*\*)?/gi,
            ''
          )
          .replace(/^\s*([|•·\-‐‑⁃])\s*/, '')
          .replace(/\s*([|•·\-‐‑⁃])\s*$/, '');
        return cleaned.includes('twitch.tv/{channel}') || cleaned.includes('{twitch_url}') || cleaned.includes('twitch.tv/{twitch_channel}') || cleaned.includes('twitch.tv/{stream_handle}')
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
  
  // Backwards compatibility legacy handle logic: Twitch > YouTube > Kick
  const legacyChannel = vars.twitchChannel || vars.youtubeChannel || vars.kickChannel || '';
  
  // Platform specific variables
  result = result.replace(/{twitch_channel}/g, vars.twitchChannel || '');
  result = result.replace(/{youtube_channel}/g, vars.youtubeChannel || '');
  result = result.replace(/{kick_channel}/g, vars.kickChannel || '');

  // Active stream variables (alias legacy variables to active stream)
  if (isLive) {
    result = result
      .replace(/{stream_handle}/g, vars.streamHandle || '')
      .replace(/{stream_display_name}/g, vars.streamDisplayName || '')
      .replace(/{display_name}/g, vars.streamDisplayName || '')
      .replace(/{stream_title}/g, vars.streamTitle || '')
      .replace(/{title}/g, vars.streamTitle || '')
      .replace(/{stream_game}/g, vars.streamGame || '')
      .replace(/{game}/g, vars.streamGame || '')
      .replace(/{stream_viewers}/g, vars.streamViewers || '')
      .replace(/{viewers}/g, vars.streamViewers || '')
      .replace(/{stream_uptime}/g, vars.streamUptime || '')
      .replace(/{uptime}/g, vars.streamUptime || '');
  } else {
    // Offline fallback aliases
    result = result
      .replace(/{stream_handle}/g, vars.streamHandle || '')
      .replace(/{stream_display_name}/g, vars.streamDisplayName || '')
      .replace(/{display_name}/g, vars.streamDisplayName || '')
      .replace(/{stream_title}/g, vars.streamTitle || '')
      .replace(/{title}/g, vars.streamTitle || '');
  }

  // Legacy channel fallback always processes
  result = result.replace(/{channel}/g, legacyChannel);
  
  if (vars.dateStr) {
    result = result.replace(/{date}/g, vars.dateStr);
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
  const content = customBody || DEFAULT_LIVE_POST_BODY;
  let result = replaceTemplateVariables(content, vars, true);

  if (footer) {
    result += `\n\n${replaceTemplateVariables(footer, vars, true)}`;
  }
  return result;
};

export const formatOfflinePostBody = (
  vars: TemplateVariables,
  customBody?: string,
  footer?: string,
  defaultTemplate: string = DEFAULT_OFFLINE_POST_BODY
): string => {
  const content = customBody || defaultTemplate;
  let result = replaceTemplateVariables(content, vars, false);

  if (footer) {
    result += `\n\n${replaceTemplateVariables(footer, vars, false)}`;
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
