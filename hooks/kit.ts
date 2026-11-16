// The drawing kit every scene shares.
//
// A scene is one SVG document drawn behind the chat. The app sizes it to the
// whole window, which can be a wide monitor or a tall phone. So the kit gives
// two kinds of layer:
//   bleed(...)  loose art (water, sky, paper grain) that may be cropped
//   pin(...)    a subject (a turtle, a sun) held in a corner, never cropped
// The middle of the window holds the conversation and the bottom holds the
// message box, so subjects live near the edges.

/** Which app mode a theme is made for. The app switches to it while the theme is on. */
export type Mode = 'light' | 'dark'

/**
 * The app's own colors for a theme: a few anchors that makeColors grows into
 * the ~100 colors the desktop app paints with.
 * In both modes surface0 is the darkest surface and each later one is the same
 * or lighter. textPrimary is the strongest text.
 */
export type Palette = {
  surface0: string
  surface1: string
  surface2: string
  surface3?: string
  textPrimary: string
  textSecondary: string
  textMuted: string
  accent: string
  danger: string
  success: string
  warning: string
  pro: string
}

/** The frosted veil the app lays over the scene, under its panels. */
export type Glass = { blur: number; tint: string; opacity: number }

/** One theme in the pack. */
export type ThemeDef = {
  /** The word typed after /custom-theme: lowercase, words joined by '-'. */
  id: string
  title: string
  mode: Mode
  /** One line for /custom-theme list. */
  blurb: string
  /** What the scene shows, for a screen reader. */
  alt: string
  palette: Palette
  glass: Glass
  /** Builds the SVG. Called once per session, then kept. */
  art: () => string
}

/** The longest SVG the app accepts. */
export const MAX_SVG = 131_072

/** A person who asked their computer for less motion gets a still scene. */
const CALM = '@media (prefers-reduced-motion: reduce){*{animation:none!important}}'

/** Rounds to one decimal so the SVG stays small. */
export function n(value: number): string {
  return String(Math.round(value * 10) / 10)
}

/**
 * A seeded random source. The same seed draws the same scene every time,
 * so a theme never shifts between sessions.
 */
export function rng(seed: number): () => number {
  let a = seed >>> 0

  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * The whole document. `ground` paints the full window first (a flat fill or a
 * gradient); `layers` go on top in order.
 */
export function doc(parts: { style: string; defs?: string; ground: string; layers: readonly string[] }): string {
  const defs = parts.defs === undefined || parts.defs === '' ? '' : `<defs>${parts.defs}</defs>`

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">` +
    `<style>${parts.style}${CALM}</style>${defs}` +
    `<rect width="100%" height="100%" fill="${parts.ground}"/>` +
    parts.layers.join('') +
    `</svg>`
  )
}

/** Loose art on a 1600 x 1000 canvas that fills the window and may be cropped at the sides or top. */
export function bleed(body: string, viewBox = '0 0 1600 1000'): string {
  return `<svg width="100%" height="100%" viewBox="${viewBox}" preserveAspectRatio="xMidYMid slice">${body}</svg>`
}

export type Corner = 'tl' | 't' | 'tr' | 'l' | 'c' | 'r' | 'bl' | 'b' | 'br'

const ALIGN: Record<Corner, string> = {
  tl: 'xMinYMin',
  t: 'xMidYMin',
  tr: 'xMaxYMin',
  l: 'xMinYMid',
  c: 'xMidYMid',
  r: 'xMaxYMid',
  bl: 'xMinYMax',
  b: 'xMidYMax',
  br: 'xMaxYMax',
}

/**
 * A subject held against one side of the window and never cropped.
 * Draw it on the same 1600 x 1000 canvas, near the matching corner: the canvas
 * shrinks to fit the window and slides to that corner.
 */
export function pin(corner: Corner, body: string, viewBox = '0 0 1600 1000'): string {
  return `<svg width="100%" height="100%" viewBox="${viewBox}" preserveAspectRatio="${ALIGN[corner]} meet">${body}</svg>`
}

/**
 * Pixel art from rows of characters. Each character is one square cell, and
 * `colors` maps a character to its fill. '.' and ' ' are empty.
 * Runs of one color merge into one rectangle, so a sprite costs little.
 *
 * @example pixels(['.aa.', 'abba'], { a: '#2a6', b: '#fd4' }, 100, 50, 8)
 */
export function pixels(
  rows: readonly string[],
  colors: Readonly<Record<string, string>>,
  x: number,
  y: number,
  cell: number,
  attrs = '',
): string {
  const paths = new Map<string, string>()

  rows.forEach((row, r) => {
    let c = 0

    while (c < row.length) {
      const ch = row[c] ?? '.'
      let end = c + 1

      while (end < row.length && row[end] === ch) end += 1

      if (ch !== '.' && ch !== ' ') {
        const fill = colors[ch]

        if (fill !== undefined) {
          const d = `M${n(x + c * cell)},${n(y + r * cell)}h${n((end - c) * cell)}v${n(cell)}h${n(-(end - c) * cell)}z`
          paths.set(fill, (paths.get(fill) ?? '') + d)
        }
      }
      c = end
    }
  })

  let out = ''

  for (const [fill, d] of paths) out += `<path fill="${fill}" d="${d}"/>`

  return attrs === '' ? out : `<g ${attrs}>${out}</g>`
}

/** Many circles as one path: halftone dots, stars, bubbles. */
export function dots(points: ReadonlyArray<{ x: number; y: number; r: number }>, fill: string, attrs = ''): string {
  let d = ''

  for (const { x, y, r } of points) {
    if (r <= 0.05) continue
    d += `M${n(x - r)},${n(y)}a${n(r)},${n(r)} 0 1,0 ${n(2 * r)},0a${n(r)},${n(r)} 0 1,0 ${n(-2 * r)},0`
  }

  return d === '' ? '' : `<path fill="${fill}" d="${d}"${attrs === '' ? '' : ` ${attrs}`}/>`
}

/**
 * Thousands of dots for little text: each dot is a zero-length line with a
 * round cap, about 12 characters instead of 50. Radii are rounded into `steps`
 * sizes, one path per size. Use it for halftone, star fields, braille.
 */
export function beads(points: ReadonlyArray<{ x: number; y: number; r: number }>, color: string, steps = 8, attrs = ''): string {
  let max = 0

  for (const p of points) max = Math.max(max, p.r)
  if (max <= 0) return ''
  const groups = new Map<number, string>()

  for (const { x, y, r } of points) {
    const level = Math.round((r / max) * steps)

    if (level <= 0) continue
    groups.set(level, (groups.get(level) ?? '') + `M${Math.round(x)},${Math.round(y)}h0`)
  }
  let out = ''

  for (const [level, d] of groups) {
    out += `<path d="${d}" stroke="${color}" stroke-width="${n(((2 * max) / steps) * level)}" stroke-linecap="round" fill="none"/>`
  }

  return attrs === '' ? out : `<g ${attrs}>${out}</g>`
}

/**
 * Thousands of same-size squares for little text: each is a short line as
 * thick as it is long. (x, y) is the square's top-left corner. Use it for
 * one-bit dither, snow, LED cells.
 */
export function cells(points: ReadonlyArray<{ x: number; y: number }>, size: number, color: string, attrs = ''): string {
  if (points.length === 0) return ''
  let d = ''

  for (const { x, y } of points) d += `M${n(x)},${n(y + size / 2)}h${n(size)}`

  return `<path d="${d}" stroke="${color}" stroke-width="${n(size)}" fill="none"${attrs === '' ? '' : ` ${attrs}`}/>`
}

/** Many squares as one path: dither, snow, LED cells. */
export function squares(points: ReadonlyArray<{ x: number; y: number; s: number }>, fill: string, attrs = ''): string {
  let d = ''

  for (const { x, y, s } of points) d += `M${n(x)},${n(y)}h${n(s)}v${n(s)}h${n(-s)}z`

  return d === '' ? '' : `<path fill="${fill}" d="${d}"${attrs === '' ? '' : ` ${attrs}`}/>`
}

/**
 * The points of a print screen: a grid `spacing` apart, turned `angle`
 * degrees, inside a box. Printers turn each ink's grid to a different angle
 * (15 and 45 are classic) so two inks do not clash. Pair it with beads():
 * give each point a radius from how dark that spot should be.
 */
export function screen(box: { x0: number; y0: number; x1: number; y1: number }, spacing: number, angle = 0): Array<{ x: number; y: number }> {
  const out: Array<{ x: number; y: number }> = []
  const cx = (box.x0 + box.x1) / 2
  const cy = (box.y0 + box.y1) / 2
  const reach = Math.hypot(box.x1 - box.x0, box.y1 - box.y0) / 2
  const cos = Math.cos((angle * Math.PI) / 180)
  const sin = Math.sin((angle * Math.PI) / 180)
  const steps = Math.ceil(reach / spacing)

  for (let j = -steps; j <= steps; j += 1) {
    for (let i = -steps; i <= steps; i += 1) {
      const x = cx + i * spacing * cos - j * spacing * sin
      const y = cy + i * spacing * sin + j * spacing * cos

      if (x >= box.x0 && x <= box.x1 && y >= box.y0 && y <= box.y1) out.push({ x, y })
    }
  }

  return out
}

/** A vertical gradient as a <linearGradient>, for `defs`. Stops are [offset 0..1, color]. */
export function vgrad(id: string, stops: ReadonlyArray<readonly [number, string]>): string {
  const s = stops.map(([o, c]) => `<stop offset="${n(o * 100)}%" stop-color="${c}"/>`).join('')

  return `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">${s}</linearGradient>`
}

/** A soft round glow as a <radialGradient>, for `defs`: `color` in the middle, clear at the edge. */
export function glow(id: string, color: string, strength = 1): string {
  return (
    `<radialGradient id="${id}">` +
    `<stop offset="0%" stop-color="${color}" stop-opacity="${n(strength)}"/>` +
    `<stop offset="100%" stop-color="${color}" stop-opacity="0"/>` +
    `</radialGradient>`
  )
}
