// Ember: a dark warm room lit from its corners. Four soft glows breathe at
// slow, unequal paces, and a handful of embers lift off from the bottom
// corners, drift sideways, and fade out well before the top.

import { bleed, doc, n, rng } from '../kit.ts'
import type { ThemeDef } from '../kit.ts'

/** A corner glow: strongest at the corner (cx, cy are 0 or 1), clear by `reach`. */
function corner(id: string, cx: number, cy: number, reach: number, color: string, strength: number): string {
  return (
    `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${reach}">` +
    `<stop offset="0%" stop-color="${color}" stop-opacity="${n(strength)}"/>` +
    `<stop offset="45%" stop-color="${color}" stop-opacity="${n(strength * 0.35)}"/>` +
    `<stop offset="100%" stop-color="${color}" stop-opacity="0"/></radialGradient>`
  )
}

function lerp(a: number, b: number, t: number): number {
  return Math.round(a + (b - a) * t)
}

/** Orange (#ff8a3d) to yellow (#ffc46b). */
function heat(t: number): string {
  const hex = (v: number): string => v.toString(16).padStart(2, '0')

  return `#${hex(lerp(0xff, 0xff, t))}${hex(lerp(0x8a, 0xc4, t))}${hex(lerp(0x3d, 0x6b, t))}`
}

/** Embers that start low in the bottom corners and rise on their own clocks. */
function embers(): string {
  const r = rng(41)
  let out = ''

  for (let i = 0; i < 16; i += 1) {
    const left = i < 9
    const x = left ? 40 + r() * 340 : 1220 + r() * 340
    const y = 960 + r() * 70
    const radius = 2 + r() * 2
    const color = heat(r())
    const drift = (20 + r() * 90) * (left ? 1 : -1)
    const rise = 650 + r() * 250
    const duration = 15 + r() * 12
    const delay = -r() * duration

    out +=
      `<g class="e" style="--dx:${n(drift)}px;--dy:${n(-rise)}px;animation-duration:${n(duration)}s;animation-delay:${n(delay)}s">` +
      `<circle cx="${n(x)}" cy="${n(y)}" r="${n(radius * 3)}" fill="${color}" fill-opacity=".2"/>` +
      `<circle cx="${n(x)}" cy="${n(y)}" r="${n(radius)}" fill="${color}"/></g>`
  }

  return out
}

const MOTION = `
.g{animation:breathe 10s ease-in-out infinite alternate}
.g1{animation-duration:9s}
.g2{animation-duration:13s;animation-delay:-5s}
.g3{animation-duration:15s;animation-delay:-8s}
.g4{animation-duration:11s;animation-delay:-3s}
@keyframes breathe{from{opacity:.72}to{opacity:1}}
.e{animation:rise 20s cubic-bezier(.3,.1,.6,1) infinite;opacity:0}
@keyframes rise{0%{transform:translate(0,0);opacity:0}10%{opacity:1}65%{opacity:.7}100%{transform:translate(var(--dx),var(--dy));opacity:0}}
`

function art(): string {
  const defs =
    corner('gbl', 0, 1, 0.85, '#c4471b', 0.85) +
    corner('gtr', 1, 0, 0.8, '#a8561e', 0.6) +
    corner('gtl', 0, 0, 0.55, '#7a3a18', 0.3) +
    corner('gbr', 1, 1, 0.55, '#8a3a14', 0.34)
  const glows =
    `<rect class="g g3" width="100%" height="100%" fill="url(#gtl)"/>` +
    `<rect class="g g4" width="100%" height="100%" fill="url(#gbr)"/>` +
    `<rect class="g g2" width="100%" height="100%" fill="url(#gtr)"/>` +
    `<rect class="g g1" width="100%" height="100%" fill="url(#gbl)"/>`

  return doc({ style: MOTION, defs, ground: '#170e0b', layers: [glows, bleed(embers())] })
}

export const ember: ThemeDef = {
  id: 'ember',
  title: 'Ember',
  mode: 'dark',
  blurb: 'A warm glow in the corners and a few embers rising.',
  alt: 'A very dark warm brown scene lit by orange-red and amber glows in the corners, with a few small embers drifting slowly upward and fading out.',
  palette: {
    surface0: '#170e0b',
    surface1: '#1d130f',
    surface2: '#231813',
    surface3: '#281c16',
    textPrimary: '#f3e6d8',
    textSecondary: '#d6c3b0',
    textMuted: '#b09a86',
    accent: '#ff8a3d',
    danger: '#ff6b5a',
    success: '#7bc47f',
    warning: '#f0b042',
    pro: '#e8a35c',
  },
  glass: { blur: 8, tint: '#170e0b', opacity: 0.5 },
  art,
}
