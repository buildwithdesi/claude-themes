// Snow Pines (dark): an ASCII-style pine forest at dusk. Every tree is a grid of
// small character-like cells. Snow drifts down in three layers, and one cabin
// window glows at the right edge.

import { bleed, cells, doc, glow, pin, pixels, rng, vgrad } from '../kit.ts'
import type { ThemeDef } from '../kit.ts'

type Pt = { x: number; y: number }

type Ink = { a: string; b: string; snow: string; trunk: string }

type Bag = { a: Pt[]; b: Pt[]; snow: Pt[]; trunk: Pt[] }

const NEAR: Ink = { a: '#3e8f8a', b: '#5fb3a3', snow: '#eeeaff', trunk: '#2a5a5c' }
const FAR: Ink = { a: '#2f6b78', b: '#3d8189', snow: '#b9b2e0', trunk: '#274f5e' }

const bag = (): Bag => ({ a: [], b: [], snow: [], trunk: [] })

/**
 * One pine of stacked tiers, each tier a little wider than the last. Cells are
 * collected into `out` so a whole forest becomes a handful of paths.
 */
function pine(out: Bag, cx: number, baseY: number, tiers: number, cell: number, random: () => number): void {
  const rows = tiers * 4
  const top = baseY - (rows + 2) * cell

  for (let i = 0; i < rows; i += 1) {
    const k = Math.floor(i / 4)
    const j = i % 4
    const hw = Math.round(k * 0.9 + j * 0.6 + 0.4)
    const y = top + i * cell

    for (let gx = -hw; gx <= hw; gx += 1) {
      const p = { x: cx + gx * cell, y }
      const tip = j === 3 && Math.abs(gx) >= hw - 1 && gx >= -hw + (k === 0 ? 0 : 1)
      const crown = i === 0

      if (tip || crown || random() < 0.05) out.snow.push(p)
      else if (random() < 0.5) out.a.push(p)
      else out.b.push(p)
    }
  }
  for (let t = 0; t < 2; t += 1) out.trunk.push({ x: cx, y: top + (rows + t) * cell })
}

/** Draws a bag as character-sized squares with a hairline gap, so the trees read as type. */
function paint(out: Bag, ink: Ink, cell: number, gap: number): string {
  const size = cell - gap * 2
  const inset = (points: readonly Pt[]): Pt[] => points.map((p) => ({ x: p.x + gap, y: p.y + gap }))

  return (
    cells(inset(out.trunk), size, ink.trunk) +
    cells(inset(out.a), size, ink.a) +
    cells(inset(out.b), size, ink.b) +
    cells(inset(out.snow), size, ink.snow)
  )
}

/** A snowdrift: columns of cells from a wavy surface down to the bottom of the canvas. */
function drift(x0: number, cols: number, level: number, lift: number, flip: boolean, shades: readonly [string, string, string]): string {
  const rows: Pt[][] = [[], [], []]

  for (let gx = 0; gx < cols; gx += 1) {
    const edge = flip ? cols - 1 - gx : gx
    const surface = Math.floor((level - lift * Math.exp(-edge / 12) + 6 * Math.sin(gx * 0.7)) / 16) * 16
    const x = x0 + gx * 16

    for (let y = surface, band = 0; y < 1000; y += 16, band = Math.min(2, band + 1)) rows[band]?.push({ x, y })
  }

  return cells(rows[2] ?? [], 16, shades[2]) + cells(rows[1] ?? [], 16, shades[1]) + cells(rows[0] ?? [], 16, shades[0])
}

/** Falling snow: the flakes are drawn twice so the fall loops without a seam. */
function snowLayer(count: number, size: number, opacity: number, seed: number, cls: string): string {
  const random = rng(seed)
  const flakes: Pt[] = []

  for (let i = 0; i < count; i += 1) {
    flakes.push({ x: Math.round(-120 + random() * 1840), y: Math.round(random() * 1000) })
  }
  const flat = cells(flakes, size, '#ffffff', `opacity="${opacity}"`)

  return `<g class="${cls}">${flat}<g transform="translate(-60,-1000)">${flat}</g></g>`
}

const CABIN = ['...ssss...', '..rrrrrr..', '.rrrrrrrr.', '.wwwwwwww.', '.wwyywdww.', '.wwyywdww.', '.wwwwwwww.']

const MOTION = `
.fall1{animation:fall 62s linear infinite}
.fall2{animation:fall 38s linear infinite}
.fall3{animation:fall 24s linear infinite}
@keyframes fall{to{transform:translate(60px,1000px)}}
.tw-a{animation:tw 5s ease-in-out infinite}
.tw-b{animation:tw 7s ease-in-out -3s infinite}
@keyframes tw{0%,100%{opacity:.25}50%{opacity:1}}
.lamp{animation:lamp 6s ease-in-out infinite}
@keyframes lamp{0%,100%{opacity:.55}50%{opacity:.95}}
`

function pinesArt(): string {
  const defs =
    vgrad('dusk', [
      [0, '#2c2f74'],
      [0.55, '#4b4a96'],
      [1, '#7a6bb0'],
    ]) + glow('lamp', '#ffc860', 0.8)

  const random = rng(14)

  // Stars: a few, high in the sky, in two groups that twinkle.
  const starsA: Pt[] = []
  const starsB: Pt[] = []

  for (let i = 0; i < 70; i += 1) {
    const p = { x: Math.round(random() * 1590), y: Math.round(random() * 430) }
    ;(i % 5 === 0 ? starsB : starsA).push(p)
  }
  const sky = bleed(
    cells(starsA, 3, '#d9d6ff', 'opacity=".6"') + cells(starsB, 4, '#ffffff', 'class="tw-a"') + cells(starsB.slice(0, 6), 3, '#ffffff', 'class="tw-b"'),
  )

  // Distant, smaller pines along a low horizon, pinned to each side so they never crop.
  const horizon = (x0: number, x1: number, seed: number, flip: boolean): string => {
    const r = rng(seed)
    const far = bag()

    for (let x = x0; x < x1; x += 56 + Math.floor(r() * 24)) pine(far, Math.round(x / 8) * 8, 936 + Math.floor(r() * 2) * 8, 3 + Math.floor(r() * 2), 8, r)

    return (
      drift(x0 < 500 ? 0 : 560, 66, 930, 0, flip, ['#8f82c6', '#7a6cb3', '#6a5ca3']) +
      paint(far, FAR, 8, 1)
    )
  }

  const hillsL = pin('bl', horizon(20, 1000, 3, false))
  const hillsR = pin('br', horizon(620, 1580, 8, true))

  // Near pines: tall at the edges, shorter toward the middle. Small ones go first (behind).
  const trees = (list: ReadonlyArray<readonly [number, number, number]>, seed: number): string => {
    const r = rng(seed)
    const near = bag()

    for (const [cx, base, tiers] of [...list].sort((a, b) => a[2] - b[2])) pine(near, cx, base, tiers, 16, r)

    return paint(near, NEAR, 16, 2)
  }

  const left = pin(
    'bl',
    trees(
      [
        [70, 1000, 9],
        [200, 996, 7],
        [320, 1000, 6],
        [416, 1000, 4],
      ],
      21,
    ) + drift(0, 36, 962, 34, false, ['#efe9ff', '#d6cdf2', '#bfb3e6']),
  )
  const cabin =
    pixels(CABIN, { s: '#e9e4ff', r: '#3a2f66', w: '#5a4a8a', y: '#ffd36b', d: '#2c2250' }, 1346, 926, 10) +
    `<ellipse class="lamp" cx="1386" cy="976" rx="64" ry="54" fill="url(#lamp)"/>`
  const right = pin(
    'br',
    trees(
      [
        [1560, 1000, 8],
        [1250, 996, 5],
        [1160, 1000, 4],
        [1090, 1000, 3],
      ],
      34,
    ) +
      cabin +
      drift(1040, 36, 962, 34, true, ['#efe9ff', '#d6cdf2', '#bfb3e6']),
  )

  const snow = bleed(snowLayer(80, 3, 0.55, 51, 'fall1') + snowLayer(60, 4, 0.8, 52, 'fall2') + snowLayer(34, 6, 0.95, 53, 'fall3'))

  return doc({ style: MOTION, defs, ground: 'url(#dusk)', layers: [sky, hillsL, hillsR, left, right, snow] })
}

export const snowPines: ThemeDef = {
  id: 'snow-pines',
  title: 'Snow Pines',
  mode: 'dark',
  blurb: 'An ASCII pine forest at dusk, snow drifting down through the trees.',
  alt: 'A dusk sky fading from blue-violet to lilac over pine trees built from small character-like cells at both edges, snowy ground, a small cabin with one warm lit window, and snow drifting slowly down.',
  palette: {
    surface0: '#181a4c',
    surface1: '#1d2058',
    surface2: '#232662',
    surface3: '#282c6a',
    textPrimary: '#f0eeff',
    textSecondary: '#cfcdf0',
    textMuted: '#a6a3d6',
    accent: '#5fb3a3',
    danger: '#ff7b8a',
    success: '#6fd3a0',
    warning: '#f0c060',
    pro: '#b8a2f0',
  },
  glass: { blur: 8, tint: '#181a4c', opacity: 0.5 },
  art: pinesArt,
}
