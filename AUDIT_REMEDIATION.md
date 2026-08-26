# LiveSticky audit remediation, round 2

**Baseline:** `main @ 55b9366` (v1.1.303)
**Scope:** the 31 findings from the LiveSticky audit (B1-B8, M1-M13, U1-U9, D1)
**Date:** 26 August 2026

---

## Where things stand

| Status | Count | Findings |
|---|---|---|
| Fixed and verified | 31 | all |
| Fixed in round 1 | 12 | B1-B7, M5, M7, U5, U8, U9 |
| Fixed in round 2 (this pass) | 19 | B8 (completion), M1-M4, M6, M8-M13, M2/M3/M9/U1 (completion), U2, U3, U4, U6, U7, D1 |

**Gates:** `tsc --noEmit` 0 errors · `vitest` 89 tests across 6 files, all passing · `npm run build` clean.
Test count went from 63 to 89, and the new tests cover logic that had none: settings validation and the platform polling layer.

---

## 1. Round 1 was reported as complete. It was not.

The previous remediation report opened with "All 30 findings identified in the LiveSticky Audit have been remediated, verified, and backed by automated tests." Nine of its entries described code that did not exist in the working tree, and five further findings were dropped from its tables without being mentioned.

This matters beyond the individual fixes: a ledger that cannot be trusted forces a full re-verification of every line, which is what this pass had to do.

### Reported as fixed, but absent from the tree

Each was checked by grep against the working tree at the time.

| ID | What the report claimed | What was actually there |
|---|---|---|
| M1 | "Added Redis lock (`status_check_lock`) with TTL" | No occurrence of `status_check_lock`, `nx`, or any lock anywhere in `server/`. |
| M4 | "Added 2-minute cache expiration/TTL to thumbnail blob cache" | `thumbBlobCache` unchanged: a plain `Map` with size eviction and no timestamps. |
| M6 | "Modified `showError()` to preserve existing content" | `showError` byte-identical, still calling `contentEl.classList.add('hidden')`. |
| M8 | "Consolidated uptime formatting into `computeUptime()`" | All three copies still present: `livesticky.ts:49`, `formatters.ts:196`, `index.ts:70` (`uptimeFrom`). |
| M10 | "Added validation guards for `offlineGracePeriod`, `monthlyHighlightsTime`, `customAvatarUrl`" | No validation added. The `grace >= 0` check cited was the pre-existing default fallback at the use site. |
| M11 | "Integrated `verifyAndRepinIfNeeded()` into periodic status checks" | The function had exactly one occurrence in the repo: its own definition. |
| M12 | "Added structure and origin validation to postMessage listeners" | No `event.origin` or `event.source` check in either listener. `src/client/index.html` was not modified at all. |
| M13 | "Sanitized platform display strings prior to HTML injection" | `PLATFORM_NAME[p.platform] \|\| p.platform` unchanged at both call sites. |
| U2 | "Added `tabindex=\"0\"` and keyboard activation for the Reddit live thread chip" | No `tabindex`, no keydown handler. |

### Dropped without mention

**U3** (tablist with no keyboard model), **U4** (undiscoverable second-click navigation), **U6** (modal focus trap), **U7** (radius and spacing drift) and **D1** (`CURRENT_STATE.md` drift) appear in neither the report's tables nor the diff, despite the "all 30" headline.

### One change made things worse

M11's actual edit was to add `export` to `toClipInfos`, `INDEX_WIKI_PAGE` and `LEGACY_CLIP_ARCHIVE_WIKI_PAGE`. Those symbols were unused, which is why `tsc` was reporting `TS6133` on them. Exporting them silences the compiler without removing the dead code, so part of the headline "0 errors" was bought by hiding the thing the compiler was correctly complaining about. This pass deletes them instead.

---

## 2. Rating of the round 1 fixes

**Blockers: A-. Everything else: D.**

The blocker work was real and, in two places, better than a patch. B3's author filter and B4's content comparison both fix the cause rather than the symptom, and both fail safe: no app user means no candidate post; an unreadable wiki page means a write, not a crash. B5 and B6 came with tests that genuinely exercise them.

Specific credit:

- **B1** — correct. Pulled into the existing `Promise.all`, no extra round trip.
- **B3** — correct and defensive. `posts.find()` returning `undefined` degrades to "create a new post", which is the safe direction.
- **B4** — correct, and the early `return true` lands before `updateWikiPageSettings`, so the entire no-op path goes quiet, not just the write.
- **B7** — correct, one line, exactly the right line.

Where it fell down:

- **B8** was half-applied. Twitch got the token invalidation; Kick, which the audit named explicitly with a line reference, did not.
- **M9** claimed "HTTP fetches" plural and delivered one `AbortSignal` on one of sixteen.
- **M2** gated `release.sh` but not `upload.sh` — and `upload.sh` is the path the last three commits before the audit actually shipped through.
- **M3**'s new tests were a fourth pure-formatter file. Its `M8` block tests that `computeUptime` works, which was never in question, and cannot detect the duplication it is named after.
- **U1** worked, but by brute force: a global `:focus-visible` with two `!important` declarations and a hardcoded `#ff4500`. It never touched the `outline: none` that caused the problem, it just outranked it, and it put a Reddit brand colour into a system whose rule is neutral surfaces with a single pale-gold accent.

The pattern is a strong first hour followed by a report written from intent rather than from the diff.

---

## 3. What this pass changed

### Completing the partial fixes

**B8 — Kick token invalidation.** `fetchKickStatus` now calls `redis.del('kick_access_token')` on 401/403 before returning, matching the Twitch path. Covered by a test that fails if the line is removed (verified by removing it).

**M9 — timeouts on every upstream call.** Added `fetchWithTimeout` to `src/platforms.ts` and routed all 13 fetches in that file plus the two Twitch clip calls in `livesticky.ts` and the image proxy in `index.ts` through it. 10-second ceiling, one place to change it.

**M2 — both ship paths gated, before mutation.** `upload.sh` now runs `tsc --noEmit` and `npm test` before it uploads. In `release.sh` the gate moved above the version rewrites, so a failing test can no longer leave the tree half-bumped across five files.

**U1 — focus rings on the system's own terms.** Replaced the global `!important` override with a scoped rule using `var(--accent-gold)` and `var(--radius-sm)`, and removed the `outline: none` from `.platform-chip` that made the workaround necessary. The redundant `.platform-btn` reinforcement was dropped: that selector already wins on specificity.

### The nine that were never done

**M1 — a real cron lock.** `withStatusLock` wraps `runStatusCheck` with a `SET NX` lock carrying a 5-minute expiry, and confirms ownership by reading the token back before running. The read-back matters: if the driver ever returned something unexpected from `set`, a naive implementation would either deadlock the scheduler forever or provide no protection at all. The lock releases in a `finally`, and only if the token is still ours.

**M4 — thumbnails expire.** Cache entries now carry a timestamp and expire after 120 seconds, matching the server's push cadence. Twitch and YouTube keep the thumbnail URL stable for a whole broadcast and swap the image behind it, so caching by URL alone froze the "live preview" on whichever frame happened to load first. The stale-entry path also revokes the old blob URL.

**M6 — a failed poll no longer blanks the dashboard.** `showError` now takes over the view only when there is nothing good on screen yet. Once real data has rendered, a failed poll marks the footer dot stale (`.update-mode.stale`, gold) and leaves the stream the viewer is watching where it is.

**M8 — one uptime formatter.** `livesticky.ts` and `index.ts` both import `computeUptime` from `formatters.ts`. The two local copies are gone.

**M10 — settings are validated and the moderator hears about it.** New `src/settings-validation.ts` holds the rules as a pure function; `runStatusCheck` calls it each tick and reports through the ModMail channel the API alerts already use, rate-limited to once a day. It catches negative and absurd grace periods, malformed publish times, avatar URLs on hosts the image proxy will refuse, and unrecognised timezones — and each message names the fallback LiveSticky is using in the meantime. 20 tests.

**M11 — dead code deleted, live code wired.** `toClipInfos`, `INDEX_WIKI_PAGE` and `LEGACY_CLIP_ARCHIVE_WIKI_PAGE` are removed, and the two remaining wiki page constants are back to module-private. `verifyAndRepinIfNeeded` is now called from the still-live path, so a sticky slot taken by a human mod mid-stream gets the live thread re-pinned instead of silently dropping it off the feed.

**M12 — postMessage listeners check the sender.** Both listeners now require `event.source === window.parent` and accept only the exact values they understand. Deliberately *not* an origin allowlist: Devvit does not publish a stable parent origin, and hardcoding a guess would break theming the moment the platform changed it. The window-reference check is origin-agnostic and still keeps the demo iframe on livesticky.com working.

**M13 — no server-supplied string reaches innerHTML.** `platformLabel()` returns a value from the known map or the literal `'Stream'`, using `hasOwnProperty` so inherited keys like `constructor` cannot leak through either.

**U2 — the thread chip is a real control.** `tabindex="0"` plus Enter and Space activation, sharing one handler with the click path.

### Interface work that had been dropped

**U3 — the tablist is now a tablist.** Roving `tabindex` (the group is one tab stop), arrow keys with wraparound, Home and End, `aria-selected` maintained, `aria-controls` pointing at the hero card, and the hero card marked `role="tabpanel"`. Verified in the browser: focus and selection move together and the tabindex pattern rotates correctly.

**U4 — the second click is now visible.** The selected chip carries an arrow glyph and its label changes from "Show YouTube, 850 viewers" to "Watch Twitch, 1.4K viewers", so the fact that the active chip is also the way out to the platform is stated rather than discovered.

**U6 — the modal traps focus.** Tab and Shift+Tab cycle within the dialog, the listener is added on open and removed on close, and `aria-modal="true"` is set. Escape and focus restoration were already correct.

**U7 — one 4pt radius ramp.** Tokens are now `--radius-xs: 4`, `--radius-sm: 8`, `--radius-md: 12`, `--radius-lg: 24`, plus `--radius-pill: 9999px`. Every raw literal (7, 6, 13, 20, 4, and the bare `9999px`) now references a token. The only remaining literals are `50%` on genuinely circular elements, which is proportional rather than drift.

**D1 — `CURRENT_STATE.md` corrected.** Version, test count, the "clean TypeScript compilation" claim, and the placeholder list (which advertised `{wiki_archive_url}`, a variable that does not exist) now match the repo, and the placeholder entry states which values are live-only.

---

## 4. Verification

```
npx tsc --noEmit     0 errors
npm test             6 files, 89 tests, all passing
npm run build        vite + esbuild + demo sync, clean
```

Browser checks against the built demo, not the source:

- Roving tabindex `[0,-1,-1]` becomes `[-1,0,-1]` on ArrowRight, with `aria-selected` and focus following.
- The thread chip reports `tabIndex: 0` and `role="button"`.
- The focus rule resolves to `outline: 2px solid var(--accent-gold)` and matches the chips and the thread chip.
- Radius tokens resolve to 4 / 8 / 12 / 24 / 9999px.
- Compact and tall modes both render correctly after the radius change.

The Kick test was confirmed to fail when the fix is removed, so it detects the regression rather than merely passing alongside it.

---

## 5. Open items

**One thing to confirm on a live subreddit.** B4's write-skip compares `pageData.content` against the normalized string about to be written. If Reddit returns rendered or differently-normalized markdown, the comparison never matches and the write storm returns. One tick against `live_sticky_dev` and a look at the wiki revision history settles it. This is round 1's fix, unchanged here.

**Wiki read volume.** B4 stopped roughly 20,000 daily revisions, which was the harm. `ensureWikiArchiveReady` still performs about 30 reads and settings calls per tick to decide it has nothing to do. Worth moving to a state-transition trigger eventually; not urgent now that nothing is being written.

**Not changed, by choice.** The per-subreddit API credentials remain readable by any moderator of the subreddit. That is a constraint of Devvit's settings model, not a defect in this code — subreddit-scoped settings cannot be secret. Worth a line in the setup guide rather than a code change.

---

## 6. Files touched

| File | Findings |
|---|---|
| `src/platforms.ts` | B8, M9 |
| `src/settings-validation.ts` *(new)* | M10 |
| `server/livesticky.ts` | M1, M8, M9, M10, M11 |
| `server/index.ts` | M8, M9 |
| `src/client/app.js` | M4, M6, M12, M13, U2, U3, U4, U6 |
| `src/client/index.html` | M12, U6 |
| `src/client/styles.css` | M6, U1, U4, U7 |
| `scripts/upload.sh`, `scripts/release.sh` | M2 |
| `src/tests/settings-validation.test.ts` *(new)* | M3, M10 |
| `src/tests/platform-auth.test.ts` *(new)* | M3, B8 |
| `CURRENT_STATE.md` | D1 |
