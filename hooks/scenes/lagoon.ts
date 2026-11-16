// Honu Lagoon (light) and Night Reef (dark): a lagoon seen from above, built
// from square tiles. By day a turtle swims past a sand island. After dark the
// turtle and a ray glow as they swim over the reef.

import { bleed, cells, doc, pin, pixels, rng, vgrad } from '../kit.ts'
import type { ThemeDef } from '../kit.ts'

// The turtle, seen from above, head up. The flippers are separate so they can
// stroke: frame A reaches forward, frame B pulls back.
const TURTLE_BODY = [
  '.....hhh.....',
  '.....hhh.....',
  '......h......',
  '.....sss.....',
  '....sSSSs....',
  '...sSsSsSs...',
  '...sSSsSSs...',
  '...sSsSsSs...',
  '...sSSsSSs...',
  '...sSsSsSs...',
  '....sSSSs....',
  '.....sss.....',
  '......t......',
]
const FLIP_A = [
  '.............',
  '.............',
  '.............',
  '.ff.......ff.',
  'fff.......fff',
  '.ff.......ff.',
  '.............',
  '.............',
  '.............',
  '.ff.......ff.',
  'fff.......fff',
  '.f.........f.',
  '.............',
]
const FLIP_B = [
  '.............',
  '.............',
  '.............',
  '.............',
  '.f.........f.',
  'fff.......fff',
  'fff.......fff',
  '.f.........f.',
  '.............',
  '.............',
  '.ff.......ff.',
  '..f.......f..',
  '.............',
]

// A small fish, head to the left.
const FISH = ['.ff.f', 'fffff', '.ff.f']

// A ray from above, head to the left, tail trailing right.
const RAY = [
  '........rr.........',
  '......rrrr.........',
  '....rrrRrr.........',
  '..rrrrrrrrr........',
  'rrrrRrrrrrrrrtttttt',
  '..rrrrrrrrr........',
  '....rrrRrr.........',
  '......rrrr.........',
  '........rr.........',
]

type TurtleInk = { head: string; rim: string; plate: string; flipper: string }

/** The turtle with both flipper frames, the frames swapping every stroke. */
function turtle(ink: TurtleInk, x: number, y: number, cell: number): string {
  const colors = { h: ink.head, s: ink.rim, S: ink.plate, f: ink.flipper, t: ink.flipper }

  return (
    pixels(FLIP_A, colors, x, y, cell, 'class="stroke-a"') +
    pixels(FLIP_B, colors, x, y, cell, 'class="stroke-b"') +
    pixels(TURTLE_BODY, colors, x, y, cell)
  )
}

/** The turtle's shadow on the sand far below: the same shape, one flat color. */
function shadow(color: string, x: number, y: number, cell: number): string {
  const flat = { h: color, s: color, S: color, f: color, t: color }

  return pixels(TURTLE_BODY, flat, x, y, cell) + pixels(FLIP_A, flat, x, y, cell)
}

/** A rough round blob of tiles, ringed by shallow water. Inks run from the middle out. */
function island(cx: number, cy: number, rx: number, ry: number, cell: number, inks: readonly string[], shallow: string, seed: number): string {
  const random = rng(seed)
  const byInk = inks.map(() => [] as { x: number; y: number }[])
  const ring: { x: number; y: number }[] = []
  const cols = Math.ceil((rx * 1.4) / cell)
  const rows = Math.ceil((ry * 1.4) / cell)

  for (let gy = -rows; gy <= rows; gy += 1) {
    for (let gx = -cols; gx <= cols; gx += 1) {
      const x = cx + gx * cell
      const y = cy + gy * cell
      const d = Math.hypot((x - cx) / rx, (y - cy) / ry) + (random() - 0.5) * 0.22

      if (d < 1) {
        const band = Math.min(inks.length - 1, Math.floor(d * inks.length))
        byInk[band]?.push({ x, y })
      } else if (d < 1.22 && random() > 0.25) {
        ring.push({ x, y })
      }
    }
  }

  return (
    cells(ring, cell, shallow, 'class="shallow"') +
    byInk.map((points, index) => cells(points, cell, inks[index] ?? '#000')).join('')
  )
}

/** Scattered tiles that twinkle in two alternating sets. */
function sparkle(color: string, count: number, size: number, seed: number): string {
  const random = rng(seed)
  const a: { x: number; y: number }[] = []
  const b: { x: number; y: number }[] = []

  for (let i = 0; i < count; i += 1) {
    const point = { x: Math.floor(random() * 80) * 20, y: Math.floor(random() * 50) * 20 }
    ;(i % 2 === 0 ? a : b).push(point)
  }

  return cells(a, size, color, 'class="tw-a"') + cells(b, size, color, 'class="tw-b"')
}

const MOTION = `
.stroke-a{animation:stroke-a 1.6s steps(1) infinite}
.stroke-b{animation:stroke-b 1.6s steps(1) infinite}
@keyframes stroke-a{0%{opacity:1}50%{opacity:0}}
@keyframes stroke-b{0%{opacity:0}50%{opacity:1}}
.tw-a{animation:tw 5s ease-in-out infinite}
.tw-b{animation:tw 5s ease-in-out -2.5s infinite}
@keyframes tw{0%,100%{opacity:.15}50%{opacity:.75}}
.shallow{animation:lap 7s ease-in-out infinite}
@keyframes lap{0%,100%{opacity:.55}50%{opacity:.95}}
.swim{animation:swim 42s ease-in-out infinite}
@keyframes swim{0%,100%{transform:translate(0,0)}25%{transform:translate(-46px,-34px)}50%{transform:translate(-104px,6px)}75%{transform:translate(-44px,40px)}}
.school{transform-origin:240px 430px;animation:circle 28s linear infinite}
@keyframes circle{to{transform:rotate(-360deg)}}
.glide{animation:glide 30s ease-in-out infinite}
@keyframes glide{0%,100%{transform:translate(0,0)}50%{transform:translate(90px,-36px)}}
.pulse{animation:pulse 4s ease-in-out infinite}
@keyframes pulse{0%,100%{opacity:.35}50%{opacity:.8}}
.caustic{animation:drift 26s ease-in-out infinite}
@keyframes drift{0%,100%{transform:translateX(0)}50%{transform:translateX(70px)}}
`

function honuArt(): string {
  const defs =
    `<linearGradient id="water" x1="0" y1="0" x2="1" y2="0.35">` +
    `<stop offset="0" stop-color="#dcf0f7"/><stop offset=".45" stop-color="#b4dcef"/><stop offset="1" stop-color="#86b9e0"/>` +
    `</linearGradient>`
  const water = bleed(
    `<rect width="1600" height="1000" fill="url(#water)"/>` +
      `<g class="caustic" fill="#ffffff" opacity=".18">` +
      `<ellipse cx="300" cy="260" rx="260" ry="70"/><ellipse cx="900" cy="760" rx="320" ry="60"/><ellipse cx="1280" cy="340" rx="220" ry="50"/>` +
      `</g>` +
      sparkle('#ffffff', 340, 4, 7),
  )
  const sand = pin(
    'tr',
    island(1440, 130, 170, 120, 16, ['#f4e8ad', '#ecd98c', '#ddc46a'], '#d3eef6', 11) +
      pixels(['.g.', 'ggg', '.g.'], { g: '#8fbf63' }, 1420, 92, 12),
  )
  const bar = pin('br', island(1290, 975, 250, 46, 14, ['#f1e3a2', '#e3cc7d'], '#cfebf4', 23))
  const honu = pin(
    'r',
    `<g class="swim"><g transform="rotate(-32 1330 520)">` +
      `<g opacity=".28">${shadow('#2f6fa6', 1262, 470, 13)}</g>` +
      turtle({ head: '#cdb54f', rim: '#b73a4f', plate: '#e06a7d', flipper: '#d2bb55' }, 1240, 440, 13) +
      `</g></g>`,
  )
  const fish = pin(
    'l',
    `<g class="school">` +
      pixels(FISH, { f: '#e07a8b' }, 200, 300, 9) +
      pixels(FISH, { f: '#e88f9d' }, 250, 330, 7) +
      pixels(FISH, { f: '#d96a7c' }, 165, 340, 8) +
      `</g>`,
  )

  return doc({ style: MOTION, defs, ground: '#b4dcef', layers: [water, bar, sand, fish, honu] })
}

function reefArt(): string {
  const defs =
    vgrad('deep', [
      [0, '#141a4a'],
      [0.6, '#10153c'],
      [1, '#0b0f2e'],
    ]) +
    `<radialGradient id="halo-teal"><stop offset="0" stop-color="#3fe0c0" stop-opacity=".55"/><stop offset="1" stop-color="#3fe0c0" stop-opacity="0"/></radialGradient>` +
    `<radialGradient id="halo-blue"><stop offset="0" stop-color="#4aa8ff" stop-opacity=".5"/><stop offset="1" stop-color="#4aa8ff" stop-opacity="0"/></radialGradient>`
  const water = bleed(
    `<rect width="1600" height="1000" fill="url(#deep)"/>` + sparkle('#9fe8ff', 300, 4, 5) + sparkle('#ffffff', 120, 3, 9),
  )
  const coral = pin(
    'br',
    pixels(
      [
        '....p..........y......',
        '...ppp....b...yyy.....',
        '..pp.pp..bbb...y...p..',
        '...ppp..bb.bb.yyy.ppp.',
        '..ppppp..bbb..y.y..p..',
        '.ppppppp.bbbbbyyyy.ppp',
      ],
      { p: '#ff7aa8', b: '#5ab0ff', y: '#ffd166' },
      1290,
      916,
      12,
      'class="pulse"',
    ),
  )
  const honu = pin(
    'r',
    `<g class="swim"><g transform="rotate(-32 1330 520)">` +
      `<ellipse class="pulse" cx="1325" cy="525" rx="150" ry="150" fill="url(#halo-teal)"/>` +
      turtle({ head: '#46d8b8', rim: '#4b36b0', plate: '#8a6cf2', flipper: '#3fcfae' }, 1240, 440, 13) +
      `</g></g>`,
  )
  const ray = pin(
    'l',
    `<g class="glide">` +
      `<ellipse class="pulse" cx="240" cy="470" rx="170" ry="110" fill="url(#halo-blue)"/>` +
      pixels(RAY, { r: '#3f8fd0', R: '#a8dcff', t: '#3f8fd0' }, 130, 416, 12) +
      `</g>`,
  )

  return doc({ style: MOTION, defs, ground: '#10153c', layers: [water, coral, ray, honu] })
}

export const honuLagoon: ThemeDef = {
  id: 'honu-lagoon',
  title: 'Honu Lagoon',
  mode: 'light',
  blurb: 'A tiled lagoon from above: a turtle swims by a sand island.',
  alt: 'A turquoise lagoon seen from above, built from square tiles, with a sand island and a slowly swimming turtle.',
  palette: {
    surface0: '#e1eef4',
    surface1: '#eaf4f8',
    surface2: '#f5fafc',
    textPrimary: '#10303e',
    textSecondary: '#2b4f60',
    textMuted: '#4a6a78',
    accent: '#1d7ea8',
    danger: '#c0404f',
    success: '#3d8a58',
    warning: '#b07812',
    pro: '#7a50a6',
  },
  glass: { blur: 8, tint: '#e1eef4', opacity: 0.55 },
  art: honuArt,
}

export const nightReef: ThemeDef = {
  id: 'night-reef',
  title: 'Night Reef',
  mode: 'dark',
  blurb: 'The lagoon after dark: a turtle and a ray that glow as they swim.',
  alt: 'A deep blue night lagoon with glowing plankton, a softly lit turtle, a ray and small reef corals.',
  palette: {
    surface0: '#0f1335',
    surface1: '#151a40',
    surface2: '#1b2049',
    surface3: '#212753',
    textPrimary: '#eef0ff',
    textSecondary: '#c6cae9',
    textMuted: '#9ea4cf',
    accent: '#3ccbb0',
    danger: '#ff6f7e',
    success: '#5fd38f',
    warning: '#efb84c',
    pro: '#a68cff',
  },
  glass: { blur: 8, tint: '#0f1335', opacity: 0.5 },
  art: reefArt,
}
