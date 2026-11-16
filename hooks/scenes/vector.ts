// Vector Range (dark): a vector-display landscape. Phosphor-green wireframe
// mountains stand on both sides of a low valley, over a perspective grid floor
// that creeps toward the viewer. An amber beam keeps retracing the main ridge.

import { doc, n, pin, vgrad } from '../kit.ts'
import type { ThemeDef } from '../kit.ts'

const GREEN = '#2f8a5a'
const AMBER = '#ffb347'
const HORIZON = 790
const VP_X = 800
// A wider canvas than the default, so the ranges still reach the sides of a wide monitor.
const WIDE = '-200 0 2000 1000'

type P = readonly [number, number]

// The main ridge, left edge to right edge, dipping to the horizon in the middle.
const RIDGE: readonly P[] = [
  [-200, 640], [-120, 520], [-40, 470], [40, 540], [110, 380], [190, 470], [260, 430], [340, 560],
  [430, 600], [520, 690], [620, 760], [720, 785], [880, 785], [980, 750], [1070, 680], [1150, 600],
  [1230, 470], [1290, 520], [1360, 420], [1430, 360], [1500, 440], [1560, 410], [1650, 520],
  [1740, 580], [1800, 640],
]

/** A polyline as one path string. */
function line(points: readonly P[]): string {
  return points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${n(x)},${n(y)}`).join('')
}

/** A nearer, lower ridge under the main one: every peak slides down toward the horizon. */
function inner(): P[] {
  return RIDGE.map(([x, y], i) => [x + (i % 2 === 0 ? 26 : -22), y + (HORIZON - y) * (0.42 + 0.1 * Math.sin(i * 1.7))] as P)
}

/** Triangulated faces: zigzag lines joining each ridge vertex to its neighbors on the inner ridge. */
function faces(inn: readonly P[]): string {
  let d = ''

  RIDGE.forEach(([x, y], i) => {
    const a = inn[i]
    const b = inn[i + 1]

    if (a !== undefined) d += `M${n(x)},${n(y)}L${n(a[0])},${n(a[1])}`
    if (b !== undefined) d += `M${n(x)},${n(y)}L${n(b[0])},${n(b[1])}`
  })

  return d
}

/** A third, shallow ridge of facets close to the horizon. */
function foot(inn: readonly P[]): { ridge: P[]; faces: string } {
  const ridge = inn.map(([x, y], i) => [x - 10 + (i % 3) * 9, y + (HORIZON - y) * 0.62] as P)
  let d = ''

  inn.forEach(([x, y], i) => {
    const a = ridge[i]

    if (a !== undefined) d += `M${n(x)},${n(y)}L${n(a[0])},${n(a[1])}`
    const b = ridge[i + 1]

    if (b !== undefined) d += `M${n(x)},${n(y)}L${n(b[0])},${n(b[1])}`
  })

  return { ridge, faces: d }
}

/** Floor: rungs spaced geometrically so scaling the group by one step loops it exactly. */
const STEP = 1.35

function rungs(): string {
  let d = ''

  for (let k = -6; k <= 13; k += 1) {
    const y = HORIZON + 6 * STEP ** k

    d += `M-700,${n(y)}H2500`
  }

  return d
}

/** Floor: lines running to the vanishing point. */
function spokes(): string {
  let d = ''

  for (let x = -1500; x <= 3100; x += 140) d += `M${VP_X},${HORIZON}L${x},1000`

  return d
}

const MOTION = `
.beam{stroke-dasharray:.05 .95;animation:beam 10s linear infinite}
@keyframes beam{from{stroke-dashoffset:1}to{stroke-dashoffset:0}}
.floor{transform-origin:${VP_X}px ${HORIZON}px;animation:floor 26s linear infinite}
@keyframes floor{from{transform:scaleY(1)}to{transform:scaleY(${STEP})}}
.moon{animation:flicker 7s ease-in-out infinite}
@keyframes flicker{0%,100%{opacity:1}50%{opacity:.78}}
`

function art(): string {
  const defs =
    vgrad('night', [
      [0, '#0b1610'],
      [1, '#08100c'],
    ]) + vgrad('fade', [[0, '#09120d'], [1, 'rgba(9,18,13,0)']])
  const sky = `<rect width="100%" height="100%" fill="url(#night)"/>`

  const inn = inner()
  const ft = foot(inn)
  const ridge = line(RIDGE)
  const mountains =
    // faint wide glow copies first, then the crisp lines
    `<path d="${ridge}" fill="none" stroke="${GREEN}" stroke-width="6" stroke-opacity=".14" stroke-linejoin="round"/>` +
    `<path d="${line(inn)}" fill="none" stroke="${GREEN}" stroke-width="5" stroke-opacity=".09" stroke-linejoin="round"/>` +
    `<path d="${faces(inn)}" fill="none" stroke="${GREEN}" stroke-width="1" stroke-opacity=".5"/>` +
    `<path d="${line(inn)}" fill="none" stroke="${GREEN}" stroke-width="1.2" stroke-opacity=".6" stroke-linejoin="round"/>` +
    `<path d="${ft.faces}" fill="none" stroke="${GREEN}" stroke-width="1" stroke-opacity=".28"/>` +
    `<path d="${line(ft.ridge)}" fill="none" stroke="${GREEN}" stroke-width="1" stroke-opacity=".32" stroke-linejoin="round"/>` +
    `<path d="${ridge}" fill="none" stroke="${GREEN}" stroke-width="1.5" stroke-linejoin="round"/>`

  const beam =
    `<path class="beam" pathLength="1" d="${ridge}" fill="none" stroke="${AMBER}" stroke-width="9" stroke-opacity=".28" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<path class="beam" pathLength="1" d="${ridge}" fill="none" stroke="${AMBER}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>`

  const floor =
    `<g class="floor"><path d="${rungs()}" fill="none" stroke="${GREEN}" stroke-opacity=".3" stroke-width="1" vector-effect="non-scaling-stroke"/></g>` +
    `<path d="${spokes()}" fill="none" stroke="${GREEN}" stroke-opacity=".22" stroke-width="1" vector-effect="non-scaling-stroke"/>` +
    `<rect x="-700" y="${HORIZON}" width="3200" height="60" fill="url(#fade)"/>` +
    `<path d="M-700,${HORIZON}H2500" stroke="${GREEN}" stroke-opacity=".4" stroke-width="1"/>`

  const land = pin('b', floor + mountains + beam, WIDE)
  const moon = pin(
    'tr',
    `<g class="moon" fill="none" stroke-linejoin="round">` +
      `<path d="M1500,66A46,46 0 1,0 1500,154A60,60 0 0,1 1500,66Z" stroke="${GREEN}" stroke-width="6" stroke-opacity=".16"/>` +
      `<path d="M1500,66A46,46 0 1,0 1500,154A60,60 0 0,1 1500,66Z" stroke="${GREEN}" stroke-width="1.5"/></g>`,
  )

  return doc({ style: MOTION, defs, ground: '#0b1610', layers: [sky, land, moon] })
}

export const vectorRange: ThemeDef = {
  id: 'vector-range',
  title: 'Vector Range',
  mode: 'dark',
  blurb: 'Phosphor mountains on black; an amber beam keeps retracing them.',
  alt: 'A vector-display landscape: thin phosphor-green wireframe mountains on both sides of a low valley, a faint perspective grid floor, a crescent moon outline top right, and an amber beam that keeps sliding along the main ridge line.',
  palette: {
    surface0: '#08100c',
    surface1: '#0d1a13',
    surface2: '#12221a',
    surface3: '#152820',
    textPrimary: '#e3f6ea',
    textSecondary: '#b4d6c0',
    textMuted: '#86ac96',
    accent: '#46c487',
    danger: '#ff6b5b',
    success: '#5fd38a',
    warning: '#e8c04a',
    pro: '#ffb347',
  },
  glass: { blur: 6, tint: '#08100c', opacity: 0.5 },
  art,
}
