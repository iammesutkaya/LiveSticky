import { describe, it, expect } from 'vitest';
import { validateSettings, formatSettingProblems, settingText } from '../settings-validation.js';

const settingsWithProblems = (values: Parameters<typeof validateSettings>[0]) =>
  validateSettings(values).map((p) => p.setting);

describe('validateSettings', () => {
  it('accepts an empty configuration', () => {
    expect(validateSettings({})).toEqual([]);
  });

  it('accepts values a moderator would realistically enter', () => {
    expect(
      validateSettings({
        offlineGracePeriod: 6,
        monthlyHighlightsTime: '13:30',
        customAvatarUrl: 'https://i.redd.it/abc123.png',
        streamerTimezone: 'Europe/Berlin',
      })
    ).toEqual([]);
  });

  it('rejects a negative grace period', () => {
    expect(settingsWithProblems({ offlineGracePeriod: -5 })).toContain('Offline Grace Period');
  });

  it('allows a zero grace period, which means conclude immediately', () => {
    expect(validateSettings({ offlineGracePeriod: 0 })).toEqual([]);
  });

  it('warns when the grace period would pin a dead thread for hours', () => {
    expect(settingsWithProblems({ offlineGracePeriod: 600 })).toContain('Offline Grace Period');
  });

  it.each(['banana', '25:00', '13:60', '1330', '13.30'])(
    'rejects %s as a publish time',
    (time) => {
      expect(settingsWithProblems({ monthlyHighlightsTime: time })).toContain(
        'Monthly Highlights Time'
      );
    }
  );

  it.each(['00:00', '9:05', '09:05', '23:59'])('accepts %s as a publish time', (time) => {
    expect(validateSettings({ monthlyHighlightsTime: time })).toEqual([]);
  });

  it('rejects an avatar on a host the image proxy will refuse', () => {
    const problems = validateSettings({ customAvatarUrl: 'https://imgur.com/a.png' });
    expect(problems).toHaveLength(1);
    expect(problems[0]?.problem).toContain('i.redd.it');
  });

  it('rejects an avatar that is not a URL at all', () => {
    expect(settingsWithProblems({ customAvatarUrl: 'my-avatar.png' })).toContain(
      'Custom Avatar URL'
    );
  });

  it('rejects an unrecognised timezone', () => {
    expect(settingsWithProblems({ streamerTimezone: 'Middle/Earth' })).toContain(
      'Streamer Timezone'
    );
  });

  it('reports every problem at once rather than stopping at the first', () => {
    const problems = validateSettings({
      offlineGracePeriod: -1,
      monthlyHighlightsTime: 'noon',
      customAvatarUrl: 'ftp://example.com/a.png',
      streamerTimezone: 'Nowhere/Land',
    });
    expect(problems).toHaveLength(4);
  });
});

describe('select settings arrive as arrays', () => {
  // Regression: Devvit returns `select` settings as ['Europe/Berlin'], not a
  // string. Calling .trim() on that threw TypeError inside validateSettings,
  // which ran early in every status check and took the whole tick down with
  // it - the app reported every stream offline until this was fixed.
  it('does not throw when a select setting arrives as an array', () => {
    expect(() =>
      validateSettings({
        streamerTimezone: ['Europe/Berlin'],
        monthlyHighlightsTime: ['13:30'],
        offlineGracePeriod: ['6'],
        customAvatarUrl: ['https://i.redd.it/a.png'],
      })
    ).not.toThrow();
  });

  it('reads the value out of the array rather than rejecting it', () => {
    expect(validateSettings({ streamerTimezone: ['Europe/Berlin'] })).toEqual([]);
    expect(validateSettings({ monthlyHighlightsTime: ['13:30'] })).toEqual([]);
  });

  it('still catches a bad value inside an array', () => {
    const problems = validateSettings({ streamerTimezone: ['Middle/Earth'] });
    expect(problems.map((p) => p.setting)).toContain('Streamer Timezone');
  });

  it.each([
    [undefined, ''],
    [null, ''],
    [[], ''],
    [['  Europe/Berlin  '], 'Europe/Berlin'],
    ['  UTC ', 'UTC'],
    [42, '42'],
  ])('settingText(%p) is %p', (input, expected) => {
    expect(settingText(input)).toBe(expected);
  });

  it('never throws on any shape the settings API could return', () => {
    for (const value of [undefined, null, [], [null], {}, 0, false, ['x'], 'x']) {
      expect(() => validateSettings({ streamerTimezone: value })).not.toThrow();
      expect(() => validateSettings({ customAvatarUrl: value })).not.toThrow();
      expect(() => validateSettings({ offlineGracePeriod: value })).not.toThrow();
      expect(() => validateSettings({ monthlyHighlightsTime: value })).not.toThrow();
    }
  });
});

describe('formatSettingProblems', () => {
  it('names the setting, the problem, and the fallback', () => {
    const body = formatSettingProblems(validateSettings({ monthlyHighlightsTime: '99:99' }));
    expect(body).toContain('Monthly Highlights Time');
    expect(body).toContain('99:99');
    expect(body).toContain('posting at 12:00');
  });

  it('uses singular wording for one problem and plural for several', () => {
    const one = formatSettingProblems(validateSettings({ monthlyHighlightsTime: 'x' }));
    const many = formatSettingProblems(
      validateSettings({ monthlyHighlightsTime: 'x', streamerTimezone: 'y' })
    );
    expect(one).toContain('a setting that needs');
    expect(many).toContain('settings that need');
  });
});
