// Block Clouds (dark): night clouds built from blocks on a coarse teletext grid.
// Everything snaps to 16-unit cells, and the clouds drift in whole-cell steps.

import { bleed, cells, doc, pin, pixels, rng, vgrad } from '../kit.ts'
import type { ThemeDef } from '../kit.ts'

type Pt = { x: number; y: number }

const G = 16

// w = white top, p = periwinkle body, l = pink-lilac underside.
const CLOUD_LEFT = [
  '..........wwww.............',
  '........wwwwwwww....www....',
  '....wwwwwppppppwwwwwwwwww..',
  '..wwppppppppppppppppppppww.',
  '.ppppppppppppppppppppppppp.',
  'pppppppppppppppppppppppppp.',
  'lllpppppppppppppppppppplll.',
  '.llllllllllllllllllllllll..',
]
const CLOUD_RIGHT = [
  '.........wwww.........',
  '......wwwwwwwwww......',
  '...wwwwppppppppwwww...',
  '.wwppppppppppppppppww.',
  'pppppppppppppppppppppp',
  'lllppppppppppppppplllp',
  '.lllllllllllllllllllp.',
]
const CLOUD_SMALL = ['....wwww....', '..wwwppwwww.', '.ppppppppppp', 'lppppppppppl', '.llllllllll.']

const CLOUD_INK = { w: '#ffffff', p: '#6f7fe0', l: '#c9a2d8' }

// The yellow crescent, opening to the right.
const MOON = ['...yyyy.', '..yyy...', '.yyy....', '.yyy....', '.yyy....', '..yyy...', '...yyyy.']
const SPARK = ['.y.', 'yyy', '.y.']

/** The low band of dark cloud: a ragged top edge, filled solid to the bottom. */
function band(): string {
  const random = rng(12)
  const body: Pt[] = []
  const crest: Pt[] = []
  let top = 50

  for (let col = -10; col < 112; col += 1) {
    if (random() < 0.45) top = Math.max(49, Math.min(52, top + (random() < 0.5 ? -1 : 1)))
    for (let row = top; row < 63; row += 1) (row === top && random() < 0.35 ? crest : body).push({ x: col * G, y: row * G })
  }

  return `<g class="band">${cells(body, G, '#2f3796')}${cells(crest, G, '#3a43a6')}</g>`
}

/** White star blocks on the grid, half a cell wide, in two groups that blink. */
function stars(): string {
  const random = rng(5)
  const still: Pt[] = []
  const blinkA: Pt[] = []
  const blinkB: Pt[] = []
  const dim: Pt[] = []

  for (let i = 0; i < 90; i += 1) {
    const p = { x: Math.floor(random() * 100) * G + 4, y: Math.floor(random() * 30) * G + 4 }

    if (i % 9 === 0) blinkA.push(p)
    else if (i % 9 === 4) blinkB.push(p)
    else if (i % 3 === 0) dim.push(p)
    else still.push(p)
  }

  return (
    cells(still, 8, '#ffffff', 'opacity=".85"') +
    cells(dim, 8, '#9aa6f0', 'opacity=".8"') +
    cells(blinkA, 8, '#ffffff', 'class="tw-a"') +
    cells(blinkB, 8, '#ffffff', 'class="tw-b"')
  )
}

const MOTION = `
.band{animation:band 64s steps(8) infinite alternate}
@keyframes band{from{transform:translateX(0)}to{transform:translateX(-128px)}}
.c1{animation:c1 52s steps(7) infinite alternate}
@keyframes c1{from{transform:translateX(0)}to{transform:translateX(112px)}}
.c2{animation:c2 60s steps(6) infinite alternate}
@keyframes c2{from{transform:translateX(0)}to{transform:translateX(-96px)}}
.c3{animation:c1 44s steps(5) infinite alternate}
.c4{animation:c2 48s steps(6) infinite alternate}
.tw-a{animation:blink 3.2s steps(1) infinite}
.tw-b{animation:blink 4.4s steps(1) -1.7s infinite}
@keyframes blink{0%,55%{opacity:1}56%,100%{opacity:.15}}
.sp-a{animation:blink 2.6s steps(1) infinite}
.sp-b{animation:blink 3.4s steps(1) -1.2s infinite}
`

function cloudsArt(): string {
  const defs = vgrad('night', [
    [0, '#252c8c'],
    [1, '#1b2170'],
  ])

  const sky = bleed(stars() + band())

  const moon = pin(
    'tr',
    pixels(MOON, { y: '#ffd84a' }, 1432, 64, G) +
      pixels(SPARK, { y: '#fff3a8' }, 1368, 56, 8, 'class="sp-a"') +
      pixels(SPARK, { y: '#fff3a8' }, 1568, 240, 8, 'class="sp-b"'),
  )

  const left = pin('l', `<g class="c1">${pixels(CLOUD_LEFT, CLOUD_INK, 16, 416, G)}</g>`)
  const lower = pin('br', `<g class="c2">${pixels(CLOUD_RIGHT, CLOUD_INK, 1088, 640, G)}</g>`)
  const smallTop = pin('tl', `<g class="c3">${pixels(CLOUD_SMALL, CLOUD_INK, 128, 96, G)}</g>`)
  const smallMid = pin('r', `<g class="c4">${pixels(CLOUD_SMALL, CLOUD_INK, 1328, 384, G)}</g>`)

  return doc({ style: MOTION, defs, ground: 'url(#night)', layers: [sky, smallTop, smallMid, left, lower, moon] })
}

export const teletextClouds: ThemeDef = {
  id: 'teletext-clouds',
  title: 'Block Clouds',
  mode: 'dark',
  blurb: 'Night clouds built from blocks on a teletext grid, drifting in.',
  alt: 'A royal blue night sky drawn in coarse blocks, with periwinkle clouds that have white tops and pink-lilac undersides, a darker cloud band low down, a yellow block crescent moon with blinking sparkles, and white star blocks.',
  palette: {
    surface0: '#161b5e',
    surface1: '#1b2168',
    surface2: '#212873',
    surface3: '#272f7c',
    textPrimary: '#f4f5ff',
    textSecondary: '#d3d7ff',
    textMuted: '#a9afee',
    accent: '#ffd84a',
    danger: '#ff7d8a',
    success: '#6fe0a0',
    warning: '#ffc94d',
    pro: '#c9a2d8',
  },
  glass: { blur: 6, tint: '#161b5e', opacity: 0.5 },
  art: cloudsArt,
}
