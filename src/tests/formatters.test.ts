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
  replaceTemplateVariables,
  buildHighlightsBody,
  buildLatestClipsBody,
  buildWikiArchive,
  buildSingleClipsBody,
  type TemplateVariables,
  type HighlightsEdition,
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

describe('replaceTemplateVariables - monthly var', () => {
  it('replaces {month} for monthly posts', () => {
    const result = replaceTemplateVariables('Top clips of {month}', { monthLabel: 'August 2026' }, false);
    expect(result).toBe('Top clips of August 2026');
  });
});

describe('buildHighlightsBody - reused post archive', () => {
  const mkEdition = (n: number): HighlightsEdition => ({
    dateStr: `Day ${n}`,
    clips: [{ title: `Clip ${n}`, url: `https://clips.twitch.tv/${n}`, views: n * 100, creator: `user${n}` }],
  });

  it('puts the newest edition on top and older ones under a Previous divider', () => {
    const body = buildHighlightsBody([mkEdition(3), mkEdition(2), mkEdition(1)], {}, 'HEADER', 'FOOTER', 6);
    expect(body.startsWith('HEADER')).toBe(true);
    expect(body).toContain('## 🎬 Day 3');
    expect(body).toContain('### Previous compilations');
    expect(body).toContain('#### Day 2');
    expect(body).toContain('#### Day 1');
    // Newest must appear before the "Previous compilations" divider.
    expect(body.indexOf('Day 3')).toBeLessThan(body.indexOf('Previous compilations'));
    expect(body.endsWith('FOOTER')).toBe(true);
  });

  it('has no Previous divider when there is only one edition', () => {
    const body = buildHighlightsBody([mkEdition(1)], {}, 'H', 'F', 6);
    expect(body).not.toContain('Previous compilations');
  });

  it('caps the archive to maxEditions (oldest dropped)', () => {
    const editions = [5, 4, 3, 2, 1].map(mkEdition); // newest-first
    const body = buildHighlightsBody(editions, {}, 'H', 'F', 3);
    expect(body).toContain('Day 5');
    expect(body).toContain('Day 4');
    expect(body).toContain('Day 3');
    expect(body).not.toContain('Day 2');
    expect(body).not.toContain('Day 1');
  });

  it('renders clip metadata (title link, views, creator)', () => {
    const body = buildSingleClipsBody(
      [{ title: 'Epic play', url: 'https://clips.twitch.tv/x', views: 1234, creator: 'clipper' }],
      { monthLabel: 'August 2026' },
      'Top of {month}',
      'END'
    );
    expect(body).toContain('Top of August 2026');
    expect(body).toContain('**[Epic play](https://clips.twitch.tv/x)**');
    expect(body).toContain('1,234');
    expect(body).toContain('clipper');
    expect(body).toContain('END');
  });
});

describe('wiki archive mode', () => {
  const mkEdition = (n: number): HighlightsEdition => ({
    dateStr: `Day ${n}`,
    clips: [{ title: `Clip ${n}`, url: `https://clips.twitch.tv/${n}`, views: n, creator: `user${n}` }],
  });

  it('buildLatestClipsBody shows only the latest edition plus an archive link', () => {
    const body = buildLatestClipsBody(mkEdition(3), {}, 'HEADER', 'FOOTER', 'https://reddit.com/r/x/wiki/archive');
    expect(body).toContain('## 🎬 Day 3');
    expect(body).toContain('[Browse the full clip archive →](https://reddit.com/r/x/wiki/archive)');
    // Only the newest edition is inlined; older ones live on the wiki.
    expect(body).not.toContain('Day 2');
    expect(body).not.toContain('Previous compilations');
    expect(body).toContain('FOOTER');
  });

  it('buildWikiArchive lists every edition newest-first with the display name', () => {
    const page = buildWikiArchive([mkEdition(3), mkEdition(2), mkEdition(1)], 'CoolStreamer');
    expect(page).toContain('# 🎬 Clip Archive - CoolStreamer');
    expect(page).toContain('## Day 3');
    expect(page).toContain('## Day 2');
    expect(page).toContain('## Day 1');
    expect(page.indexOf('Day 3')).toBeLessThan(page.indexOf('Day 1'));
  });

  it('buildWikiArchive accepts a custom title/intro (monthly archive)', () => {
    const page = buildWikiArchive([mkEdition(1)], 'CoolStreamer', '🏆 Monthly Top 20 Archive', 'monthly intro');
    expect(page).toContain('# 🏆 Monthly Top 20 Archive - CoolStreamer');
    expect(page).toContain('monthly intro');
  });

  it('buildSingleClipsBody adds a monthly archive link only when a URL is given', () => {
    const clips = [{ title: 'c', url: 'https://clips.twitch.tv/c', views: 1, creator: 'u' }];
    const withLink = buildSingleClipsBody(clips, {}, 'H', 'F', 'https://reddit.com/r/x/wiki/m');
    expect(withLink).toContain('[Browse all monthly compilations →](https://reddit.com/r/x/wiki/m)');
    const noLink = buildSingleClipsBody(clips, {}, 'H', 'F');
    expect(noLink).not.toContain('Browse all monthly compilations');
  });
});
