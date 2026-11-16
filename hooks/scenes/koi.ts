// Koi Mosaic (light): a koi pond seen from above, built from square mosaic
// tiles. Two koi circle slowly, lily pads bob, and a faint ripple ring of tiles
// expands and fades near the top-left.

import { bleed, cells, doc, pin, pixels, rng } from '../kit.ts'
import type { ThemeDef } from '../kit.ts'

type Pt = { x: number; y: number }
type Blob = { r: number; off: number; rad: number; ch: string }

const KW = 19
const KH = 34

/** Where the spine of the koi sits on row t (0 head .. 1 tail): a gentle S. */
function spine(t: number): number {
  return (KW - 1) / 2 + 3.2 * Math.sin(t * 5.6) * Math.min(1, 0.35 + t * 1.2)
}

/** Half the body width on row t. */
function girth(t: number): number {
  if (t < 0.12) return 1.2 + t * 7
  if (t < 0.5) return 2 + ((t - 0.12) / 0.38) * 0.7
  if (t < 0.8) return 2.7 - ((t - 0.5) / 0.3) * 1.7

  return 1
}

/**
 * One koi as rows of characters: the body once, and two tail frames so the
 * tail can wag. Patches (blobs) are measured from the spine so they follow the curve.
 */
function koi(base: string, blobs: readonly Blob[]): { body: string[]; tailA: string[]; tailB: string[] } {
  const blank = () => Array.from({ length: KH }, () => Array.from({ length: KW }, () => '.'))
  const body = blank()
  const tailA = blank()
  const tailB = blank()

  for (let r = 0; r < KH; r += 1) {
    const t = r / (KH - 1)
    const cx = spine(t)

    if (t <= 0.84) {
      const hw = girth(t)

      for (let c = 0; c < KW; c += 1) {
        const d = c - cx

        if (Math.abs(d) > hw) continue
        let ch = base

        for (const b of blobs) {
          if (Math.hypot((r - b.r) * 0.8, d - b.off) < b.rad) ch = b.ch
        }
        if (r === 3 && Math.abs(Math.abs(d) - (hw - 0.7)) < 0.6) ch = 'e'
        body[r]![c] = ch
      }
      // Pectoral fins sit beside the body; they flick between the two frames.
      const left = Math.round(cx - hw - 1)
      const right = Math.round(cx + hw + 1)

      if (r === 7 || r === 8) {
        for (const c of [left, right]) if (c >= 0 && c < KW) tailA[r]![c] = 'f'
      }
      if (r === 8 || r === 9) {
        for (const c of [left, right]) if (c >= 0 && c < KW) tailB[r]![c] = 'f'
      }
    } else {
      const u = (t - 0.84) / 0.16
      const fw = 0.8 + 3.4 * Math.pow(u, 0.8)

      for (const [grid, sign] of [
        [tailA, 1],
        [tailB, -1],
      ] as const) {
        const ct = cx + sign * 1.6 * u

        for (let c = 0; c < KW; c += 1) {
          if (Math.abs(c - ct) <= fw) grid[r]![c] = 'f'
        }
      }
    }
  }

  return { body: body.map((row) => row.join('')), tailA: tailA.map((row) => row.join('')), tailB: tailB.map((row) => row.join('')) }
}

const KOI_WHITE = koi('w', [
  { r: 3, off: 0, rad: 1.5, ch: 'o' },
  { r: 8, off: -1, rad: 2.2, ch: 'k' },
  { r: 14, off: 1, rad: 3, ch: 'o' },
  { r: 21, off: -0.5, rad: 2, ch: 'k' },
  { r: 25, off: 0.8, rad: 1.6, ch: 'o' },
])
const KOI_ORANGE = koi('o', [
  { r: 5, off: 1, rad: 1.3, ch: 'k' },
  { r: 10, off: 0.5, rad: 3, ch: 'w' },
  { r: 16, off: -1, rad: 2, ch: 'k' },
  { r: 22, off: 0.5, rad: 2.4, ch: 'w' },
])

const INK_WHITE = { w: '#fbf8f0', o: '#f2782a', k: '#262630', e: '#1a1a22', f: '#f1efe6' }
const INK_ORANGE = { w: '#fbf8f0', o: '#ee6a22', k: '#262630', e: '#1a1a22', f: '#f6a36a' }

/** A koi with its shadow, drawn with its top-left at (x, y). */
function swimmer(shape: { body: string[]; tailA: string[]; tailB: string[] }, ink: Record<string, string>, x: number, y: number, cell: number): string {
  const flat = { w: '#2a7480', o: '#2a7480', k: '#2a7480', e: '#2a7480', f: '#2a7480' }

  return (
    `<g opacity=".2">${pixels(shape.body, flat, x + 8, y + 12, cell)}${pixels(shape.tailA, flat, x + 8, y + 12, cell)}</g>` +
    pixels(shape.tailA, ink, x, y, cell, 'class="wa"') +
    pixels(shape.tailB, ink, x, y, cell, 'class="wb"') +
    pixels(shape.body, ink, x, y, cell)
  )
}

/** Mosaic tiles with a hairline of grout between them. */
function tiles(points: readonly Pt[], cell: number, color: string, attrs = ''): string {
  return cells(
    points.map((p) => ({ x: p.x + 1, y: p.y + 1 })),
    cell - 2,
    color,
    attrs,
  )
}

/** A round pad of tiles, with an optional pie-slice notch. */
function pad(cx: number, cy: number, r: number, cell: number, notch: number | null, seed: number, delay: number): string {
  const random = rng(seed)
  const x0 = Math.round(cx / cell) * cell
  const y0 = Math.round(cy / cell) * cell
  const edge: Pt[] = []
  const mid: Pt[] = []
  const vein: Pt[] = []
  const reach = Math.ceil(r / cell)

  for (let gy = -reach; gy <= reach; gy += 1) {
    for (let gx = -reach; gx <= reach; gx += 1) {
      const d = Math.hypot(gx * cell, gy * cell)

      if (d > r) continue
      if (notch !== null && d > cell) {
        const a = (Math.atan2(gy, gx) * 180) / Math.PI
        const diff = Math.abs(((a - notch + 540) % 360) - 180)

        if (diff < 20) continue
      }
      const p = { x: x0 + gx * cell, y: y0 + gy * cell }

      if (d > r - cell) edge.push(p)
      else if (random() < 0.2) vein.push(p)
      else mid.push(p)
    }
  }

  return (
    `<g class="pad" style="animation-delay:${delay}s">` +
    tiles(edge, cell, '#4c9658') +
    tiles(mid, cell, '#68b865') +
    tiles(vein, cell, '#82cc77') +
    `</g>`
  )
}

const BLOOM = ['..a..', '.aaa.', 'aabaa', '.aaa.', '..a..']

function bloom(x: number, y: number): string {
  return pixels(BLOOM, { a: '#f58bb5', b: '#ffd45c' }, x, y, 8, 'class="pad"')
}

/** A ring of tiles around (cx, cy). */
function ring(cx: number, cy: number, radius: number, cell: number): Pt[] {
  const out: Pt[] = []
  const reach = Math.ceil(radius / cell) + 1

  for (let gy = -reach; gy <= reach; gy += 1) {
    for (let gx = -reach; gx <= reach; gx += 1) {
      if (Math.abs(Math.hypot(gx * cell, gy * cell) - radius) < cell * 0.6) out.push({ x: cx + gx * cell, y: cy + gy * cell })
    }
  }

  return out
}

const MOTION = `
.wa{animation:wa 1.4s steps(1) infinite}
.wb{animation:wb 1.4s steps(1) infinite}
@keyframes wa{0%{opacity:1}50%{opacity:0}}
@keyframes wb{0%{opacity:0}50%{opacity:1}}
.orbL{transform-origin:300px 540px;animation:cw 84s linear infinite}
.orbR{transform-origin:1300px 520px;animation:ccw 96s linear infinite}
@keyframes cw{to{transform:rotate(360deg)}}
@keyframes ccw{to{transform:rotate(-360deg)}}
.pad{transform-box:fill-box;transform-origin:center;animation:bob 11s ease-in-out infinite}
@keyframes bob{0%,100%{transform:translate(0,0) rotate(0deg)}50%{transform:translate(3px,-4px) rotate(2deg)}}
.rip{transform-box:fill-box;transform-origin:center;opacity:0;animation:rip 15s ease-out infinite}
@keyframes rip{0%{transform:scale(.4);opacity:0}12%{opacity:.55}100%{transform:scale(2);opacity:0}}
.tw-a{animation:tw 7s ease-in-out infinite}
.tw-b{animation:tw 7s ease-in-out -3.5s infinite}
@keyframes tw{0%,100%{opacity:.35}50%{opacity:1}}
`

function koiArt(): string {
  const defs =
    `<radialGradient id="pond" cx=".48" cy=".44" r=".78">` +
    `<stop offset="0" stop-color="#cdeae2"/><stop offset=".5" stop-color="#abd8d1"/><stop offset="1" stop-color="#63a9b4"/>` +
    `</radialGradient>` +
    `<radialGradient id="deepbr" cx="1" cy="1" r=".62">` +
    `<stop offset="0" stop-color="#2a7a98" stop-opacity=".75"/><stop offset="1" stop-color="#2a7a98" stop-opacity="0"/>` +
    `</radialGradient>` +
    `<radialGradient id="deeptl" cx="0" cy="0" r=".5">` +
    `<stop offset="0" stop-color="#4f9fb0" stop-opacity=".4"/><stop offset="1" stop-color="#4f9fb0" stop-opacity="0"/>` +
    `</radialGradient>` +
    `<pattern id="grid" width="28" height="28" patternUnits="userSpaceOnUse">` +
    `<path d="M28 0H0V28" fill="none" stroke="#ffffff" stroke-opacity=".16" stroke-width="2"/></pattern>`

  // Faint tile shimmer: lighter tiles twinkle, darker ones gather toward the corners.
  const random = rng(31)
  const light: Pt[] = []
  const lightB: Pt[] = []
  const dark: Pt[] = []

  for (let gy = 0; gy < 36; gy += 1) {
    for (let gx = 0; gx < 58; gx += 1) {
      const x = gx * 28
      const y = gy * 28
      const far = Math.min(1, Math.hypot(gx / 58 - 0.48, gy / 36 - 0.44) * 1.3)

      if (random() < 0.08) (random() < 0.5 ? light : lightB).push({ x: x + 1, y: y + 1 })
      else if (random() < 0.22 * far) dark.push({ x: x + 1, y: y + 1 })
    }
  }

  const water = bleed(
    `<rect width="1600" height="1000" fill="url(#pond)"/>` +
      `<rect width="1600" height="1000" fill="url(#deepbr)"/>` +
      `<rect width="1600" height="1000" fill="url(#deeptl)"/>` +
      `<rect width="1600" height="1000" fill="url(#grid)"/>` +
      cells(dark, 26, '#2a7f90', 'opacity=".07"') +
      cells(light, 26, '#ffffff', 'opacity=".07" class="tw-a"') +
      cells(lightB, 26, '#ffffff', 'opacity=".07" class="tw-b"'),
  )

  const ripples = pin(
    'tl',
    [0, -5, -10]
      .map((d) => `<g class="rip" style="animation-delay:${d}s">${tiles(ring(280, 224, 100, 14), 14, '#ffffff')}</g>`)
      .join(''),
  )

  const padsBr = pin(
    'br',
    pad(1400, 840, 70, 14, 30, 3, 0) +
      pad(1288, 934, 48, 14, 200, 5, -3) +
      pad(1512, 700, 42, 14, 120, 7, -6) +
      bloom(1396, 836) +
      bloom(1508, 696),
  )
  const padsBl = pin('bl', pad(154, 882, 56, 14, 300, 9, -2) + pad(266, 952, 36, 14, null, 13, -5) + bloom(150, 878))
  const padsTr = pin('tr', pad(1452, 154, 50, 14, 80, 17, -4))

  const left = pin(
    'l',
    `<g class="orbL">${swimmer(KOI_WHITE, INK_WHITE, 190 - (KW * 10) / 2, 540 - (KH * 10) / 2, 10)}</g>`,
  )
  const right = pin(
    'r',
    `<g class="orbR">${swimmer(KOI_ORANGE, INK_ORANGE, 1410 - (KW * 10) / 2, 520 - (KH * 10) / 2, 10)}</g>`,
  )

  return doc({ style: MOTION, defs, ground: '#c4e4dc', layers: [water, ripples, padsBr, padsBl, padsTr, left, right] })
}

export const koiMosaic: ThemeDef = {
  id: 'koi-mosaic',
  title: 'Koi Mosaic',
  mode: 'light',
  blurb: 'A tiled koi pond from above: two koi, lily pads, slow ripples.',
  alt: 'A mint-teal koi pond seen from above, built from square mosaic tiles, with a white koi and an orange koi circling slowly, green lily pads with pink flowers, and a faint ripple.',
  palette: {
    surface0: '#d6ece6',
    surface1: '#e1f2ee',
    surface2: '#ecf8f5',
    textPrimary: '#0d3535',
    textSecondary: '#244d4b',
    textMuted: '#3b6360',
    accent: '#d2551f',
    danger: '#c0392f',
    success: '#2f8a4f',
    warning: '#a86f10',
    pro: '#b83d76',
  },
  glass: { blur: 8, tint: '#d6ece6', opacity: 0.55 },
  art: koiArt,
}
