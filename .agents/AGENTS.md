
# Devvit Settings Constraints
- When adding settings via `Devvit.addSettings()`, the array of fields **must be strictly flat**.
- Do NOT use `type: "group"` for settings fields. Devvit web versions do not render nested groups properly and the settings menu will appear completely empty.
- To "group" fields visually or conceptually, simply order them sequentially in the flat array. Do not use nesting.

- Do NOT attempt to create fake/dummy visual dividers using `type: "paragraph"` or similar fields. These render as empty input boxes on the website and ruin the UI. Just list the settings sequentially in a flat structure.
- If you need to "remove" a setting or a huge block of text (like a `placeholderReference` paragraph) that was already pushed to users, changing its `defaultValue` in code is NOT enough. Devvit saves the old `defaultValue` to the user's database on install. You MUST delete the setting entirely from `devvit.json` to make it disappear from the user's screen.
- Devvit settings are now defined natively in `devvit.json` under `settings.subreddit`. Do not try to define them in `src/main.ts`.

# Publishing Constraints
- Never publish the app to Devvit without the `--public` flag. Always submit public releases so that visibility is never set to unlisted.

# Hover Effects Constraints
- Do NOT use colored box-shadow glows on hover for buttons, pills, or chips (no glow on hover). Keep hover transitions clean and sleek with background color shifts or subtle translateY transforms without colored drop-shadow glows.

