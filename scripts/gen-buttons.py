#!/usr/bin/env python3
"""Regenerate the README button/pill SVGs from the site's design tokens.

Text is converted to outlines using the same Inter the website ships, so the
buttons render identically on GitHub and Devvit (no webfont, no fallback) and
the pill widths are exact rather than estimated.

Needs fonttools + brotli:
    python3 -m venv /tmp/.fontenv && /tmp/.fontenv/bin/pip install fonttools brotli
    /tmp/.fontenv/bin/python scripts/gen-buttons.py
"""
import re
from pathlib import Path

from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

ROOT = Path(__file__).resolve().parent.parent
FONT = ROOT / "docs/fonts/inter-latin.woff2"
OUT = ROOT / "assets/ui"

# tokens from docs/style.css + docs/landing.css (.install-btn / .secondary-btn)
GOLD, INK, SURFACE, WHITE = "#f5d474", "#111111", "#1c2125", "#ffffff"
BORDER = "rgba(255,255,255,0.06)"
SIZE, TRACK = 16, 0.16          # 1rem, letter-spacing .01em
PAD, GAP, ICON, H = 28, 8, 18, 46

# icon paths lifted verbatim from docs/index.html
EXTERNAL = ("M14,3V5H17.59L7.76,14.83L9.17,16.24L19,6.41V10H21V3M19,19H5V5H12V3H5C3.89,3 3,3.9 3,5"
            "V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V12H19V19Z")
ARROW = "M4 11v2h12l-5.5 5.5 1.42 1.42L19.84 12l-7.92-7.92L10.5 5.5 16 11H4z"


def load(weight):
    font = instancer.instantiateVariableFont(TTFont(FONT), {"wght": weight})
    return font, font.getGlyphSet(), font.getBestCmap(), font["head"].unitsPerEm


def outline(text, size, weight=700):
    """Return (path_data, width_px, cap_height_px) with text baked to outlines."""
    font, glyphs, cmap, upem = load(weight)
    scale = size / upem
    cap = font["OS/2"].sCapHeight * scale
    hmtx, cursor, parts = font["hmtx"], 0.0, []
    for ch in text:
        name = cmap.get(ord(ch))
        if name is None:
            continue
        pen = SVGPathPen(glyphs)
        # flip Y (font up, SVG down) and place at the running x offset
        glyphs[name].draw(TransformPen(pen, (scale, 0, 0, -scale, cursor, 0)))
        if d := pen.getCommands():
            parts.append(d)
        cursor += hmtx[name][0] * scale + TRACK
    return " ".join(parts), cursor - TRACK, cap


def button(name, label, icon, bg, fg, border=None):
    d, tw, cap = outline(label, SIZE)
    w = round(PAD * 2 + tw + GAP + ICON)
    stroke = f' stroke="{border}" stroke-width="1"' if border else ""
    baseline = H / 2 + cap / 2
    svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{H}" '
        f'viewBox="0 0 {w} {H}" role="img" aria-label="{label}">'
        f'<rect x="0.5" y="0.5" width="{w - 1}" height="{H - 1}" rx="{H / 2}" fill="{bg}"{stroke}/>'
        f'<g transform="translate({PAD},{baseline:.2f})"><path d="{d}" fill="{fg}"/></g>'
        f'<g transform="translate({PAD + tw + GAP:.2f},{(H - ICON) / 2}) scale({ICON / 24:.4f})">'
        f'<path d="{icon}" fill="{fg}"/></g></svg>'
    )
    (OUT / f"btn-{name}.svg").write_text(svg)
    print(f"btn-{name}.svg  {w}x{H}  text={tw:.1f}px")


def chip(name, label, bg, fg=WHITE, size=16, pad=12, radius=8, box=30):
    """Brand chip in the site's .inline-brand colours, for the platform row.

    Kept on its own line rather than inline in a sentence: an inline image
    aligns its bottom edge to the text baseline, which leaves the labels
    riding high, and swapping words for images loses the punctuation.
    """
    d, tw, cap = outline(label, size, weight=600)
    w = round(pad * 2 + tw)
    svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{box}" '
        f'viewBox="0 0 {w} {box}" role="img" aria-label="{label}">'
        f'<rect width="{w}" height="{box}" rx="{radius}" fill="{bg}"/>'
        f'<g transform="translate({pad},{box / 2 + cap / 2:.2f})">'
        f'<path d="{d}" fill="{fg}"/></g></svg>'
    )
    (OUT / f"tag-{name}.svg").write_text(svg)
    print(f"tag-{name}.svg  {w}x{box}  text={tw:.1f}px")


def pill(name, label, color, h=34, pad=14, gap=7, icon=15, size=13):
    src = (ROOT / f"assets/platform-svgs/{name}.svg").read_text()
    vb = [float(v) for v in re.search(r'viewBox="([^"]+)"', src).group(1).split()]
    paths = re.findall(r'<path[^>]*d="([^"]+)"', src)
    d, tw, cap = outline(label, size, weight=600)
    w = round(pad * 2 + icon + gap + tw)
    s = icon / max(vb[2], vb[3])
    glyph = "".join(f'<path d="{p}" fill="{color}"/>' for p in paths)
    svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" '
        f'viewBox="0 0 {w} {h}" role="img" aria-label="{label}">'
        f'<rect x="0.5" y="0.5" width="{w - 1}" height="{h - 1}" rx="{h / 2}" fill="{SURFACE}" '
        f'stroke="{BORDER}" stroke-width="1"/>'
        f'<g transform="translate({pad},{(h - vb[3] * s) / 2:.2f}) scale({s:.4f})">{glyph}</g>'
        f'<g transform="translate({pad + icon + gap},{h / 2 + cap / 2:.2f})">'
        f'<path d="{d}" fill="{WHITE}"/></g></svg>'
    )
    (OUT / f"pill-{name}.svg").write_text(svg)
    print(f"pill-{name}.svg  {w}x{h}  text={tw:.1f}px")


if __name__ == "__main__":
    button("install-reddit", "Install on Reddit", EXTERNAL, GOLD, INK)
    button("setup", "Setup Guide", ARROW, SURFACE, WHITE, border=BORDER)
    chip("twitch", "Twitch", "#9147ff")
    chip("youtube", "YouTube", "#ff0000")
    chip("kick", "Kick", "#53fc18", fg=INK)
