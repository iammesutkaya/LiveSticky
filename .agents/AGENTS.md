
# Devvit Settings Constraints
- When adding settings via `Devvit.addSettings()`, the array of fields **must be strictly flat**.
- Do NOT use `type: "group"` for settings fields. Devvit web versions do not render nested groups properly and the settings menu will appear completely empty.
- To "group" fields visually or conceptually, simply order them sequentially in the flat array. Do not use nesting.
