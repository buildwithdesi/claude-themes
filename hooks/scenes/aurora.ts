// Aurora: northern lights over a dark ridge. Four soft curtains sway,
// skew and breathe at their own slow pace over a night-blue sky with a few
// faint stars and two layers of mountains along the bottom.

import { bleed, dots, doc, n, rng, vgrad } from '../kit.ts'
import type { ThemeDef } from '../kit.ts'

/** A curtain: a wavy ribbon wider than the window, fading out toward its lower edge. */
function band(y0: number, amp: number, height: number, phase: number, fill: string, cls: string): string {
  const xs: number[] = []

  for (let x = -300; x <= 1900; x += 220) xs.push(x)
  const top = xs.map((_, i) => y0 + amp * Math.sin(i * 1.1 + phase))
  const bottom = xs.map((_, i) => (top[i] ?? y0) + height + amp * 0.4 * Math.cos(i * 0.9 + phase))
  let d = `M${xs[0]},${n(top[0] ?? y0)}`

  for (let i = 0; i < xs.length - 1; i += 1) {
    const mid = ((xs[i] ?? 0) + (xs[i + 1] ?? 0)) / 2

    d += `C${mid},${n(top[i] ?? y0)} ${mid},${n(top[i + 1] ?? y0)} ${xs[i + 1]},${n(top[i + 1] ?? y0)}`
  }
  d += `L${xs[xs.length - 1]},${n(bottom[bottom.length - 1] ?? y0)}`
  for (let i = xs.length - 1; i > 0; i -= 1) {
    const mid = ((xs[i] ?? 0) + (xs[i - 1] ?? 0)) / 2

    d += `C${mid},${n(bottom[i] ?? y0)} ${mid},${n(bottom[i - 1] ?? y0)} ${xs[i - 1]},${n(bottom[i - 1] ?? y0)}`
  }

  return `<g class="band ${cls}"><path d="${d}Z" fill="url(#${fill})"/></g>`
}

/** A curtain gradient: bright along the top edge, clear at the bottom. */
function curtain(id: string, color: string): string {
  return (
    `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">` +
    `<stop offset="0%" stop-color="${color}" stop-opacity=".85"/>` +
    `<stop offset="35%" stop-color="${color}" stop-opacity=".42"/>` +
    `<stop offset="100%" stop-color="${color}" stop-opacity="0"/></linearGradient>`
  )
}

/** A jagged ridge, filled down past the bottom of the canvas. */
function ridge(seed: number, base: number, amp: number, shift: number, fill: string): string {
  const r = rng(seed)
  let d = ''

  for (let x = -50; x <= 1650; x += 34) {
    const peak = 0.5 * Math.abs(Math.sin(x / 170 + shift)) + 0.3 * Math.abs(Math.sin(x / 61 + 2 * shift)) + 0.2 * r()

    d += `${d === '' ? 'M' : 'L'}${x},${n(base - amp * peak)}`
  }

  return `<path d="${d}L1650,1100L-50,1100Z" fill="${fill}"/>`
}

function stars(): string {
  const r = rng(3)
  const still = []
  const twinkleA = []
  const twinkleB = []

  for (let i = 0; i < 70; i += 1) {
    const p = { x: r() * 1600, y: r() * 620, r: 0.7 + r() * 1.3 }

    if (i % 7 === 0) twinkleA.push(p)
    else if (i % 7 === 3) twinkleB.push(p)
    else still.push(p)
  }

  return (
    dots(still, '#cfd2ff', 'opacity=".55"') +
    dots(twinkleA, '#ffffff', 'class="tw a"') +
    dots(twinkleB, '#dfe2ff', 'class="tw b"')
  )
}

const MOTION = `
.band{transform-box:fill-box;transform-origin:50% 0%;animation-timing-function:ease-in-out;animation-iteration-count:infinite;animation-direction:alternate}
.b1{animation-name:sway1;animation-duration:17s}
.b2{animation-name:sway2;animation-duration:23s;animation-delay:-6s}
.b3{animation-name:sway3;animation-duration:13s;animation-delay:-4s}
.b4{animation-name:sway4;animation-duration:25s;animation-delay:-11s}
@keyframes sway1{from{transform:translateX(-45px) skewX(-2deg) scaleY(.94);opacity:.6}to{transform:translateX(45px) skewX(2.5deg) scaleY(1.08);opacity:.95}}
@keyframes sway2{from{transform:translateX(40px) skewX(2deg) scaleY(1.05);opacity:.9}to{transform:translateX(-50px) skewX(-3deg) scaleY(.92);opacity:.55}}
@keyframes sway3{from{transform:translateX(-30px) skewX(1.5deg) scaleY(.96);opacity:.55}to{transform:translateX(35px) skewX(-2deg) scaleY(1.1);opacity:.9}}
@keyframes sway4{from{transform:translateX(35px) skewX(-1.5deg) scaleY(1.06);opacity:.5}to{transform:translateX(-35px) skewX(2deg) scaleY(.9);opacity:.8}}
.tw{animation:twinkle 7s ease-in-out infinite alternate}
.tw.b{animation-duration:11s;animation-delay:-4s}
@keyframes twinkle{from{opacity:.2}to{opacity:1}}
`

function art(): string {
  const defs =
    vgrad('sky', [
      [0, '#0d0e29'],
      [1, '#15163a'],
    ]) +
    curtain('gGreen', '#4fe39a') +
    curtain('gTeal', '#3cc7c2') +
    curtain('gViolet', '#8a5cff') +
    `<filter id="soft" x="-10%" y="-30%" width="120%" height="160%"><feGaussianBlur stdDeviation="24"/></filter>`

  const sky = bleed(`<rect width="1600" height="1000" fill="url(#sky)"/>${stars()}`)
  const lights = bleed(
    `<g filter="url(#soft)">` +
      band(120, 40, 250, 0.4, 'gViolet', 'b3') +
      band(180, 50, 300, 2.1, 'gTeal', 'b2') +
      band(250, 45, 280, 1.2, 'gGreen', 'b1') +
      band(330, 35, 200, 3.4, 'gGreen', 'b4') +
      `</g>`,
  )
  const mountains = bleed(ridge(17, 800, 170, 1.3, '#121436') + ridge(29, 900, 190, 4.1, '#08091b'))

  return doc({ style: MOTION, defs, ground: '#0d0e29', layers: [sky, lights, mountains] })
}

export const aurora: ThemeDef = {
  id: 'aurora',
  title: 'Aurora',
  mode: 'dark',
  blurb: 'Northern lights swaying over a dark ridge.',
  alt: 'A deep indigo night sky with faint stars and soft green, teal and violet northern lights that sway slowly above two dark mountain ridges.',
  palette: {
    surface0: '#0b0c24',
    surface1: '#101230',
    surface2: '#15173a',
    surface3: '#191b40',
    textPrimary: '#eceaf8',
    textSecondary: '#c9c7e0',
    textMuted: '#a3a1c4',
    accent: '#4fe39a',
    danger: '#ff6b7a',
    success: '#5fd68c',
    warning: '#f2c14e',
    pro: '#a283ff',
  },
  glass: { blur: 8, tint: '#0b0c24', opacity: 0.5 },
  art,
}
