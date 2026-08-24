
# Devvit Settings Constraints
- Settings grouping is now supported in Devvit.
- If you need to "remove" a setting or a huge block of text (like a `placeholderReference` paragraph) that was already pushed to users, changing its `defaultValue` in code is NOT enough. Devvit saves the old `defaultValue` to the user's database on install. You MUST delete the setting entirely from `devvit.json` to make it disappear from the user's screen.
- Devvit settings are now defined natively in `devvit.json` under `settings.subreddit`. Do not try to define them in `src/main.ts`.

# Publishing Constraints
- Never publish the app to Devvit without the `--public` flag. Always submit public releases so that visibility is never set to unlisted.

# Hover Effects Constraints
- Do NOT use colored box-shadow glows on hover for buttons, pills, or chips (no glow on hover). Keep hover transitions clean and sleek with background color shifts or subtle translateY transforms without colored drop-shadow glows.

# Reddit Wiki Slug Constraints
- NEVER alter or test changing canonical Reddit wiki page slug strings (e.g. changing `'livesticky'` to `'LiveSticky'`).
- Reddit Wiki API has no `DeleteWikiPage` method. Once a wiki page slug is created on Reddit, it is permanently recorded in the subreddit's database and cannot be deleted.
- Changing slug casing or names creates orphan pages that cannot be removed from Reddit's database index, creating clutter for moderators.

# Punctuation & Typography Constraints
- NEVER use em-dashes (`—`) or en-dashes (`–`) anywhere in copy, documentation, website HTML, commit messages, or READMEs. Always use standard hyphens (`-`), colons (`:`), or commas.



