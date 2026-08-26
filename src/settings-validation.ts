/**
 * Pure validation for the subreddit settings a moderator types by hand.
 *
 * Devvit's JSON manifest cannot carry validators, so a bad value used to be
 * discovered only by the feature quietly never happening. These checks run on
 * every status tick and are surfaced through ModMail.
 *
 * No Devvit imports here so the rules stay unit-testable.
 */

/**
 * Devvit returns `select` settings as an array (`['Europe/Berlin']`), and text
 * settings as a plain string. Read every setting through this so a select can
 * never reach string methods as an array - the bug that took the status check
 * down on every tick.
 */
export const settingText = (value: unknown): string => {
  if (value === undefined || value === null) return '';
  if (Array.isArray(value)) return settingText(value[0]);
  return String(value).trim();
};

/**
 * Values arrive straight from the settings API, so every field is typed
 * `unknown` deliberately: the declared type is a promise the runtime does not
 * keep, and this module must never be the thing that throws.
 */
export interface SettingValues {
  offlineGracePeriod?: unknown;
  monthlyHighlightsTime?: unknown;
  customAvatarUrl?: unknown;
  streamerTimezone?: unknown;
}

export interface SettingProblem {
  setting: string;
  problem: string;
  /** What LiveSticky does instead, so the ModMail can say so. */
  fallback: string;
}

/** The only host the image proxy will serve a custom avatar from. */
export const CUSTOM_AVATAR_HOST = 'i.redd.it';

export const validateSettings = (values: SettingValues): SettingProblem[] => {
  const problems: SettingProblem[] = [];

  const graceRaw = values.offlineGracePeriod;
  if (graceRaw !== undefined && graceRaw !== null && settingText(graceRaw) !== '') {
    const grace = Number(settingText(graceRaw));
    if (!Number.isFinite(grace) || grace < 0) {
      problems.push({
        setting: 'Offline Grace Period',
        problem: `"${settingText(graceRaw)}" is not a number of minutes at or above 0.`,
        fallback: 'using the 6-minute default',
      });
    } else if (grace > 180) {
      problems.push({
        setting: 'Offline Grace Period',
        problem: `${grace} minutes is unusually long, so the live thread will stay pinned for hours after the stream ends.`,
        fallback: 'using the value as entered',
      });
    }
  }

  const time = settingText(values.monthlyHighlightsTime);
  if (time && !/^([01]?\d|2[0-3]):[0-5]\d$/.test(time)) {
    problems.push({
      setting: 'Monthly Highlights Time',
      problem: `"${time}" is not a 24-hour HH:MM time.`,
      fallback: 'posting at 12:00',
    });
  }

  const avatar = settingText(values.customAvatarUrl);
  if (avatar) {
    let host = '';
    try {
      host = new URL(avatar).hostname;
    } catch {
      host = '';
    }
    if (!host) {
      problems.push({
        setting: 'Custom Avatar URL',
        problem: `"${avatar}" is not a full URL.`,
        fallback: 'using the channel avatar from your streaming platform',
      });
    } else if (host !== CUSTOM_AVATAR_HOST) {
      problems.push({
        setting: 'Custom Avatar URL',
        problem: `images can only be loaded from ${CUSTOM_AVATAR_HOST}, and this one points at ${host}. Upload the image to Reddit first, then paste that link.`,
        fallback: 'using the channel avatar from your streaming platform',
      });
    }
  }

  const tz = settingText(values.streamerTimezone);
  if (tz) {
    try {
      new Intl.DateTimeFormat('en-US', { timeZone: tz });
    } catch {
      problems.push({
        setting: 'Streamer Timezone',
        problem: `"${tz}" is not a recognised timezone.`,
        fallback: 'using UTC',
      });
    }
  }

  return problems;
};

/** Renders the problems as the body of a single ModMail message. */
export const formatSettingProblems = (problems: SettingProblem[]): string =>
  `Hello,\n\nLiveSticky found ${problems.length === 1 ? 'a setting that needs' : 'settings that need'} your attention:\n\n` +
  problems
    .map((p) => `* **${p.setting}**: ${p.problem} LiveSticky is ${p.fallback} until it is corrected.`)
    .join('\n') +
  `\n\nYou can fix ${problems.length === 1 ? 'it' : 'these'} in Subreddit Settings under LiveSticky.\n\n*(This alert is rate-limited to once every 24 hours.)*`;
