// Dither Dunes (light) and Dither Dunes Night (dark): a one-bit desert. Six
// layered dune bands are shaded only with small squares of one ink, placed by a
// Bayer 4x4 ordered dither: dense on each dune's shadowed face, sparse on the lit
// one. A dithered sun sits upper-right over a thin ridge line. The far bands
// drift slowly at different speeds for parallax, and the sun breathes.

import { bleed, cells, doc, n, pin, rng } from '../kit.ts'
import type { ThemeDef } from '../kit.ts'

type Inks = { ground: string; ink: string; sun: string; inkOpacity: number }

const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
]

/** Ordered dither: is a spot of density `v` inked at this grid cell? */
function inked(v: number, ix: number, iy: number): boolean {
  const row = BAYER[((iy % 4) + 4) % 4] as number[]
  const threshold = ((row[((ix % 4) + 4) % 4] as number) + 0.5) / 16

  return v > threshold
}

type Band = { base: number; a1: number; l1: number; p1: number; a2: number; l2: number; p2: number }

const COUNT = 6
const GRID = 8
const SIZE = 3.5
const X0 = -140
const X1 = 1740

function makeBands(): Band[] {
  const random = rng(404)
  const bands: Band[] = []

  for (let i = 0; i < COUNT; i += 1) {
    bands.push({
      base: 480 + i * 84,
      a1: 24 + i * 3,
      l1: 140 + random() * 90,
      p1: random() * 6.28,
      a2: 9 + random() * 4,
      l2: 55 + random() * 40,
      p2: random() * 6.28,
    })
  }

  return bands
}

const BANDS = makeBands()

function top(b: Band, x: number): number {
  return b.base + b.a1 * Math.sin(x / b.l1 + b.p1) + b.a2 * Math.sin(x / b.l2 + b.p2)
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v))
}

/** The solid shape of one dune, painted in the ground color so nearer dunes hide farther ones. */
function silhouette(b: Band, ground: string): string {
  let d = `M${X0},1100L${X0},${n(top(b, X0))}`

  for (let x = X0 + 12; x <= X1; x += 12) d += `L${x},${n(top(b, x))}`

  return `<path d="${d}L${X1},1100z" fill="${ground}"/>`
}

/** The dither of one dune: only the face that shows, denser on the shadowed side. */
function shade(i: number, inks: Inks): string {
  const b = BANDS[i] as Band
  const next = BANDS[i + 1]
  const weight = 0.72 + i * 0.07
  const points: Array<{ x: number; y: number }> = []

  for (let ix = Math.floor((X0 + 80) / GRID); ix <= Math.ceil((X1 - 80) / GRID); ix += 1) {
    const x = ix * GRID
    const t = top(b, x)
    const slope = (top(b, x + 3) - top(b, x - 3)) / 6
    const lit = clamp(0.45 - slope * 2.6, 0, 1)
    const cut = next === undefined ? 1010 : top(next, x) + 24
    const middle = 0.55 + 0.45 * clamp((Math.abs(x - 800) - 220) / 420, 0, 1)

    for (let iy = Math.ceil(t / GRID); iy * GRID <= cut && iy * GRID <= 1000; iy += 1) {
      const y = iy * GRID
      const depth = y - t

      if (depth < 0) continue
      const fade = 0.22 + 0.78 * Math.exp(-depth / 80)
      const edge = 0.9 * Math.exp(-depth / 7)
      const v = (weight * (0.08 + 0.72 * lit * fade) + edge) * middle

      if (inked(v, ix, iy)) points.push({ x: x - SIZE / 2, y: y - SIZE / 2 })
    }
  }

  return cells(points, SIZE, inks.ink, `opacity="${n(0.5 + i * 0.1)}"`)
}

const SUN = { x: 1330, y: 215, r: 92 }
const SUN_GRID = 6
const SUN_SIZE = 3.6

/** The sun: a disc of dither, densest at its core, with a sparse halo that pulses apart from it. */
function sun(color: string): string {
  const disc: Array<{ x: number; y: number }> = []
  const halo: Array<{ x: number; y: number }> = []
  const reach = SUN.r + 42

  for (let ix = Math.floor((SUN.x - reach) / SUN_GRID); ix <= Math.ceil((SUN.x + reach) / SUN_GRID); ix += 1) {
    for (let iy = Math.floor((SUN.y - reach) / SUN_GRID); iy <= Math.ceil((SUN.y + reach) / SUN_GRID); iy += 1) {
      const x = ix * SUN_GRID
      const y = iy * SUN_GRID
      const d = Math.hypot(x - SUN.x, y - SUN.y)
      const spot = { x: x - SUN_SIZE / 2, y: y - SUN_SIZE / 2 }

      if (d <= SUN.r) {
        if (inked(1.05 - 0.6 * (d / SUN.r) ** 1.6, ix, iy)) disc.push(spot)
      } else if (d <= reach) {
        if (inked(0.34 * (1 - (d - SUN.r) / (reach - SUN.r)), ix, iy)) halo.push(spot)
      }
    }
  }

  return `<g class="halo">${cells(halo, SUN_SIZE, color)}</g><g class="sun">${cells(disc, SUN_SIZE, color)}</g>`
}

/** A thin ridge outline behind the farthest dune; the dune hides its feet. */
function ridge(color: string): string {
  const pts = '1150,600 1228,470 1262,500 1352,372 1398,436 1436,402 1510,500 1560,470 1700,640'

  return `<polyline points="${pts}" fill="none" stroke="${color}" stroke-width="1.6" stroke-linejoin="round"/>`
}

const MOTION = `
.sun{transform-box:fill-box;transform-origin:center;animation:breathe 9s ease-in-out infinite}
@keyframes breathe{0%,100%{transform:scale(.97);opacity:.86}50%{transform:scale(1.04);opacity:1}}
.halo{animation:halo 9s ease-in-out infinite}
@keyframes halo{0%,100%{opacity:.35}50%{opacity:.85}}
.d0{animation:d0 31s ease-in-out infinite alternate}
.d1{animation:d1 27s ease-in-out infinite alternate}
.d2{animation:d2 23s ease-in-out infinite alternate}
.d3{animation:d3 19s ease-in-out infinite alternate}
.d4{animation:d4 16s ease-in-out infinite alternate}
@keyframes d0{from{transform:translateX(-40px)}to{transform:translateX(40px)}}
@keyframes d1{from{transform:translateX(30px)}to{transform:translateX(-30px)}}
@keyframes d2{from{transform:translateX(-22px)}to{transform:translateX(22px)}}
@keyframes d3{from{transform:translateX(14px)}to{transform:translateX(-14px)}}
@keyframes d4{from{transform:translateX(-8px)}to{transform:translateX(8px)}}
`

function art(inks: Inks): string {
  let bands = ''

  for (let i = 0; i < COUNT; i += 1) {
    const b = BANDS[i] as Band
    const body = (i === 0 ? ridge(inks.sun) : '') + silhouette(b, inks.ground) + shade(i, inks)

    bands += i < COUNT - 1 ? `<g class="d${i}">${body}</g>` : `<g>${body}</g>`
  }

  return doc({ style: MOTION, ground: inks.ground, layers: [bleed(bands), pin('tr', sun(inks.sun))] })
}

export const ditherDunes: ThemeDef = {
  id: 'dither-dunes',
  title: 'Dither Dunes',
  mode: 'light',
  blurb: 'One-bit dunes on sand paper, shaded in dots, under a terracotta sun.',
  alt: 'A one-bit desert on sand-colored paper: layered dunes shaded in small brown squares, denser on their shadowed sides, under a terracotta dithered sun beside a thin ridge line. The far dunes drift slowly and the sun gently pulses.',
  palette: {
    surface0: '#eadfca',
    surface1: '#f0e7d4',
    surface2: '#f5eee0',
    textPrimary: '#2a2218',
    textSecondary: '#52463a',
    textMuted: '#645642',
    accent: '#c65a3a',
    danger: '#b3372b',
    success: '#4f7a3a',
    warning: '#a66d10',
    pro: '#7a6340',
  },
  glass: { blur: 5, tint: '#eadfca', opacity: 0.5 },
  art: () => art({ ground: '#eadfca', ink: '#8a7350', sun: '#c65a3a', inkOpacity: 1 }),
}

export const ditherDunesNight: ThemeDef = {
  id: 'dither-dunes-night',
  title: 'Dither Dunes Night',
  mode: 'dark',
  blurb: 'The same dunes after dark: pale dots on umber, an ember sun.',
  alt: 'The same one-bit desert after dark: layered dunes shaded in pale sand-colored squares on umber, under an ember-orange dithered sun beside a thin ridge line. The far dunes drift slowly and the sun gently pulses.',
  palette: {
    surface0: '#28221a',
    surface1: '#2e271e',
    surface2: '#342d23',
    surface3: '#3a3227',
    textPrimary: '#f2e8d2',
    textSecondary: '#d6c9a8',
    textMuted: '#ada181',
    accent: '#d4693a',
    danger: '#ff7a6b',
    success: '#7fcf8a',
    warning: '#f0b44a',
    pro: '#d6c7a2',
  },
  glass: { blur: 6, tint: '#28221a', opacity: 0.55 },
  art: () => art({ ground: '#28221a', ink: '#d6c7a2', sun: '#d4693a', inkOpacity: 1 }),
}
