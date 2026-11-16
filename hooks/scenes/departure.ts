// Departure Board (dark): a dark brown board of amber LED dots. Seven rows of
// made-up places and times sit on the right. One row at a time flickers through
// scrambled letters and settles back into its text; the rows take turns, top to
// bottom, over a long loop.

import { beads, doc, glow, pin, rng } from '../kit.ts'
import type { ThemeDef } from '../kit.ts'

const AMBER = '#ffb547'

// 5 x 7 dot-matrix glyphs: only the letters and digits the board needs.
const FONT: Record<string, readonly string[]> = {
  A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  B: ['####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.'],
  C: ['.####', '#....', '#....', '#....', '#....', '#....', '.####'],
  D: ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'],
  E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
  F: ['#####', '#....', '#....', '####.', '#....', '#....', '#....'],
  H: ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  I: ['.###.', '..#..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  K: ['#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#'],
  L: ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
  M: ['#...#', '##.##', '#.#.#', '#.#.#', '#...#', '#...#', '#...#'],
  N: ['#...#', '##..#', '##..#', '#.#.#', '#..##', '#..##', '#...#'],
  O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
  S: ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
  T: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
  U: ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  '0': ['.###.', '#...#', '#..##', '#.#.#', '##..#', '#...#', '.###.'],
  '1': ['..#..', '.##..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  '2': ['.###.', '#...#', '....#', '...#.', '..#..', '.#...', '#####'],
  '3': ['####.', '....#', '....#', '.###.', '....#', '....#', '####.'],
  '4': ['...#.', '..##.', '.#.#.', '#..#.', '#####', '...#.', '...#.'],
  '5': ['#####', '#....', '####.', '....#', '....#', '#...#', '.###.'],
  '6': ['.###.', '#....', '#....', '####.', '#...#', '#...#', '.###.'],
  '7': ['#####', '....#', '...#.', '..#..', '.#...', '.#...', '.#...'],
  '8': ['.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.'],
  '9': ['.###.', '#...#', '#...#', '.####', '....#', '....#', '.###.'],
}
const POOL = Object.keys(FONT)

const PITCH = 7
const ADVANCE = PITCH * 6
const X0 = 990
const Y0 = 246
const ROW_GAP = 88
const NAME_SLOTS = 8
const TIME_COL = 9
const SLOTS = 13
const LOOP = 36
const STAGGER = 4

const ROWS: ReadonlyArray<readonly [string, string]> = [
  ['NORTH', '0715'],
  ['HARBOR', '0742'],
  ['SUMMIT', '0805'],
  ['LAKESIDE', '0830'],
  ['FERNDALE', '0856'],
  ['CEDAR', '0921'],
  ['ORCHARD', '0948'],
]

type Pt = { x: number; y: number; r: number }

/** The lit dots of one glyph whose slot starts at column `slot` of row `row`. */
function glyph(ch: string, slot: number, row: number, r: number): Pt[] {
  const g = FONT[ch]
  const out: Pt[] = []

  if (g === undefined) return out
  g.forEach((line, gy) => {
    for (let gx = 0; gx < 5; gx += 1) {
      if (line[gx] === '#') out.push({ x: X0 + slot * ADVANCE + gx * PITCH, y: Y0 + row * ROW_GAP + gy * PITCH, r })
    }
  })

  return out
}

/** Dots for a name and a time laid in their columns; `pick` lets a frame swap in random letters. */
function rowDots(row: number, name: string, time: string, pick: (ch: string) => string): Pt[] {
  const out: Pt[] = []

  for (let i = 0; i < name.length; i += 1) out.push(...glyph(pick(name[i] ?? ' '), i, row, 2.6))
  for (let i = 0; i < time.length; i += 1) out.push(...glyph(pick(time[i] ?? ' '), TIME_COL + i, row, 2.6))

  return out
}

/** Every unlit LED of the board: the whole 5 x 7 grid under every slot. */
function unlit(): string {
  const pts: Pt[] = []

  for (let row = 0; row < ROWS.length; row += 1) {
    for (let slot = 0; slot < SLOTS; slot += 1) {
      for (let gy = 0; gy < 7; gy += 1) {
        for (let gx = 0; gx < 5; gx += 1) {
          pts.push({ x: X0 + slot * ADVANCE + gx * PITCH, y: Y0 + row * ROW_GAP + gy * PITCH, r: 2.2 })
        }
      }
    }
  }

  return beads(pts, AMBER, 1, 'opacity=".1"')
}

/** One row: the settled text plus two scrambled frames, all toggled by steps() keyframes. */
function rowLayers(row: number, name: string, time: string, seed: number): string {
  const rand = rng(seed)
  const scramble = (ch: string): string => (ch === ' ' ? ' ' : (POOL[Math.floor(rand() * POOL.length)] ?? 'E'))
  const delay = `style="animation-delay:${row * STAGGER}s"`
  const same = (ch: string): string => ch

  return (
    `<g class="f" ${delay}>${beads(rowDots(row, name, time, same), AMBER, 1)}</g>` +
    `<g class="a" ${delay}>${beads(rowDots(row, name, time, scramble), AMBER, 1)}</g>` +
    `<g class="b" ${delay}>${beads(rowDots(row, name, time, scramble), AMBER, 1)}</g>`
  )
}

const MOTION = `
.f,.a,.b{animation-duration:${LOOP}s;animation-iteration-count:infinite;animation-timing-function:steps(1,end)}
.f{animation-name:fin}
.a{opacity:0;animation-name:sa}
.b{opacity:0;animation-name:sb}
@keyframes fin{0%{opacity:1}2%{opacity:0}5%{opacity:1}}
@keyframes sa{0%{opacity:0}2%{opacity:1}2.8%{opacity:0}3.6%{opacity:1}4.2%{opacity:0}}
@keyframes sb{0%{opacity:0}2.8%{opacity:1}3.6%{opacity:0}4.2%{opacity:1}5%{opacity:0}}
`

function art(): string {
  const defs = glow('lamp', AMBER, 0.12)
  const width = (SLOTS - 1) * ADVANCE + 4 * PITCH
  const boardH = (ROWS.length - 1) * ROW_GAP + 6 * PITCH
  const cx = X0 + width / 2
  const cy = Y0 + boardH / 2
  const frame =
    `<rect x="${X0 - 28}" y="${Y0 - 26}" width="${width + 56}" height="${boardH + 52}" rx="14" fill="none" stroke="${AMBER}" stroke-opacity=".16" stroke-width="1.5"/>` +
    `<ellipse cx="${cx}" cy="${cy}" rx="${width * 0.75}" ry="${boardH * 0.7}" fill="url(#lamp)"/>`
  let text = ''

  ROWS.forEach(([name, time], row) => {
    text += rowLayers(row, name, time, 900 + row * 31)
  })

  return doc({ style: MOTION, defs, ground: '#17120c', layers: [pin('r', `<g transform="translate(1590 500) scale(0.78) translate(-1590 -500)">${frame + unlit() + text}</g>`)] })
}

export const departureBoard: ThemeDef = {
  id: 'departure-board',
  title: 'Departure Board',
  mode: 'dark',
  blurb: 'An amber LED board re-lettering itself, row by row.',
  alt: 'A dark brown departure board covered in dim unlit LED dots. On the right, seven rows of amber dot-matrix place names and times take turns flickering through scrambled letters, top to bottom, and settling back into their text.',
  palette: {
    surface0: '#17120c',
    surface1: '#1e1810',
    surface2: '#261e14',
    surface3: '#2a2116',
    textPrimary: '#fff1d9',
    textSecondary: '#e2cfae',
    textMuted: '#b39e7e',
    accent: '#ffb547',
    danger: '#ff7058',
    success: '#8fcf6a',
    warning: '#f5c04a',
    pro: '#ffd08a',
  },
  glass: { blur: 6, tint: '#17120c', opacity: 0.5 },
  art,
}
