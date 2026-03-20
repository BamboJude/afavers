#!/usr/bin/env python3
"""Generate afavers extension icons at 16, 32, 48, 128px.

Design: dark green rounded square background, white stylised "A" letter
with the crossbar as a small upward arrow (representing job hunting / growth),
and the right leg tipped in orange to echo the brand's orange "v".
"""
import math, os
from PIL import Image, ImageDraw, ImageFont

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "extension", "icons")

GREEN  = (22, 163, 74)    # #16a34a
ORANGE = (249, 115, 22)   # #f97316
WHITE  = (255, 255, 255)
TRANSP = (0, 0, 0, 0)

def rounded_rect(draw, xy, radius, fill):
    x0, y0, x1, y1 = xy
    draw.rounded_rectangle([x0, y0, x1, y1], radius=radius, fill=fill)

def draw_icon(size):
    img = Image.new("RGBA", (size, size), TRANSP)
    d   = ImageDraw.Draw(img)

    pad = max(1, size // 16)
    r   = size * 0.22  # corner radius

    # Background rounded square
    rounded_rect(d, [pad, pad, size - pad, size - pad], radius=r, fill=GREEN)

    # Draw a stylised "A" shape manually using polygons
    # Proportions relative to canvas
    cx   = size / 2
    top  = size * 0.15
    bot  = size * 0.82
    lx   = size * 0.18   # left foot x
    rx   = size * 0.82   # right foot x
    bar  = size * 0.55   # crossbar y
    sw   = max(2, size * 0.12)  # stroke width
    half = sw / 2

    # Left leg: line from (cx, top) → (lx, bot)
    d.line([(cx, top), (lx, bot)], fill=WHITE, width=round(sw))

    # Right leg: WHITE upper half, ORANGE lower half
    mid_y = (top + bot) / 2 + size * 0.05
    d.line([(cx, top), (rx, mid_y)], fill=WHITE,  width=round(sw))
    d.line([(cx + (rx - cx) * 0.55, top + (bot - top) * 0.55), (rx, bot)],
           fill=ORANGE, width=round(sw))

    # Crossbar
    bar_lx = lx + (cx - lx) * ((bar - bot) / (top - bot))
    bar_rx = rx - (rx - cx) * ((bot - bar) / (bot - top))
    d.line([(bar_lx, bar), (bar_rx, bar)], fill=WHITE, width=round(sw * 0.75))

    # Small upward arrow on top of the A peak
    arrow_h = size * 0.10
    arrow_w = size * 0.09
    tip_y   = top - size * 0.02
    d.polygon([
        (cx, tip_y - arrow_h),
        (cx - arrow_w, tip_y),
        (cx + arrow_w, tip_y),
    ], fill=ORANGE)

    return img

for size in [16, 32, 48, 128]:
    icon = draw_icon(size)
    path = os.path.join(OUTPUT_DIR, f"icon{size}.png")
    icon.save(path, "PNG")
    print(f"Saved {path}")

print("Done!")
