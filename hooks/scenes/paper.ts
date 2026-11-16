// Paper Garden (light) and Paper Garden, Kraft (dark): layered cut paper.
// Torn side margins frame a clean center sheet. Pointed sage leaves rise from
// the bottom-left, round eucalyptus leaves hang from the top-right, and one
// coral bloom turns slowly near the right edge. Every piece has a soft offset
// shadow, made from a darker copy of the shape (cheaper than a blur filter).

import { bleed, doc, n, pin, rng } from '../kit.ts'
import type { ThemeDef } from '../kit.ts'

type Inks = {
  center: string
  margin: string
  fiber: string
  shadow: string
  shadowOpacity: number
  sage: readonly [string, string, string]
  vein: string
  eucalyptus: readonly [string, string]
  eucalyptusVein: string
  stem: string
  bloom: string
  bloomDeep: string
  bloomInner: string
}

type Pt = { x: number; y: number }

/** A point and the direction (degrees clockwise from straight up) along a quadratic curve. */
function along(p0: Pt, p1: Pt, p2: Pt, t: number): { x: number; y: number; angle: number } {
  const u = 1 - t
  const x = u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x
  const y = u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y
  const dx = 2 * u * (p1.x - p0.x) + 2 * t * (p2.x - p1.x)
  const dy = 2 * u * (p1.y - p0.y) + 2 * t * (p2.y - p1.y)

  return { x, y, angle: (Math.atan2(dx, -dy) * 180) / Math.PI }
}

/** A long pointed leaf: base at (0,0), tip straight up at (0,-len). */
function pointedPath(len: number, w: number): { whole: string; half: string } {
  const right = `M0,0C${n(w)},${n(-len * 0.25)} ${n(w * 0.95)},${n(-len * 0.7)} 0,${n(-len)}`
  const left = `C${n(-w * 0.95)},${n(-len * 0.7)} ${n(-w)},${n(-len * 0.25)} 0,0Z`

  return { whole: right + left, half: right + 'Z' }
}

/** A round eucalyptus leaf: base at (0,0), rounded top at (0,-2r). */
function roundPath(r: number): string {
  return (
    `M0,0C${n(r * 1.1)},${n(-r * 0.2)} ${n(r * 1.1)},${n(-r * 1.9)} 0,${n(-r * 2)}` +
    `C${n(-r * 1.1)},${n(-r * 1.9)} ${n(-r * 1.1)},${n(-r * 0.2)} 0,0Z`
  )
}

/** One cut-paper piece: shadow, flat fill, a darker folded half, and a vein. */
function piece(inks: Inks, parts: { d: string; half?: string; fill: string; vein: string; veinPath: string }): string {
  return (
    `<path d="${parts.d}" fill="${inks.shadow}" fill-opacity="${inks.shadowOpacity}" transform="translate(5,6)"/>` +
    `<path d="${parts.d}" fill="${parts.fill}"/>` +
    (parts.half === undefined ? '' : `<path d="${parts.half}" fill="${inks.shadow}" fill-opacity=".1"/>`) +
    `<path d="${parts.veinPath}" stroke="${parts.vein}" stroke-width="1.6" stroke-linecap="round" fill="none"/>`
  )
}

/** A pointed leaf placed at (x, y), turned `rot` degrees, swaying around its base. */
function pointedLeaf(inks: Inks, at: { x: number; y: number; rot: number }, size: { len: number; w: number }, fill: string, sway: number, delay: number): string {
  const { whole, half } = pointedPath(size.len, size.w)
  const veinPath = `M0,-4Q${n(size.w * 0.1)},${n(-size.len * 0.5)} 0,${n(-size.len * 0.9)}`

  return (
    `<g transform="translate(${n(at.x)},${n(at.y)}) rotate(${n(at.rot)})">` +
    `<g class="s${sway}" style="animation-delay:${delay}s">` +
    piece(inks, { d: whole, half, fill, vein: inks.vein, veinPath }) +
    `</g></g>`
  )
}

/** A round leaf on a short stalk. */
function roundLeaf(inks: Inks, at: { x: number; y: number; rot: number }, r: number, fill: string, sway: number, delay: number): string {
  const veinPath = `M0,-3Q${n(r * 0.1)},${n(-r)} 0,${n(-r * 1.7)}`

  return (
    `<g transform="translate(${n(at.x)},${n(at.y)}) rotate(${n(at.rot)})">` +
    `<g class="s${sway}" style="animation-delay:${delay}s">` +
    piece(inks, { d: roundPath(r), fill, vein: inks.eucalyptusVein, veinPath }) +
    `</g></g>`
  )
}

/** A thin stem with its own offset shadow. */
function stem(inks: Inks, p0: Pt, p1: Pt, p2: Pt, width: number): string {
  const d = `M${p0.x},${p0.y}Q${p1.x},${p1.y} ${p2.x},${p2.y}`

  return (
    `<path d="${d}" stroke="${inks.shadow}" stroke-opacity="${inks.shadowOpacity}" stroke-width="${width}" stroke-linecap="round" fill="none" transform="translate(4,5)"/>` +
    `<path d="${d}" stroke="${inks.stem}" stroke-width="${width}" stroke-linecap="round" fill="none"/>`
  )
}

/** The sprig of long pointed leaves rising from the bottom-left corner. */
function sprig(inks: Inks): string {
  const r = rng(11)
  const p0 = { x: 120, y: 1040 }
  const p1 = { x: 90, y: 820 }
  const p2 = { x: 255, y: 540 }
  let leaves = ''

  for (let i = 0; i < 9; i += 1) {
    const t = 0.1 + i * 0.095
    const spot = along(p0, p1, p2, t)
    const side = i % 2 === 0 ? -1 : 1
    const len = 215 - i * 12 + r() * 14
    const rot = spot.angle + side * (36 + r() * 14)
    const fill = inks.sage[i % 3] ?? inks.sage[0]

    leaves += pointedLeaf(inks, { x: spot.x, y: spot.y, rot }, { len, w: len * 0.2 }, fill, i % 3, -i * 1.1)
  }
  const tip = along(p0, p1, p2, 1)
  leaves += pointedLeaf(inks, { x: tip.x, y: tip.y, rot: tip.angle }, { len: 120, w: 24 }, inks.sage[1], 2, -2.4)

  return `<g class="sprig">${stem(inks, p0, p1, p2, 6)}${leaves}</g>`
}

/** The cluster of small round leaves hanging in from the top-right. */
function hanging(inks: Inks): string {
  const r = rng(23)
  const p0 = { x: 1480, y: -30 }
  const p1 = { x: 1515, y: 150 }
  const p2 = { x: 1400, y: 390 }
  let leaves = ''

  for (let i = 0; i < 9; i += 1) {
    const t = 0.1 + i * 0.1
    const spot = along(p0, p1, p2, t)
    const side = i % 2 === 0 ? 1 : -1
    const radius = 31 - i * 1.4 + r() * 4
    const rot = spot.angle + side * (62 + r() * 18)
    const fill = inks.eucalyptus[i % 2] ?? inks.eucalyptus[0]

    leaves += roundLeaf(inks, { x: spot.x, y: spot.y, rot }, radius, fill, i % 3, -i * 0.9)
  }
  const tip = along(p0, p1, p2, 1)
  leaves += roundLeaf(inks, { x: tip.x, y: tip.y, rot: tip.angle, }, 24, inks.eucalyptus[0], 1, -1.7)

  return `<g class="hang">${stem(inks, p0, p1, p2, 4)}${leaves}</g>`
}

/** Five round petals around a darker center, with a small inner circle. */
function bloom(inks: Inks): string {
  const petal = 'M0,0C-34,-30 -30,-86 0,-92C30,-86 34,-30 0,0Z'
  let shadow = ''
  let petals = ''

  for (let i = 0; i < 5; i += 1) {
    const turn = i * 72
    shadow += `<path d="${petal}" transform="rotate(${turn})"/>`
    petals +=
      `<g transform="rotate(${turn})"><path d="${petal}" fill="${inks.bloom}"/>` +
      `<path d="M0,0C30,-30 34,-86 0,-92Z" fill="${inks.bloomDeep}" fill-opacity=".14"/>` +
      `<path d="M0,-24L0,-70" stroke="${inks.bloomDeep}" stroke-opacity=".4" stroke-width="1.6" stroke-linecap="round"/></g>`
  }

  return (
    `<g transform="translate(1465,640)"><g class="bloom">` +
    `<g fill="${inks.shadow}" fill-opacity="${inks.shadowOpacity}" transform="translate(6,7)">${shadow}</g>` +
    petals +
    `<circle r="23" fill="${inks.bloomDeep}"/>` +
    `<circle r="9" fill="${inks.bloomInner}"/>` +
    `</g></g>`
  )
}

/** Two pointed leaves from the right edge, tucked behind the bloom. */
function backdrop(inks: Inks): string {
  return (
    pointedLeaf(inks, { x: 1625, y: 850, rot: -52 }, { len: 330, w: 62 }, inks.sage[2], 1, -0.8) +
    pointedLeaf(inks, { x: 1620, y: 790, rot: -24 }, { len: 250, w: 48 }, inks.sage[0], 2, -3.1)
  )
}

/** The torn points along a margin's inner edge. */
function tornEdge(seed: number, x: number): Pt[] {
  const r = rng(seed)
  const pts: Pt[] = []

  for (let y = -20; y <= 1020; y += 22) {
    pts.push({ x: x + (r() - 0.5) * 14 + 6 * Math.sin(y / 90), y })
  }

  return pts
}

/** A margin strip: out to `far`, down the torn edge, back. */
function strip(pts: Pt[], far: number): string {
  const first = pts[0] ?? { x: 0, y: 0 }
  const last = pts[pts.length - 1] ?? { x: 0, y: 0 }

  return `M${far},${first.y}L${pts.map(p => `${n(p.x)},${n(p.y)}`).join('L')}L${far},${last.y}Z`
}

const MOTION = `
.s0,.s1,.s2{transform-box:fill-box;transform-origin:50% 100%;animation-timing-function:ease-in-out;animation-iteration-count:infinite;animation-direction:alternate}
.s0{animation-name:swing;animation-duration:6s}
.s1{animation-name:swing;animation-duration:7.5s}
.s2{animation-name:swing;animation-duration:9s}
@keyframes swing{from{transform:rotate(-1.8deg)}to{transform:rotate(1.8deg)}}
.sprig{transform-box:view-box;transform-origin:120px 1040px;animation:lean 8s ease-in-out infinite alternate}
.hang{transform-box:view-box;transform-origin:1480px -30px;animation:lean 9s ease-in-out -3s infinite alternate}
@keyframes lean{from{transform:rotate(-1.4deg)}to{transform:rotate(1.4deg)}}
.bloom{transform-box:fill-box;transform-origin:center;animation:turn 40s ease-in-out infinite alternate}
@keyframes turn{from{transform:rotate(-4deg)}to{transform:rotate(4deg)}}
`

function art(inks: Inks): string {
  const left = tornEdge(5, 288)
  const right = tornEdge(9, 1312)
  const leftEdge = left.map(p => `${n(p.x - 3)},${n(p.y)}`).join('L')
  const rightEdge = right.map(p => `${n(p.x + 3)},${n(p.y)}`).join('L')
  const margins = bleed(
    `<path d="${strip(left, -900)}" fill="${inks.shadow}" fill-opacity="${inks.shadowOpacity}" transform="translate(6,3)"/>` +
      `<path d="${strip(right, 2500)}" fill="${inks.shadow}" fill-opacity="${inks.shadowOpacity}" transform="translate(-6,3)"/>` +
      `<path d="${strip(left, -900)}" fill="${inks.margin}"/>` +
      `<path d="${strip(right, 2500)}" fill="${inks.margin}"/>` +
      `<path d="M${leftEdge}" stroke="${inks.fiber}" stroke-width="2" stroke-opacity=".6" fill="none"/>` +
      `<path d="M${rightEdge}" stroke="${inks.fiber}" stroke-width="2" stroke-opacity=".6" fill="none"/>`,
  )

  return doc({
    style: MOTION,
    ground: inks.center,
    layers: [margins, pin('bl', sprig(inks)), pin('tr', hanging(inks)), pin('r', backdrop(inks) + bloom(inks))],
  })
}

const LIGHT: Inks = {
  center: '#f7f3e8',
  margin: '#ebe6d5',
  fiber: '#faf7ef',
  shadow: '#4a3d27',
  shadowOpacity: 0.16,
  sage: ['#a7bd93', '#c3d2ae', '#7f9b6c'],
  vein: '#e4ecd6',
  eucalyptus: ['#9fb48f', '#7c9670'],
  eucalyptusVein: '#d5e0c8',
  stem: '#7f9b6c',
  bloom: '#e07a5f',
  bloomDeep: '#b85a44',
  bloomInner: '#f3c3b0',
}

const KRAFT: Inks = {
  center: '#2b2823',
  margin: '#34312b',
  fiber: '#4a463d',
  shadow: '#000000',
  shadowOpacity: 0.35,
  sage: ['#56664a', '#6b7d5a', '#45553b'],
  vein: '#8da07a',
  eucalyptus: ['#5d6e4e', '#4c5c41'],
  eucalyptusVein: '#8a9d78',
  stem: '#45553b',
  bloom: '#d9714f',
  bloomDeep: '#a8523a',
  bloomInner: '#efb49a',
}

export const paperGarden: ThemeDef = {
  id: 'paper-garden',
  title: 'Paper Garden',
  mode: 'light',
  blurb: 'Cut-paper leaves at the edges of a warm white sheet, one coral bloom.',
  alt: 'Layered cut paper in warm white: torn tan margins, a sprig of sage leaves in the bottom-left, round eucalyptus leaves hanging from the top-right, and one coral flower near the right edge.',
  palette: {
    surface0: '#ebe6d5',
    surface1: '#f3efe2',
    surface2: '#f7f3e8',
    textPrimary: '#26241d',
    textSecondary: '#4a463a',
    textMuted: '#625d4e',
    accent: '#c9604a',
    danger: '#b3382c',
    success: '#4d7a3a',
    warning: '#a8690f',
    pro: '#6f8a5c',
  },
  glass: { blur: 6, tint: '#ebe6d5', opacity: 0.5 },
  art: () => art(LIGHT),
}

export const paperGardenKraft: ThemeDef = {
  id: 'paper-garden-kraft',
  title: 'Paper Garden, Kraft',
  mode: 'dark',
  blurb: 'Cut-paper leaves at the edges of dark kraft paper, one coral bloom.',
  alt: 'Layered cut paper in dark kraft brown: torn margins, a sprig of dark olive leaves in the bottom-left, round eucalyptus leaves hanging from the top-right, and one coral flower near the right edge.',
  palette: {
    surface0: '#2b2823',
    surface1: '#302d27',
    surface2: '#36322c',
    surface3: '#3a362f',
    textPrimary: '#f1ebdc',
    textSecondary: '#cfc8b6',
    textMuted: '#aaa391',
    accent: '#e8845f',
    danger: '#ff7066',
    success: '#7fc47a',
    warning: '#e8b04a',
    pro: '#9bb086',
  },
  glass: { blur: 6, tint: '#2b2823', opacity: 0.5 },
  art: () => art(KRAFT),
}
