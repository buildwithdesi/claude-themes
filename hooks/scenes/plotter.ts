// Plotter Tide (light) and Plotter Tide, Night (dark): a pen-plotter tide chart.
// Thin contour lines sweep in from the bottom-left corner and the right edge,
// drawing themselves one after another, holding, then wiping away and starting
// again. Fine hatching fills the sand nearest each corner. A buoy of dashed
// rings turns slowly near the top-right.

import { doc, n, pin, rng } from '../kit.ts'
import type { ThemeDef } from '../kit.ts'

type Inks = { paper: string; line: string; hatch: string; mark: string }
type P = { x: number; y: number }

/** One family of nested contours around a center, swept over an arc of angles. */
type Family = { cx: number; cy: number; from: number; to: number; base: number; step: number; count: number; amp: number; seed: number }

const LEFT: Family = { cx: 0, cy: 1000, from: -3, to: 93, base: 60, step: 33, count: 12, amp: 13, seed: 11 }
const RIGHT: Family = { cx: 1600, cy: 640, from: 87, to: 273, base: 42, step: 25, count: 10, amp: 9, seed: 23 }
const BUOY = { x: 1400, y: 170 }

/** The points of contour number `s`: a radius that wobbles as the angle sweeps. */
function contour(f: Family, s: number): P[] {
  const random = rng(f.seed + s)
  const phase = random() * 2 + s * 0.21
  const amp = f.amp * (0.45 + (s / f.count) * 0.9)
  const pts: P[] = []
  const steps = 30

  for (let k = 0; k <= steps; k += 1) {
    const t = k / steps
    const a = ((f.from + (f.to - f.from) * t) * Math.PI) / 180
    const wobble = amp * (Math.sin(t * Math.PI * 3 + phase) + 0.42 * Math.sin(t * Math.PI * 7.5 + 1.3 + s * 0.35))
    const r = f.base + s * f.step + wobble

    pts.push({ x: f.cx + r * Math.cos(a), y: f.cy - r * Math.sin(a) })
  }

  return pts
}

/** A smooth curve through the points, as cubic Bezier segments (Catmull-Rom). */
function smooth(pts: readonly P[]): string {
  const last = pts.length - 1
  const at = (i: number): P => pts[Math.max(0, Math.min(i, last))] as P
  let d = `M${n(at(0).x)},${n(at(0).y)}`

  for (let i = 0; i < last; i += 1) {
    const p0 = at(i - 1)
    const p1 = at(i)
    const p2 = at(i + 1)
    const p3 = at(i + 2)

    d +=
      `C${n(p1.x + (p2.x - p0.x) / 6)},${n(p1.y + (p2.y - p0.y) / 6)},` +
      `${n(p2.x - (p3.x - p1.x) / 6)},${n(p2.y - (p3.y - p1.y) / 6)},${n(p2.x)},${n(p2.y)}`
  }

  return d
}

/** All contours of a family as separate pen paths, each with its own draw delay. */
function lines(f: Family, color: string, gap: number): string {
  let out = ''

  for (let s = 0; s < f.count; s += 1) {
    out += `<path class="ln" pathLength="1" style="animation-delay:-${n(s * gap)}s" d="${smooth(contour(f, s))}" stroke="${color}"/>`
  }

  return out
}

/** The sand: everything inside one contour, closed back along the window edge. */
function sand(f: Family, s: number, id: string): string {
  return `<clipPath id="${id}"><path d="${smooth(contour(f, s))}L${f.cx},${f.cy}z"/></clipPath>`
}

const MOTION = `
.ln{fill:none;stroke-width:1.4;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:1;animation:draw 36s ease-in-out infinite}
@keyframes draw{0%{stroke-dashoffset:1}26%{stroke-dashoffset:0}72%{stroke-dashoffset:0}98%{stroke-dashoffset:-1}100%{stroke-dashoffset:-1}}
.hatch{animation:hatch 36s ease-in-out infinite;animation-delay:-9s}
@keyframes hatch{0%{opacity:0}30%{opacity:1}68%{opacity:1}92%{opacity:0}100%{opacity:0}}
.spin{transform-box:fill-box;transform-origin:center;animation:spin 60s linear infinite}
.back{animation-direction:reverse;animation-duration:48s}
.slow{animation-duration:56s}
@keyframes spin{to{transform:rotate(360deg)}}
.ping{transform-box:fill-box;transform-origin:center;opacity:0;animation:ping 10s ease-out infinite}
@keyframes ping{0%{transform:scale(.8);opacity:0}20%{opacity:.55}100%{transform:scale(1.3);opacity:0}}
.blink{animation:blink 14s ease-in-out infinite}
@keyframes blink{0%,100%{opacity:1}50%{opacity:.3}}
`

/** Diagonal hatch strokes as one path, clipped to the sand by the caller. */
function hatching(x0: number, x1: number, y: number, rise: number, gap: number, flip: boolean): string {
  let d = ''

  for (let x = x0; x <= x1; x += gap) {
    d += flip ? `M${n(x)},${n(y)}l${n(rise)},${n(-rise)}` : `M${n(x)},${n(y)}l${n(rise)},${n(rise)}`
  }

  return d
}

function buoy(inks: Inks): string {
  const { x, y } = BUOY
  const ring = (r: number, extra: string): string => `<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="${inks.line}" stroke-width="1.3" ${extra}/>`

  return (
    ring(86, `class="ping" stroke-dasharray="1 5"`) +
    ring(16, '') +
    ring(32, `class="spin" stroke-dasharray="3 7"`) +
    ring(50, `class="spin back" stroke-dasharray="14 9"`) +
    ring(70, `class="spin slow" stroke-dasharray="2 8"`) +
    `<circle cx="${x}" cy="${y}" r="3.4" fill="${inks.mark}"/>` +
    `<circle class="blink" cx="${x + 92}" cy="${y + 94}" r="2.6" fill="${inks.mark}"/>` +
    `<circle cx="${x - 92}" cy="${y - 52}" r="2.2" fill="${inks.line}"/>` +
    `<circle cx="${x + 62}" cy="${y - 84}" r="1.8" fill="${inks.line}"/>`
  )
}

function art(inks: Inks): string {
  const defs = sand(LEFT, 3, 'sandL') + sand(RIGHT, 2, 'sandR')

  const left = pin(
    'bl',
    `<path class="hatch" clip-path="url(#sandL)" d="${hatching(-520, 260, 1000, 520, 9.5, true)}" stroke="${inks.hatch}" stroke-width="1" fill="none"/>` +
      lines(LEFT, inks.line, 0.9),
  )
  const right = pin(
    'r',
    `<path class="hatch" clip-path="url(#sandR)" d="${hatching(1200, 1600, 960, 440, 8.5, true)}" stroke="${inks.hatch}" stroke-width="1" fill="none"/>` +
      lines(RIGHT, inks.line, 1.1),
  )
  const mark = pin('tr', buoy(inks))

  return doc({ style: MOTION, defs, ground: inks.paper, layers: [left, right, mark] })
}

const GLASS_DAY = { blur: 5, tint: '#f3efe3', opacity: 0.5 }
const GLASS_NIGHT = { blur: 6, tint: '#111a2d', opacity: 0.55 }

export const plotterTide: ThemeDef = {
  id: 'plotter-tide',
  title: 'Plotter Tide',
  mode: 'light',
  blurb: 'Pen-plotter tide lines drawing themselves on warm paper.',
  alt: 'A pen-plotter tide chart on warm paper: thin gray contour lines draw themselves in from the bottom-left corner and the right edge over tan hatched sand, while dashed rings of a buoy turn slowly near the top-right.',
  palette: {
    surface0: '#f3efe3',
    surface1: '#f8f5ec',
    surface2: '#fcfaf4',
    textPrimary: '#232321',
    textSecondary: '#4a4945',
    textMuted: '#625f57',
    accent: '#b4532a',
    danger: '#b3372d',
    success: '#4a7a3b',
    warning: '#a06c10',
    pro: '#3f6190',
  },
  glass: GLASS_DAY,
  art: () => art({ paper: '#f3efe3', line: '#3a3a3a', hatch: '#e2cdb0', mark: '#b4532a' }),
}

export const plotterTideNight: ThemeDef = {
  id: 'plotter-tide-night',
  title: 'Plotter Tide, Night',
  mode: 'dark',
  blurb: "The plotter's tide chart in pale ink on blue-black night paper.",
  alt: 'A pen-plotter tide chart on blue-black paper: pale blue-gray contour lines draw themselves in from the bottom-left corner and the right edge over dim hatched sand, while dashed rings of a buoy turn slowly near the top-right.',
  palette: {
    surface0: '#111a2d',
    surface1: '#162038',
    surface2: '#1b2742',
    surface3: '#202d4a',
    textPrimary: '#e9eef8',
    textSecondary: '#c3cde1',
    textMuted: '#9aa9c6',
    accent: '#e8b86a',
    danger: '#ff7b72',
    success: '#6fcf8a',
    warning: '#f0b54a',
    pro: '#9fb0d0',
  },
  glass: GLASS_NIGHT,
  art: () => art({ paper: '#111a2d', line: '#9fb0d0', hatch: '#2c3a55', mark: '#e8b86a' }),
}
