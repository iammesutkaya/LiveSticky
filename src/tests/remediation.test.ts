import { describe, it, expect } from 'vitest';
import {
  replaceTemplateVariables,
  renderClipList,
  renderClipListHtml,
  computeUptime,
  ClipInfo,
  TemplateVariables,
} from '../formatters.js';

describe('Audit Remediation Tests', () => {
  describe('B5: Offline Template Placeholder Replacement', () => {
    it('substitutes all stream variables when offline (isLive = false) without leaving raw placeholders', () => {
      const vars: TemplateVariables = {
        streamHandle: 'teststreamer',
        streamDisplayName: 'Test Streamer',
        streamTitle: 'Awesome Gaming Session',
      };
      const template = 'Last game: {stream_game} | Viewers: {stream_viewers} | Uptime: {stream_uptime} | Title: {stream_title}';
      const result = replaceTemplateVariables(template, vars, false);

      expect(result).not.toContain('{stream_game}');
      expect(result).not.toContain('{stream_viewers}');
      expect(result).not.toContain('{stream_uptime}');
      expect(result).toContain('Title: Awesome Gaming Session');
    });
  });

  describe('B6: Clip Title Escaping (Markdown & HTML Injection Protection)', () => {
    it('escapes Markdown brackets in renderClipList', () => {
      const clips: ClipInfo[] = [
        {
          title: 'lol](https://evil.example) pwn',
          url: 'https://clips.twitch.tv/test',
          views: 1337,
          creator: 'Attacker[hacker]',
        },
      ];
      const markdown = renderClipList(clips);

      expect(markdown).toContain('[lol\\](https://evil.example) pwn');
      expect(markdown).toContain('Attacker\\[hacker\\]');
      expect(markdown).not.toContain('**[lol](https://evil.example)');
    });

    it('escapes HTML entities in renderClipListHtml', () => {
      const clips: ClipInfo[] = [
        {
          title: '<script>alert("xss")</script>',
          url: 'https://clips.twitch.tv/test?a=1&b=2',
          views: 500,
          creator: 'User & Co',
        },
      ];
      const html = renderClipListHtml(clips);

      expect(html).toContain('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
      expect(html).toContain('User &amp; Co');
      expect(html).toContain('a=1&amp;b=2');
      expect(html).not.toContain('<script>');
    });
  });

  describe('M8: Uptime Computation Consistency', () => {
    it('computes human readable uptime correctly', () => {
      const now = new Date();
      const twoHoursAgo = new Date(now.getTime() - (2 * 60 * 60 * 1000 + 15 * 60 * 1000)).toISOString();
      expect(computeUptime(twoHoursAgo)).toBe('2h 15m');
      expect(computeUptime(undefined)).toBe('');
      expect(computeUptime('invalid-date')).toBe('');
    });
  });
});
