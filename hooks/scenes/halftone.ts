// Halftone Dawn (light) and Halftone Dusk (dark): a two-ink risograph
// sunrise. The sun is a ring of orange halftone dots that breathes and sends
// soft rings outward. Blue-gray halftone hills sit low in the corners.

import { beads, bleed, doc, pin, screen, vgrad } from '../kit.ts'
import type { ThemeDef } from '../kit.ts'

type Inks = { paperTop: string; paperBottom: string; sun: string; hills: string; blend: string }

const SUN = { x: 1350, y: 520 }

/** The sun: dots largest on a ring, a lighter core, and a faint glow around it. */
function sunDots(color: string): string {
  const points = screen({ x0: SUN.x - 300, y0: SUN.y - 300, x1: SUN.x + 300, y1: SUN.y + 300 }, 13, 15).map(p => {
    const d = Math.hypot(p.x - SUN.x, p.y - SUN.y)
    const ring = Math.exp(-(((d - 108) / 40) ** 2))
    const core = d < 108 ? 0.22 * (1 - d / 108) + 0.18 : 0
    const halo = 0.32 * Math.exp(-((d / 250) ** 2))
    const value = Math.min(1, ring + core + halo)

    return { ...p, r: value < 0.07 ? 0 : 6.2 * Math.sqrt(value) }
  })

  return beads(points, color, 10)
}

/** One ring of small dots that the CSS sends outward and fades. */
function wave(color: string, delay: number): string {
  const points = []

  for (let a = 0; a < 360; a += 7) {
    const t = (a * Math.PI) / 180
    points.push({ x: SUN.x + 160 * Math.cos(t), y: SUN.y + 160 * Math.sin(t), r: 2.4 })
  }

  return beads(points, color, 1, `class="wave" style="animation-delay:${delay}s"`)
}

/** A hill of dots, darker toward its foot. `top(x)` is the skyline. */
function hill(color: string, box: { x0: number; x1: number; y1: number }, top: (x: number) => number, angle: number, depth: number): string {
  const points = screen({ x0: box.x0, y0: 560, x1: box.x1, y1: box.y1 }, 12, angle).map(p => {
    const below = p.y - top(p.x)

    if (below < 0) return { ...p, r: 0 }
    // Taper the inner side of each hill, so it fades out instead of ending in a straight edge.
    const fromLeft = box.x0 <= 0 ? 1 : (p.x - box.x0) / 220
    const fromRight = box.x1 >= 1600 ? 1 : (box.x1 - p.x) / 220
    const taper = Math.max(0, Math.min(1, fromLeft, fromRight))
    // Squared, because the dot radius takes a square root: this keeps the fade even.
    const value = Math.min(1, 0.18 + below / depth) * taper * taper

    return { ...p, r: 5.6 * Math.sqrt(value) }
  })

  return beads(points, color, 8)
}

const MOTION = `
.breathe{transform-box:fill-box;transform-origin:center;animation:breathe 8s ease-in-out infinite}
@keyframes breathe{0%,100%{transform:scale(.97);opacity:.88}50%{transform:scale(1.04);opacity:1}}
.wave{transform-box:fill-box;transform-origin:center;opacity:0;animation:wave 9s ease-out infinite}
@keyframes wave{0%{transform:scale(.85);opacity:0}15%{opacity:.7}100%{transform:scale(1.9);opacity:0}}
.ridge{animation:ridge 18s ease-in-out infinite}
@keyframes ridge{0%,100%{transform:translateX(0)}50%{transform:translateX(-10px)}}
`

function art(inks: Inks): string {
  const defs = vgrad('paper', [
    [0, inks.paperTop],
    [1, inks.paperBottom],
  ])
  const paper = bleed(`<rect width="1600" height="1000" fill="url(#paper)"/>`)
  const sun = pin(
    'r',
    `<g style="mix-blend-mode:${inks.blend}">` +
      wave(inks.sun, 0) +
      wave(inks.sun, 3) +
      wave(inks.sun, 6) +
      `<g class="breathe">${sunDots(inks.sun)}</g></g>`,
  )
  const left = pin(
    'bl',
    `<g class="ridge" style="mix-blend-mode:${inks.blend}">` +
      hill(inks.hills, { x0: 0, x1: 760, y1: 1000 }, x => 790 - 150 * Math.exp(-(((x - 150) / 230) ** 2)) + 30 * Math.sin(x / 70), 45, 260) +
      `</g>`,
  )
  const right = pin(
    'br',
    `<g style="mix-blend-mode:${inks.blend}">` +
      hill(inks.hills, { x0: 1020, x1: 1600, y1: 1000 }, x => 860 - 90 * Math.exp(-(((x - 1400) / 200) ** 2)), 45, 220) +
      `</g>`,
  )

  return doc({ style: MOTION, defs, ground: inks.paperTop, layers: [paper, sun, right, left] })
}

export const halftoneDawn: ThemeDef = {
  id: 'halftone-dawn',
  title: 'Halftone Dawn',
  mode: 'light',
  blurb: 'A two-ink riso sunrise: halftone dots that breathe outward.',
  alt: 'A risograph sunrise on cream paper: an orange halftone sun ring that breathes, over blue-gray halftone hills.',
  palette: {
    surface0: '#efe5d1',
    surface1: '#f5eddd',
    surface2: '#faf6ed',
    textPrimary: '#29231e',
    textSecondary: '#54483d',
    textMuted: '#6c5f51',
    accent: '#d1562b',
    danger: '#b6372d',
    success: '#4d7d3b',
    warning: '#a66e0f',
    pro: '#5a6d99',
  },
  glass: { blur: 6, tint: '#efe5d1', opacity: 0.5 },
  art: () => art({ paperTop: '#f4ebd8', paperBottom: '#efe2c8', sun: '#e4683c', hills: '#7389aa', blend: 'multiply' }),
}

export const halftoneDusk: ThemeDef = {
  id: 'halftone-dusk',
  title: 'Halftone Dusk',
  mode: 'dark',
  blurb: 'The riso sunrise on night-blue stock: an ember sun in breathing dots.',
  alt: 'A risograph sun on night-blue paper: an ember-orange halftone ring that breathes, over slate halftone hills.',
  palette: {
    surface0: '#1c2042',
    surface1: '#22274b',
    surface2: '#292e54',
    surface3: '#30355d',
    textPrimary: '#f3ece2',
    textSecondary: '#d3cabe',
    textMuted: '#aba297',
    accent: '#f07a45',
    danger: '#ff6b5e',
    success: '#6fcf8a',
    warning: '#f2b14a',
    pro: '#8f9fd6',
  },
  glass: { blur: 6, tint: '#1c2042', opacity: 0.5 },
  art: () => art({ paperTop: '#1d2146', paperBottom: '#252a52', sun: '#ec6b3a', hills: '#465282', blend: 'screen' }),
}
