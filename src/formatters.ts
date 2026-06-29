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
      if (line.includes('twitch.tv/{channel}') || line.includes('{twitch_url}')) {
        const cleaned = line
          .replace(
            /\s*([|•·\-‐‑⁃]|\s{2,})?\s*(🟪\s*)?(\*\*)?\[.*?\]\((https:\/\/twitch\.tv\/\{channel\}|\{twitch_url\})\)(\*\*)?/gi,
            ''
          )
          .replace(/^\s*([|•·\-‐‑⁃])\s*/, '')
          .replace(/\s*([|•·\-‐‑⁃])\s*$/, '');
        return cleaned.includes('twitch.tv/{channel}') || cleaned.includes('{twitch_url}')
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

export const formatLivePostBody = (
  streamInfo: UnifiedStreamInfo,
  channelName: string,
  twitchUrl?: string,
  youtubeUrl?: string,
  kickUrl?: string,
  customBody?: string,
  footer?: string
): string => {
  const title = streamInfo.title || 'Live Stream';
  const gameName = streamInfo.game_name || 'Just Chatting';
  const viewerCount =
    streamInfo.viewer_count !== undefined ? streamInfo.viewer_count.toLocaleString() : '0';
  const startedAt = streamInfo.started_at ? new Date(streamInfo.started_at) : new Date();

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

  result = twitchUrl ? result.replace(/{twitch_url}/g, twitchUrl) : removeTwitchLink(result);
  result = youtubeUrl ? result.replace(/{youtube_url}/g, youtubeUrl) : removeYoutubeLink(result);
  result = kickUrl ? result.replace(/{kick_url}/g, kickUrl) : removeKickLink(result);

  if (footer) result += `\n\n${footer}`;
  return result;
};

export const formatOfflinePostBody = (
  channelName: string,
  twitchUrl?: string,
  youtubeUrl?: string,
  kickUrl?: string,
  customBody?: string,
  footer?: string,
  defaultTemplate: string = DEFAULT_OFFLINE_POST_BODY,
  displayName?: string,
  title?: string
): string => {
  const content = customBody || defaultTemplate;
  let result = content.replace(/{channel}/g, channelName);

  result = twitchUrl ? result.replace(/{twitch_url}/g, twitchUrl) : removeTwitchLink(result);
  if (displayName) result = result.replace(/{display_name}/g, displayName);
  if (title) result = result.replace(/{title}/g, title);
  result = youtubeUrl ? result.replace(/{youtube_url}/g, youtubeUrl) : removeYoutubeLink(result);
  result = kickUrl ? result.replace(/{kick_url}/g, kickUrl) : removeKickLink(result);

  if (footer) result += `\n\n${footer}`;
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
