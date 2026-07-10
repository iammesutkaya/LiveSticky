import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  formatLivePostBody,
  formatOfflinePostBody,
  buildYouTubeUrl,
  buildKickUrl,
  removeYoutubeLink,
  removeTwitchLink,
  removeKickLink,
  computeUptime,
  type TemplateVariables,
} from '../formatters.js';

const mockVars: TemplateVariables = {
  twitchChannel: 'coolstreamer',
  twitchUrl: 'https://twitch.tv/coolstreamer',
  streamHandle: 'coolstreamer',
  streamDisplayName: 'CoolStreamer',
  streamTitle: 'Epic Gaming Session',
  streamGame: 'Minecraft',
  streamViewers: '5,420',
  streamUptime: '1h 30m',
  dateStr: 'May 28, 2026',
};

describe('formatLivePostBody', () => {
  it('replaces all placeholders for a Twitch stream', () => {
    const result = formatLivePostBody(
      mockVars,
      '{stream_game} - {stream_viewers} - {stream_uptime} - {twitch_url}'
    );
    expect(result).toContain('Minecraft');
    expect(result).toContain('5,420');
    expect(result).toContain('https://twitch.tv/coolstreamer');
  });

  it('replaces display_name placeholder from stream info', () => {
    const result = formatLivePostBody(
      mockVars,
      '{stream_display_name} is live playing {stream_game}'
    );
    expect(result).toContain('CoolStreamer is live playing Minecraft');
  });

  it('replaces display_name placeholder using backward-compatible fallback alias', () => {
    const result = formatLivePostBody(
      mockVars,
      '{display_name} is live playing {game}'
    );
    expect(result).toContain('CoolStreamer is live playing Minecraft');
  });

  it('strips Twitch link when twitchUrl is omitted (uses {twitch_url} placeholder)', () => {
    const template = '**[Watch on Twitch]({twitch_url})**';
    const varsWithoutTwitch = { ...mockVars, twitchUrl: undefined };
    const result = formatLivePostBody(varsWithoutTwitch, template);
    expect(result).not.toContain('{twitch_url}');
    expect(result.trim()).toBe('');
  });

  it('appends footer when provided', () => {
    const result = formatLivePostBody(mockVars, 'body', 'My footer');
    expect(result).toContain('My footer');
  });
});

describe('formatOfflinePostBody', () => {
  it('replaces channel placeholder', () => {
    const result = formatOfflinePostBody(mockVars, '{twitch_channel} is offline');
    expect(result).toBe('coolstreamer is offline');
  });

  it('strips YouTube link when youtubeUrl is omitted', () => {
    const template = '**[Watch on YouTube]({youtube_url})**';
    const varsWithoutYoutube = { ...mockVars, youtubeUrl: undefined };
    const result = formatOfflinePostBody(varsWithoutYoutube, template);
    expect(result).not.toContain('youtube');
  });

  it('appends footer', () => {
    const result = formatOfflinePostBody(mockVars, 'body', 'footer text');
    expect(result).toContain('\n\nfooter text');
  });
});

describe('buildYouTubeUrl', () => {
  it('returns undefined for falsy input', () => {
    expect(buildYouTubeUrl(null)).toBeUndefined();
    expect(buildYouTubeUrl('')).toBeUndefined();
    expect(buildYouTubeUrl(undefined)).toBeUndefined();
  });

  it('returns a full URL for @handle input', () => {
    expect(buildYouTubeUrl('@MrBeast')).toBe('https://www.youtube.com/@MrBeast');
  });

  it('strips leading @ before prepending it', () => {
    expect(buildYouTubeUrl('MrBeast')).toBe('https://www.youtube.com/@MrBeast');
  });

  it('returns channel URL for a channel ID', () => {
    const id = 'UCXuqSBlHAE6Xw-yeJA0Tunw'; // 24-char UC... ID
    expect(buildYouTubeUrl(id)).toBe(`https://www.youtube.com/channel/${id}`);
  });

  it('passes through a full URL unchanged', () => {
    const url = 'https://www.youtube.com/@SomeChannel';
    expect(buildYouTubeUrl(url)).toBe(url);
  });
});

describe('buildKickUrl', () => {
  it('returns undefined for falsy input', () => {
    expect(buildKickUrl(null)).toBeUndefined();
    expect(buildKickUrl('')).toBeUndefined();
  });

  it('builds a kick.com URL', () => {
    expect(buildKickUrl('streamer123')).toBe('https://kick.com/streamer123');
  });
});

describe('removeYoutubeLink', () => {
  it('removes a YouTube link line from template text', () => {
    const text = 'Watch here:\n• **[YouTube]({youtube_url})**\nSome other line';
    const result = removeYoutubeLink(text);
    expect(result).not.toContain('{youtube_url}');
    expect(result).toContain('Some other line');
  });

  it('is a no-op when there is no YouTube placeholder', () => {
    const text = 'No youtube link here';
    expect(removeYoutubeLink(text)).toBe(text);
  });
});

describe('removeTwitchLink', () => {
  it('removes a Twitch link line', () => {
    const text = 'Watch here:\n• **[Twitch](https://twitch.tv/{twitch_channel})**\nOther';
    const result = removeTwitchLink(text);
    expect(result).not.toContain('twitch.tv/{twitch_channel}');
    expect(result).toContain('Other');
  });
});

describe('removeKickLink', () => {
  it('removes a Kick link line', () => {
    const text = 'Watch here:\n• **[Kick]({kick_url})**\nOther';
    const result = removeKickLink(text);
    expect(result).not.toContain('{kick_url}');
    expect(result).toContain('Other');
  });
});

describe('computeUptime', () => {
  const now = new Date('2024-01-15T12:00:00Z').getTime();

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns empty string for null', () => {
    expect(computeUptime(null)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(computeUptime(undefined)).toBe('');
  });

  it('returns empty string for an invalid date', () => {
    expect(computeUptime('not-a-date')).toBe('');
  });

  it('returns minutes only for short uptimes', () => {
    const startedAt = new Date(now - 45 * 60000).toISOString();
    expect(computeUptime(startedAt)).toBe('45m');
  });

  it('returns hours and minutes for long uptimes', () => {
    const startedAt = new Date(now - (2 * 3600000 + 30 * 60000)).toISOString();
    expect(computeUptime(startedAt)).toBe('2h 30m');
  });

  it('returns empty string for future timestamps', () => {
    const startedAt = new Date(now + 60000).toISOString();
    expect(computeUptime(startedAt)).toBe('');
  });
});
