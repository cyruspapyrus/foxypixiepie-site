"""Draws shop/kiss.svg, a stand-in lipstick kiss for the shop.

Swap it for a photo of her real kiss when she sends one: cut it out onto a
transparent PNG, save it as shop/kiss.png, and change KISS_SRC in shop/shop.js.
"""
import random

random.seed(7)
W, H, CX = 240, 150, 120

upper = ("M18 76 C38 58 62 38 88 39 C100 40 109 48 120 51 C131 47 141 39 153 38 "
         "C179 37 203 57 222 75 C188 79 154 74 120 78 C86 74 52 80 18 76 Z")
lower = ("M24 79 C55 82 88 81 120 82.5 C152 81 186 82 216 79 C200 111 166 131 120 131 "
         "C74 131 40 111 24 79 Z")


def crease(x, y, h, lean, w):
    """One lip line: thin, slightly bent, sometimes broken."""
    bend = random.uniform(-1.6, 1.6)
    dash = ""
    if random.random() < .35:
        dash = f' stroke-dasharray="{random.uniform(4, 9):.1f} {random.uniform(1.5, 3):.1f}"'
    return (f'<path d="M{x:.1f} {y:.1f} Q{x + lean / 2 + bend:.1f} {y + h / 2:.1f} '
            f'{x + lean:.1f} {y + h:.1f}" stroke-width="{w:.2f}"{dash}/>')


creases = []
x = 30.0
while x < 212:
    d = (x - CX) / CX                      # -1 .. 1 across the mouth
    fade = 1 - 0.65 * d * d                # lines shorten toward the corners
    if random.random() < .85:              # upper lip: short lines rising from the parting
        creases.append(crease(x, 75, -random.uniform(5, 15) * fade, d * 6, random.uniform(.6, 1.3)))
    if random.random() < .9:               # lower lip: longer lines fanning down and out
        creases.append(crease(x + random.uniform(-2, 2), 83, random.uniform(10, 30) * fade,
                              d * 11, random.uniform(.7, 1.5)))
    x += random.uniform(6.5, 11)

lines = "\n        ".join(creases)
svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}">
  <!-- Stand-in lipstick kiss, drawn by scripts/make-kiss.py. Replace with a scan of her real one. -->
  <defs>
    <filter id="press" x="-10%" y="-10%" width="120%" height="120%">
      <feTurbulence type="fractalNoise" baseFrequency="0.32" numOctaves="2" seed="4" result="grain"/>
      <feColorMatrix in="grain" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.45 1.58" result="patchy"/>
      <feComposite in="SourceGraphic" in2="patchy" operator="in" result="inked"/>
      <feTurbulence type="fractalNoise" baseFrequency="0.06" numOctaves="2" seed="11" result="wobble"/>
      <feDisplacementMap in="inked" in2="wobble" scale="5" xChannelSelector="R" yChannelSelector="G"/>
    </filter>
    <mask id="lines">
      <rect width="{W}" height="{H}" fill="#fff"/>
      <g fill="none" stroke="#000" stroke-linecap="round" opacity=".85">
        {lines}
      </g>
      <path d="M28 78.5 C52 80 74 78.8 96 80 C108 80.8 114 79.6 120 80.4 C128 79.6 136 80.8 150 79.6 C172 78.8 194 80 212 78.5" fill="none" stroke="#000" stroke-width="1.5" stroke-linecap="round"/>
    </mask>
  </defs>
  <g filter="url(#press)" mask="url(#lines)" fill="#B3122B">
    <path d="{upper}" opacity=".93"/>
    <path d="{lower}" opacity=".96"/>
  </g>
</svg>
'''
open("shop/kiss.svg", "w").write(svg)
print("wrote shop/kiss.svg", len(svg), "bytes")
