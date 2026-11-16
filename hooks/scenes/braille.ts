// Braille Stars (dark): a night sky drawn dot by dot on a braille grid. Every
// mark is a dot in a 2 x 4 braille cell. A Milky Way band runs diagonally down
// the right side and draws itself in, group by group, then holds. Single star
// dots twinkle in alternating sets over a dark rolling hill.

import { beads, bleed, doc, pin, rng, vgrad } from '../kit.ts'
import type { ThemeDef } from '../kit.ts'

const CELL_W = 16
const CELL_H = 26
const DOT_X = [5, 11]
const DOT_Y = [4, 10, 16, 22]
const COLS = 100
const ROWS = 39

const GROUPS = 8
const BAND_BRIGHT = '#c8d4ff'
const BAND_MID = '#8d9fe0'
const BAND_DIM = '#5a6aa8'

/** Where the middle of the band sits at height y. It leans right as it falls. */
function bandX(y: number): number {
  return 1120 + (y + 60) * 0.42 + 40 * Math.sin(y / 170)
}

/** 0..1 brightness of the band at a point: a soft ridge with clumps. */
function bandDensity(x: number, y: number): number {
  const d = Math.abs(x - bandX(y)) * 0.92
  const w = 105 + 45 * Math.sin(y / 260 + 1)
  const clump = 0.78 + 0.22 * Math.sin(x / 37 + y / 53) * Math.sin(y / 29 - x / 71)

  return Math.exp(-((d / w) ** 2)) * clump
}

type Pt = { x: number; y: number; r: number }

/** The band's dots, sorted into groups by how far down the band they sit. */
function band(): string {
  const rand = rng(4242)
  const buckets: Array<{ bright: Pt[]; mid: Pt[]; dim: Pt[] }> = []

  for (let g = 0; g < GROUPS; g += 1) buckets.push({ bright: [], mid: [], dim: [] })

  for (let cy = 0; cy < ROWS; cy += 1) {
    for (let cx = 0; cx < COLS; cx += 1) {
      const mx = cx * CELL_W + CELL_W / 2
      const my = cy * CELL_H + CELL_H / 2
      const dens = bandDensity(mx, my)

      if (dens < 0.06) continue
      const t = (my + 60) / 1120
      const g = Math.max(0, Math.min(GROUPS - 1, Math.floor(t * GROUPS + (rand() - 0.5) * 0.9)))
      const tier = dens > 0.55 ? 'bright' : dens > 0.28 ? 'mid' : 'dim'

      for (const dx of DOT_X) {
        for (const dy of DOT_Y) {
          if (rand() < dens ** 0.9 * 1.05) buckets[g]?.[tier].push({ x: cx * CELL_W + dx, y: cy * CELL_H + dy, r: 2 })
        }
      }
    }
  }

  return buckets
    .map(
      (b, i) =>
        `<g class="draw" style="animation-delay:${n1(i * 1.4 - 30)}s">` +
        beads(b.dim, BAND_DIM, 1) +
        beads(b.mid, BAND_MID, 1) +
        beads(b.bright, BAND_BRIGHT, 1) +
        `</g>`,
    )
    .join('')
}

function n1(v: number): string {
  return String(Math.round(v * 10) / 10)
}

/** Lone stars, each snapped to a braille dot position, split into four sets. */
function stars(): string {
  const rand = rng(77)
  const sets: Array<{ plain: Pt[]; bright: Pt[] }> = [0, 1, 2, 3].map(() => ({ plain: [], bright: [] }))
  let made = 0

  while (made < 190) {
    const cx = Math.floor(rand() * COLS)
    const cy = Math.floor(rand() * ROWS)
    const x = cx * CELL_W + (DOT_X[Math.floor(rand() * 2)] ?? 5)
    const y = cy * CELL_H + (DOT_Y[Math.floor(rand() * 4)] ?? 4)

    if (y > 840 || bandDensity(x, y) > 0.22) continue
    made += 1
    const set = sets[made % 4]
    const shiny = rand() < 0.18

    if (set) (shiny ? set.bright : set.plain).push({ x, y, r: shiny ? 3 : 1.8 })
  }

  return sets
    .map((s, i) => {
      const cls = i === 0 ? 'still' : i === 1 ? 'tw-a' : i === 2 ? 'tw-b' : 'tw-c'

      return `<g class="${cls}">${beads(s.plain, '#e8ecff', 1)}${beads(s.bright, '#f6f8ff', 1)}</g>`
    })
    .join('')
}

const MOTION = `
.draw{opacity:0;animation:draw 52s ease-in-out infinite both}
@keyframes draw{0%{opacity:0}5%{opacity:1}90%{opacity:1}96%{opacity:0}100%{opacity:0}}
.tw-a{animation:twa 9s ease-in-out infinite}
.tw-b{animation:twa 9s ease-in-out -4.5s infinite}
.tw-c{animation:twa 14s ease-in-out -3s infinite}
@keyframes twa{0%,100%{opacity:1}50%{opacity:.3}}
`

const HILL_FRONT = '#0a1029'
const HILL_BACK = '#0c1332'

function art(): string {
  const defs = vgrad('sky', [
    [0, '#0d1535'],
    [1, '#121c44'],
  ])
  const sky = bleed(`<rect width="1600" height="1000" fill="url(#sky)"/>${stars()}`)
  const milky = pin('r', band())
  const left = pin(
    'bl',
    `<path fill="${HILL_BACK}" d="M0,1000V835C140,790 300,770 450,800C600,830 700,860 860,850C940,845 990,900 1010,1000Z"/>` +
      `<path fill="${HILL_FRONT}" d="M0,1000V880C120,840 250,815 390,840C530,865 620,905 760,895C850,890 910,930 940,1000Z"/>`,
  )
  const right = pin(
    'br',
    `<path fill="${HILL_BACK}" d="M1600,1000V820C1480,785 1370,760 1240,790C1110,820 1020,865 880,860C800,857 740,910 700,1000Z"/>` +
      `<path fill="${HILL_FRONT}" d="M1600,1000V870C1500,840 1400,825 1290,850C1170,878 1090,915 960,910C880,907 820,945 780,1000Z"/>`,
  )

  return doc({ style: MOTION, defs, ground: '#0d1535', layers: [sky, milky, right, left] })
}

export const brailleStars: ThemeDef = {
  id: 'braille-stars',
  title: 'Braille Stars',
  mode: 'dark',
  blurb: 'A slow night sky drawn dot by dot on a braille grid.',
  alt: 'A night sky made of braille dots on deep navy: a Milky Way band of dense dot cells runs diagonally down the right side and draws itself in group by group, single stars twinkle, and dark hills roll along the bottom corners.',
  palette: {
    surface0: '#0d1535',
    surface1: '#121b40',
    surface2: '#17214a',
    surface3: '#1a2450',
    textPrimary: '#eef1ff',
    textSecondary: '#c8d0f0',
    textMuted: '#9ea9d6',
    accent: '#a9b8ff',
    danger: '#ff7a7a',
    success: '#6fd6a0',
    warning: '#f0c060',
    pro: '#b7a6ff',
  },
  glass: { blur: 6, tint: '#0d1535', opacity: 0.5 },
  art,
}
