// Deep Water (dark): soft light falling through deep water, a hazy seabed, and
// one quiet turtle gliding on the right. Smooth shapes, no pixels.

import { bleed, doc, glow, pin, rng, vgrad } from '../kit.ts'
import type { ThemeDef } from '../kit.ts'
import { n } from '../kit.ts'

/** A long slanted shaft of light, widening as it falls. */
function shaft(x: number, w: number, drift: number, cls: string): string {
  const h = 960

  return `<polygon class="${cls}" fill="url(#shaft)" points="${x},-40 ${x + w},-40 ${n(x + w + drift + w * 1.2)},${h} ${x + drift},${h}"/>`
}

/** Drifting orbs of light that rise slowly and fade. */
function orbs(): string {
  const random = rng(77)
  let out = ''

  for (let i = 0; i < 16; i += 1) {
    const r = 5 + random() * 14
    const x = 60 + random() * 1480
    const y = 250 + random() * 750
    const dur = 40 + random() * 34
    const delay = -random() * dur

    out += `<circle class="orb" cx="${n(x)}" cy="${n(y)}" r="${n(r)}" fill="url(#orb)" style="animation-duration:${n(dur)}s;animation-delay:${n(delay)}s"/>`
  }

  return out
}

/** The turtle from above, head up, drawn around (0, 0). Soft edges come from a faint wide stroke. */
function turtle(): string {
  const body = '#10202e'
  const halo = `stroke="${body}" stroke-opacity=".22" stroke-width="12" stroke-linejoin="round"`

  const flipper = (x: number, y: number, a: number, rx: number, ry: number, cls: string): string =>
    `<g transform="translate(${x},${y}) rotate(${a})"><ellipse class="${cls}" cx="0" cy="${n(ry - 4)}" rx="${rx}" ry="${ry}" fill="${body}" ${halo}/></g>`

  return (
    `<g opacity=".62">` +
    flipper(-52, -44, 52, 12, 42, 'flapL') +
    flipper(52, -44, -52, 12, 42, 'flapR') +
    flipper(-34, 56, 30, 9, 24, 'flapR') +
    flipper(34, 56, -30, 9, 24, 'flapL') +
    `<path d="M-7,70 L0,102 L7,70Z" fill="${body}" ${halo}/>` +
    `<ellipse cx="0" cy="-84" rx="14" ry="16" fill="${body}" ${halo}/>` +
    `<ellipse cx="0" cy="-100" rx="17" ry="20" fill="${body}" ${halo}/>` +
    `<ellipse cx="0" cy="0" rx="58" ry="76" fill="${body}" ${halo}/>` +
    `</g>` +
    `<ellipse cx="0" cy="0" rx="58" ry="76" fill="none" stroke="#7fa3bb" stroke-opacity=".22" stroke-width="4"/>` +
    `<path d="M-24,-34 L0,-48 L24,-34 L28,6 L0,28 L-28,6Z M0,-48 V-76 M-24,-34 L-50,-24 M24,-34 L50,-24 M-28,6 L-52,22 M28,6 L52,22 M0,28 V70" ` +
    `fill="none" stroke="#7fa3bb" stroke-opacity=".2" stroke-width="3" stroke-linejoin="round"/>`
  )
}

const MOTION = `
.sway{transform-origin:800px -40px;animation:sway 30s ease-in-out infinite alternate}
@keyframes sway{from{transform:rotate(-2deg)}to{transform:rotate(2deg)}}
.pa{animation:pulse 11s ease-in-out infinite}
.pb{animation:pulse 14s ease-in-out -5s infinite}
.pc{animation:pulse 9s ease-in-out -2s infinite}
@keyframes pulse{0%,100%{opacity:.35}50%{opacity:.95}}
.orb{animation:rise 50s linear infinite;opacity:0}
@keyframes rise{0%{transform:translate(0,0);opacity:0}12%{opacity:.8}88%{opacity:.5}100%{transform:translate(30px,-760px);opacity:0}}
.haze{animation:haze 24s ease-in-out infinite alternate}
@keyframes haze{from{transform:translateX(-30px);opacity:.75}to{transform:translateX(30px);opacity:1}}
.glide{animation:glide 96s ease-in-out infinite}
@keyframes glide{0%{transform:translate(130px,185px);opacity:0}14%{opacity:1}86%{opacity:1}100%{transform:translate(-130px,-185px);opacity:0}}
.flapL{transform-box:fill-box;transform-origin:50% 0%;animation:flapL 7s ease-in-out infinite}
.flapR{transform-box:fill-box;transform-origin:50% 0%;animation:flapR 7s ease-in-out infinite}
@keyframes flapL{0%,100%{transform:rotate(-10deg)}50%{transform:rotate(12deg)}}
@keyframes flapR{0%,100%{transform:rotate(10deg)}50%{transform:rotate(-12deg)}}
`

function deepArt(): string {
  const defs =
    vgrad('sea', [
      [0, '#5f7f98'],
      [0.45, '#33506a'],
      [1, '#142231'],
    ]) +
    `<linearGradient id="shaft" x1="0" y1="0" x2="0" y2="1">` +
    `<stop offset="0" stop-color="#dff0fb" stop-opacity=".4"/><stop offset=".6" stop-color="#cfe6f5" stop-opacity=".1"/><stop offset="1" stop-color="#cfe6f5" stop-opacity="0"/>` +
    `</linearGradient>` +
    `<linearGradient id="haze" x1="0" y1="0" x2="0" y2="1">` +
    `<stop offset="0" stop-color="#7d9db4" stop-opacity="0"/><stop offset=".5" stop-color="#7d9db4" stop-opacity=".26"/><stop offset="1" stop-color="#7d9db4" stop-opacity="0"/>` +
    `</linearGradient>` +
    `<radialGradient id="vig" cx=".5" cy=".45" r=".78">` +
    `<stop offset=".55" stop-color="#0a1420" stop-opacity="0"/><stop offset="1" stop-color="#0a1420" stop-opacity=".5"/>` +
    `</radialGradient>` +
    glow('orb', '#cfe6f5', 0.9)

  const sea = bleed(
    `<rect width="1600" height="1000" fill="url(#sea)"/>` +
      `<g class="haze"><rect x="-100" y="690" width="1800" height="260" fill="url(#haze)"/></g>` +
      `<path d="M0,962 C300,918 600,952 900,930 C1200,908 1450,950 1600,934 V1000 H0Z" fill="#0b1520" opacity=".7"/>`,
  )

  const shade = pin('r', `<g class="glide"><g transform="translate(1330,520) rotate(-35) scale(1.15)">${turtle()}</g></g>`)

  const light = bleed(
    `<g class="sway">` +
      shaft(200, 70, 260, 'pa') +
      shaft(560, 110, 300, 'pb') +
      shaft(900, 60, 240, 'pc') +
      shaft(1180, 120, 320, 'pa') +
      shaft(1480, 80, 260, 'pb') +
      `</g>` +
      orbs() +
      `<rect width="1600" height="1000" fill="url(#vig)"/>`,
  )

  return doc({ style: MOTION, defs, ground: '#33506a', layers: [sea, shade, light] })
}

export const deepWater: ThemeDef = {
  id: 'deep-water',
  title: 'Deep Water',
  mode: 'dark',
  blurb: 'Light falling through deep water, and one quiet turtle.',
  alt: 'Deep blue-gray water, lighter at the top, with soft slanted shafts of light, drifting glowing particles, a hazy seabed and one dim turtle gliding slowly on the right.',
  palette: {
    surface0: '#101c29',
    surface1: '#142231',
    surface2: '#182939',
    surface3: '#1b2d3d',
    textPrimary: '#e8f0f7',
    textSecondary: '#c0cfdc',
    textMuted: '#93a8ba',
    accent: '#7fb6d6',
    danger: '#ff7a85',
    success: '#6fcf97',
    warning: '#e6b455',
    pro: '#9fb4e8',
  },
  glass: { blur: 8, tint: '#101c29', opacity: 0.5 },
  art: deepArt,
}
