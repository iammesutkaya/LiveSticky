/**
 * TEMPORARY playtest-only experiment. Not for commit, not for publish.
 *
 * Answers two questions on r/live_sticky_dev:
 *   1. Does the Devvit runtime route AddPostToHighlights for apps at all?
 *   2. What actually happens to the live post when both legacy sticky slots
 *      are already occupied?
 *
 * Fills slots 1 and 2 with its own filler posts, then reports the raw outcome
 * of the Community Highlights calls. Idempotent: filler post ids are cached in
 * Redis so it does not spam the subreddit on every 2-minute tick.
 */
import { reddit, redis } from '@devvit/web/server';
import { getDevvitConfig } from '@devvit/shared-types/server/get-devvit-config.js';
import {
  LinksAndCommentsDefinition,
  type LinksAndComments,
} from '@devvit/protos/types/devvit/plugin/redditapi/linksandcomments/linksandcomments_svc.js';
import { HighlightedPostLabel } from '@devvit/protos/types/devvit/plugin/redditapi/common/common_msg.js';

const DEV_SUBREDDIT = 'live_sticky_dev';

const describe = (err: unknown): string => {
  const e = err as { code?: unknown; message?: unknown; details?: unknown };
  return JSON.stringify({
    code: e?.code ?? null,
    message: String(e?.message ?? err),
    details: e?.details ?? null,
  });
};

/** Create a filler post and claim a legacy sticky slot, once. */
const ensureFiller = async (subredditName: string, key: string, slot: 1 | 2): Promise<void> => {
  const cached = await redis.get(key);
  if (cached) {
    try {
      const existing = await reddit.getPostById(cached as `t3_${string}`);
      if (existing.stickied) {
        console.log(`[probe] slot ${slot} already held by ${cached}`);
        return;
      }
      await existing.sticky(slot);
      console.log(`[probe] re-stickied ${cached} into slot ${slot}`);
      return;
    } catch (err) {
      console.warn(`[probe] cached filler ${cached} unusable, recreating:`, describe(err));
    }
  }

  const post = await reddit.submitPost({
    title: `[probe] sticky slot ${slot} filler`,
    subredditName,
    text: 'Temporary post created by a LiveSticky playtest experiment. Safe to delete.',
  });
  await redis.set(key, post.id);
  try {
    await post.sticky(slot);
    console.log(`[probe] created ${post.id} and claimed slot ${slot}`);
  } catch (err) {
    console.error(`[probe] could not claim slot ${slot} with ${post.id}:`, describe(err));
  }
};

export const runHighlightsProbe = async (subredditName: string): Promise<void> => {
  if (subredditName.toLowerCase() !== DEV_SUBREDDIT) {
    console.warn(`[probe] refusing to run outside r/${DEV_SUBREDDIT} (got r/${subredditName})`);
    return;
  }
  if (await redis.get('probe_done')) return;

  console.log('[probe] ---- filling both legacy sticky slots ----');
  await ensureFiller(subredditName, 'probe_filler_1', 1);
  await ensureFiller(subredditName, 'probe_filler_2', 2);

  console.log('[probe] ---- testing Community Highlights ----');
  const linksAndComments = getDevvitConfig().use<LinksAndComments>(LinksAndCommentsDefinition);

  const target = await reddit.submitPost({
    title: '[probe] community highlights target',
    subredditName,
    text: 'Temporary post created by a LiveSticky playtest experiment. Safe to delete.',
  });
  console.log(`[probe] target post: ${target.id}`);

  // Read first: cheapest signal for whether the service is routed at all.
  try {
    const read = await linksAndComments.GetIsPostHighlighted({ postId: target.id });
    console.log(`[probe] GetIsPostHighlighted OK -> ${JSON.stringify(read)}`);
  } catch (err) {
    console.error(`[probe] GetIsPostHighlighted THREW -> ${describe(err)}`);
  }

  try {
    const added = await linksAndComments.AddPostToHighlights({
      postId: target.id,
      label: HighlightedPostLabel.ANNOUNCEMENT,
    });
    console.log(`[probe] AddPostToHighlights OK -> ${JSON.stringify(added)}`);
  } catch (err) {
    console.error(`[probe] AddPostToHighlights THREW -> ${describe(err)}`);
  }

  try {
    const verify = await linksAndComments.GetIsPostHighlighted({ postId: target.id });
    console.log(`[probe] verify after add -> ${JSON.stringify(verify)}`);
  } catch (err) {
    console.error(`[probe] verify THREW -> ${describe(err)}`);
  }

  await redis.set('probe_done', 'true');
  console.log('[probe] ---- done, will not repeat ----');
};
