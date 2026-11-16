// Blueprint (dark): a cyanotype sheet with a fine white grid. In the bottom-right
// corner a plotted orbit diagram holds a sun, three concentric orbits (one
// dashed, its dashes slowly crawling), tick marks and construction lines. A comet
// with a fading tail goes round the outer orbit.

import { bleed, doc, glow, n, pin } from '../kit.ts'
import type { ThemeDef } from '../kit.ts'

const WHITE = '#f4f8ff'
const CX = 1330
const CY = 790
const SQUASH = 0.62
const TILT = -14
const OUTER = 240
const MIDDLE = 170
const INNER = 105

/** The sheet's grid: minor lines every 20 units, major lines every 100. */
function grid(): string {
  let minor = ''
  let major = ''

  for (let x = 0; x <= 1600; x += 20) (x % 100 === 0 ? (major += `M${x},0V1000`) : (minor += `M${x},0V1000`))
  for (let y = 0; y <= 1000; y += 20) (y % 100 === 0 ? (major += `M0,${y}H1600`) : (minor += `M0,${y}H1600`))

  return (
    `<path d="${minor}" stroke="${WHITE}" stroke-opacity=".06" stroke-width="1" fill="none"/>` +
    `<path d="${major}" stroke="${WHITE}" stroke-opacity=".12" stroke-width="1" fill="none"/>`
  )
}

/** Tick marks around the outer orbit: short every 7.5 degrees, long every 30. */
function ticks(): string {
  let d = ''

  for (let a = 0; a < 360; a += 7.5) {
    const t = (a * Math.PI) / 180
    const len = a % 30 === 0 ? 16 : 7
    const x1 = OUTER * Math.cos(t)
    const y1 = OUTER * Math.sin(t)

    d += `M${n(x1)},${n(y1)}L${n((OUTER + len) * Math.cos(t))},${n((OUTER + len) * Math.sin(t))}`
  }

  return d
}

/** A point on a circle of radius r at `deg` degrees, in the diagram's flat frame. */
function at(r: number, deg: number): [number, number] {
  const t = (deg * Math.PI) / 180

  return [r * Math.cos(t), r * Math.sin(t)]
}

/** Fading tail: short arcs behind the head, each fainter and thinner than the last. */
function tail(): string {
  let out = ''

  for (let k = 0; k < 8; k += 1) {
    const [x1, y1] = at(OUTER, -(k + 1) * 8)
    const [x2, y2] = at(OUTER, -k * 8)
    const alpha = 0.8 * (1 - k / 8)

    out += `<path d="M${n(x1)},${n(y1)}A${OUTER},${OUTER} 0 0,1 ${n(x2)},${n(y2)}" stroke="#eaf2ff" stroke-opacity="${n(alpha)}" stroke-width="${n(3.2 - k * 0.28)}" stroke-linecap="round" fill="none" vector-effect="non-scaling-stroke"/>`
  }

  return out
}

/** A small hollow planet that keeps its round shape inside the squashed frame. */
function planet(r: number, deg: number): string {
  const [x, y] = at(r, deg)

  return `<g transform="translate(${n(x)} ${n(y)}) scale(1 ${n(1 / SQUASH)})"><circle r="4.5" fill="#2f4b9b" stroke="${WHITE}" stroke-width="1.2"/></g>`
}

const MOTION = `
.comet{animation:round 36s linear infinite}
@keyframes round{to{transform:rotate(360deg)}}
.p1{animation:round 90s linear infinite}
.p2{animation:round 140s linear infinite reverse}
.crawl{stroke-dasharray:6 8;animation:crawl 40s linear infinite}
@keyframes crawl{to{stroke-dashoffset:-140}}
`

function art(): string {
  const defs = glow('mid', '#4565b8', 0.85) + glow('head', '#fff6c8', 0.9)
  const sheet = bleed(
    `<ellipse cx="800" cy="480" rx="1000" ry="700" fill="url(#mid)"/>${grid()}`,
  )

  const thin = `fill="none" stroke="${WHITE}" stroke-width="1" vector-effect="non-scaling-stroke"`
  const diagram = pin(
    'br',
    `<g transform="translate(${CX} ${CY}) rotate(${TILT}) scale(1 ${SQUASH})">` +
      // construction lines through the sun, and one diagonal chord
      `<path d="M${-OUTER - 50},0H${OUTER + 50}M0,${-OUTER - 50}V${OUTER + 50}" ${thin} stroke-opacity=".3"/>` +
      `<path d="${`M${n(at(OUTER, 205)[0])},${n(at(OUTER, 205)[1])}L${n(at(OUTER, 25)[0])},${n(at(OUTER, 25)[1])}`}" ${thin} stroke-opacity=".22" stroke-dasharray="2 5"/>` +
      // the orbits
      `<circle r="${INNER}" ${thin} stroke-opacity=".7"/>` +
      `<circle class="crawl" r="${MIDDLE}" ${thin} stroke-opacity=".75"/>` +
      `<circle r="${OUTER}" ${thin} stroke-opacity=".85"/>` +
      `<path d="${ticks()}" ${thin} stroke-opacity=".6"/>` +
      // the sun
      `<circle r="20" ${thin} stroke-opacity=".7"/>` +
      `<g transform="scale(1 ${n(1 / SQUASH)})"><circle r="5.5" fill="#fff2b8"/></g>` +
      // planets drifting very slowly
      `<g class="p1">${planet(INNER, 35)}</g>` +
      `<g class="p2">${planet(MIDDLE, 200)}</g>` +
      // a marker where the comet's orbit meets the axis
      `<path d="M${OUTER - 8},0H${OUTER + 26}" ${thin} stroke-opacity=".7"/>` +
      // the comet
      `<g class="comet">${tail()}<g transform="translate(${OUTER} 0) scale(1 ${n(1 / SQUASH)})">` +
      `<circle r="15" fill="url(#head)"/><circle r="4.6" fill="#fffbe0"/></g></g>` +
      `</g>`,
  )

  return doc({ style: MOTION, defs, ground: '#2f4b9b', layers: [sheet, diagram] })
}

export const blueprint: ThemeDef = {
  id: 'blueprint',
  title: 'Blueprint',
  mode: 'dark',
  blurb: 'A cyanotype sheet; a comet goes round its plotted orbit in the corner.',
  alt: 'A cyanotype blue sheet with a fine white grid. In the bottom-right corner a plotted orbit diagram holds a small sun, three concentric orbits (one dashed), tick marks and construction lines, and a comet with a fading tail slowly circles the outer ellipse.',
  palette: {
    surface0: '#162556',
    surface1: '#1a2c62',
    surface2: '#1e3268',
    surface3: '#21386e',
    textPrimary: '#f4f7ff',
    textSecondary: '#d0dbf7',
    textMuted: '#a9b9e6',
    accent: '#ffe9a0',
    danger: '#ff7b7b',
    success: '#7fdba0',
    warning: '#f6c85f',
    pro: '#9fd0ff',
  },
  glass: { blur: 6, tint: '#162556', opacity: 0.5 },
  art,
}
