# LiveSticky Design System

One visual language across the Reddit dashboard and the website. The chrome
stays neutral and understated so the **streamer's own assets** — avatar,
thumbnails, and platform brand colors — are what the eye lands on.

> Source of truth. The dashboard implements these tokens in
> [`src/client/styles.css`](src/client/styles.css). The website should reuse the
> same values verbatim.

---

## Principles

1. **Neutral ground.** Surfaces are pure dark/light grays with no color tint, so
   any streamer's brand sits on truly neutral ground.
2. **One accent.** Pale gold `#f5d474` is the only accent. It signals "active"
   and highlights key numbers — nothing else competes with it.
3. **Brand colors stay contained.** Twitch / YouTube / Kick colors appear only
   inside small badges and logos, never in layout chrome.
4. **Flat, not glossy.** No shadows, gradients, or glows. Hierarchy comes from
   stepping surface lightness, not elevation effects.
5. **Gold means active.** Live → gold accents; offline → everything goes muted.

---

## Tokens

### Color

| Token | Dark | Light | Use |
| --- | --- | --- | --- |
| `--bg-primary` | `#0e1113` | `#ffffff` | Page; the deep ground inside viewer chips |
| `--bg-card` | `#15191c` | `#f6f6f7` | Stream cards, Reddit row, offline card |
| `--bg-surface` | `#1c2125` | `#eaeaec` | Thumbnails, watch bar, muted avatar, chips |
| `--bg-card-hover` | `#191e21` | `#efeff0` | Hover state of cards/buttons |
| `--text-primary` | `#ffffff` | `#1a1a1b` | Titles, names |
| `--text-secondary` | `#a0a0a5` | `#545456` | Supporting copy |
| `--text-muted` | `#707075` | `#76767a` | Meta, labels, footer |
| `--text-faint` | `#444448` | `#9a9aa0` | Separators, the "viewers" label |
| `--accent-gold` | `#f5d474` | `#f5d474` | Fill (avatar, Reddit badge, LIVE pill) — dark content on top |
| `--gold-text` | `#f5d474` | `#8a6a12` | Gold as **text** on a surface (viewer counts, last-live) |
| `--twitch-color` | `#9147ff` | `#9147ff` | Badge/logo only |
| `--youtube-color` | `#ff0000` | `#ff0000` | Badge/logo only |
| `--kick-color` | `#53fc18` | `#53fc18` | Badge/logo only — uses dark `#131313` content on top |
| live dot | `#ef4444` | `#ef4444` | The pulsing dot in the LIVE pill |
| health dot | `#3fb950` | `#3fb950` | Footer "up to date" indicator |

`--accent-gold` is a **fill** (dark text/icon sits on it); `--gold-text` is the
readable-on-surface variant — in light mode it darkens so gold numbers stay
legible. Never put `--gold-text` directly on `--accent-gold`.

### Type scale

Font: Inter, system-ui fallback. Two weights carry everything: 600 (bold) and
700 (display). Nothing below 11px.

| Role | Size / weight |
| --- | --- |
| Display name | 17 / 700 |
| Section · cinematic card title | 13 / 600 |
| Card title · body | 12 / 600 |
| Meta · labels · footer · pill text | 11 / 500–800 |

### Radius

| Token | Value | Use |
| --- | --- | --- |
| `--radius-sm` | 8px | Chips, status pill |
| thumbnail | 7px | Stream thumbnails |
| `--radius-md` | 14px | Cards, buttons |
| `--radius-lg` | 20px | Outer cards, bento widgets |
| `--radius-xl` | 28px | Hero containers, main dashboard |
| corner badge | `0 0 8px 0` | Platform badge, flush to the thumbnail's top-left corner |
| full | 9999px | Avatar, Reddit badge, active buttons |

### Spacing

Rhythm: **8 · 10 · 12 · 14 · 16**. Card padding 12px; header/offline padding
14–16px; gaps between cards 10px.

---

## Components

- **Avatar** — 44px circle. Gold fill + dark initial when live; `--bg-surface`
  and muted initial when offline. A real profile image covers the fill in both.
- **Status pill** — `live`: `--gold-dim` bg, `--gold-border`, `--gold-text`,
  red pulsing dot. `offline`: `--bg-surface` bg, muted text + dot.
- **Stream card** — `--bg-card`, radius 10. Multistream = compact row
  (112×63 thumb + info). Single = `cinematic` (full-width 16:9 thumb on top).
- **Platform badge** — brand-color corner badge, `border-radius: 0 0 8px 0`,
  flush to the thumbnail's top-left, logo only.
- **Viewer chip** — `--bg-primary` ground, `--gold-text` count + `--text-faint`
  "viewers" label.
- **Meta row** — viewer chip, then per-platform category and uptime in muted
  text separated by a faint `·`.
- **Watch / follow button** — `--bg-surface` (live, as a card's bottom bar) or
  `--bg-card` (offline, standalone). Brand-colored logo + label. No border.
- **Reddit thread row** — `--bg-card` + `--border-line`, gold circular badge
  with the Snoo, title + `comments · upvotes` meta, chevron.
- **Footer** — health dot + "LiveSticky" left; timestamp + Refresh button right.

---

## Iconography

The product UI (dashboard + website) uses **[Lucide](https://lucide.dev)** —
outline icons with a consistent ~1.75px stroke that share the dashboard's own
SVG language (moon, chevrons, refresh). Emoji are reserved for the README only.

- Icons sit in `--text-secondary` and ease to `--accent-gold` with a slight lift
  on hover — the one moment of motion in an otherwise flat system.
- Platform marks (Twitch, YouTube, Kick, Reddit) keep their **official brand
  SVGs**, since Lucide has no brand logos.
- On the static website, Lucide loads via CDN (`unpkg.com/lucide`) and renders
  `<i data-lucide="name">` placeholders with `lucide.createIcons()`.

---

## States

Every state is built from the tokens and components above.

| State | Header | Body |
| --- | --- | --- |
| **Loading** | — | Gold pulse + "Connecting…" |
| **Error** | — | Gold pulse + message + "Retrying…" hint |
| **Live (single)** | Avatar gold · name · "Live on `<platform>`" · LIVE pill | One cinematic card + Reddit row |
| **Live (multi)** | Avatar gold · name · "Live on N platforms" · LIVE pill | One card per platform + Reddit row |
| **Offline** | Avatar muted · name · "Last live Xh ago" · OFFLINE pill | Moon icon + "`<name>` is offline" + follow buttons |

The offline state mirrors the live state's structure: the header subtitle slot
shows "Last live Xh ago" where live shows "Live on N platforms", and the follow
buttons use the same treatment as the live "Watch on" buttons.

---

## Applying to the website

The website uses the **same** token values, type scale, and component patterns:
page `#131313`, cards `#1e1e1e`, accent `#f5d474`, brand colors only in badges.
A live-status embed on the site is the same stream-card component; section
headers use the display/section type sizes; CTAs reuse the watch-button style.
One language, two surfaces.
