// Builds every theme in hooks/scenes, checks it, and writes a gallery page.
//
//   node tools/preview.mjs <output folder> [theme ids...]
//
// For each theme it reports: the SVG size against the app's limit, whether the
// SVG parses as XML, and every color problem makeColors finds. A line starting
// "BLOCK" means the desktop app would refuse the theme. Open gallery.html in a
// browser to watch every scene move, at desktop and phone sizes.

import { execFileSync } from 'node:child_process'
import { mkdirSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const hooks = resolve(here, '../hooks')
const out = resolve(process.argv[2] ?? join(here, 'out'))
const only = process.argv.slice(3).filter(arg => !arg.startsWith('--'))
const MAX = 131072

const { colorsOf, blockingProblem } = await import(pathToFileURL(join(hooks, 'colors.ts')).href)

const themes = []

for (const file of readdirSync(join(hooks, 'scenes')).filter(f => f.endsWith('.ts')).sort()) {
  const mod = await import(pathToFileURL(join(hooks, 'scenes', file)).href)

  for (const value of Object.values(mod)) {
    if (value && typeof value === 'object' && typeof value.art === 'function' && typeof value.id === 'string') {
      if (only.length === 0 || only.includes(value.id)) themes.push({ def: value, file })
    }
  }
}

mkdirSync(out, { recursive: true })
let failed = false
const rows = []

for (const { def, file } of themes) {
  const notes = []
  let svg = ''

  try {
    svg = def.art()
  } catch (error) {
    notes.push(`BLOCK art() threw: ${error.message}`)
  }
  writeFileSync(join(out, `${def.id}.svg`), svg)

  if (svg.length > MAX) notes.push(`BLOCK svg is ${svg.length} chars, over the ${MAX} limit`)
  if (/<script|\son[a-z]+=/i.test(svg)) notes.push('BLOCK svg holds script or an event attribute')

  try {
    const { problems } = colorsOf(def)
    const block = blockingProblem(problems)

    if (block) notes.push(`BLOCK ${block}`)
    for (const line of problems) if (line !== block) notes.push(`note ${line}`)
  } catch (error) {
    notes.push(`BLOCK makeColors threw: ${error.message}`)
  }
  rows.push({ def, file, size: svg.length, notes, svg })
}

// XML check with Python's parser, so a broken tag shows here and not as a blank window.
const parse = `
import sys, xml.etree.ElementTree as E
for f in sys.argv[1:]:
    try:
        E.parse(f); print('ok', f)
    except Exception as e:
        print('bad', f, e)
`
const files = rows.map(r => join(out, `${r.def.id}.svg`))
const verdicts = execFileSync('python', ['-c', parse, ...files], { encoding: 'utf8' }).trim().split('\n')

verdicts.forEach((line, index) => {
  if (line.startsWith('bad')) rows[index]?.notes.unshift(`BLOCK svg is not valid XML: ${line.slice(4 + (files[index]?.length ?? 0))}`)
})

for (const row of rows) {
  const blocked = row.notes.some(note => note.startsWith('BLOCK'))

  if (blocked) failed = true
  // Contrast notes sit under the design system's own bar and still paint, so
  // they are counted, not listed. --notes lists them.
  const minor = row.notes.filter(note => note.startsWith('note'))
  console.log(
    `${blocked ? 'FAIL' : 'ok  '} ${row.def.id.padEnd(20)} ${row.def.mode.padEnd(5)} ${(row.size / 1024).toFixed(1).padStart(6)} KB  ${String(minor.length).padStart(2)} contrast notes  (${row.file})`,
  )
  for (const note of row.notes) if (note.startsWith('BLOCK') || process.argv.includes('--notes')) console.log(`       ${note}`)
}

// The gallery: each scene at a desktop size with a mock chat column under the
// theme's own glass and text colors, and at a phone size to check the pins.
const frame = svg => {
  const page = `<!doctype html><html><body style="margin:0;height:100vh;overflow:hidden">${svg}</body></html>`

  return `<iframe srcdoc="${page.replace(/&/g, '&amp;').replace(/"/g, '&quot;')}"></iframe>`
}

const card = ({ def, size, notes, svg }) => {
  const p = def.palette
  const g = def.glass
  const sw = Object.entries(p)
    .map(([k, v]) => `<span title="${k} ${v}" style="background:${v}"></span>`)
    .join('')

  return `<section>
<h2>${def.title} <em>${def.mode}</em> <code>/custom-theme ${def.id}</code> <small>${(size / 1024).toFixed(1)} KB</small></h2>
<p>${def.blurb}</p>
<div class="row">
  <div class="desk">${frame(svg)}
    <div class="chat" style="background:${g.tint}${Math.round(g.opacity * 255).toString(16).padStart(2, '0')};backdrop-filter:blur(${g.blur}px);color:${p.textPrimary}">
      <b>You</b><p style="color:${p.textSecondary}">Can you check the build?</p>
      <b style="color:${p.accent}">Claude</b><p>The build passed. <span style="color:${p.success}">12 tests ok</span>, <span style="color:${p.danger}">0 failed</span>.</p>
      <p style="color:${p.textMuted}">muted note text</p>
      <div class="box" style="background:${p.surface1};border-color:${p.surface2}">Reply...</div>
    </div>
  </div>
  ${process.argv.includes('--desk') ? '' : `<div class="phone">${frame(svg)}</div>`}
</div>
<div class="sw">${sw}</div>
${notes.length ? `<pre>${notes.join('\n').replace(/</g, '&lt;')}</pre>` : ''}
</section>`
}

writeFileSync(
  join(out, 'gallery.html'),
  `<!doctype html><meta charset="utf-8"><title>custom-theme gallery</title>
<style>
body{background:#111;color:#ddd;font:14px system-ui;margin:24px}
section{margin:0 0 36px}h2{font-size:17px;margin:0 0 4px}h2 em{color:#999;font-weight:400}h2 code{color:#9cf;margin-left:8px}h2 small{color:#777}
p{margin:2px 0 8px}.row{display:flex;gap:16px;align-items:flex-start;flex-wrap:wrap}
iframe{border:0;width:100%;height:100%;display:block}
.desk{position:relative;width:640px;height:400px;border-radius:10px;overflow:hidden;box-shadow:0 0 0 1px #333}
.phone{width:180px;height:390px;border-radius:18px;overflow:hidden;box-shadow:0 0 0 1px #333}
.chat{position:absolute;left:22%;right:22%;top:8%;bottom:6%;border-radius:10px;padding:14px 18px;font-size:13px}
.chat p{margin:2px 0 10px}.box{position:absolute;left:14px;right:14px;bottom:12px;border:1px solid;border-radius:8px;padding:8px}
.sw span{display:inline-block;width:18px;height:18px;margin-right:2px;border:1px solid #0006}
pre{white-space:pre-wrap;color:#f99;font-size:12px}
${process.argv.includes('--desk') ? 'body{margin:4px}h1,p,.sw,pre,.chat{display:none}h2{font-size:11px;margin:0}.desk{width:460px;height:215px}section{margin:0 0 4px}' : ''}
</style>
<h1>custom-theme: ${rows.length} themes</h1>
${rows.map(card).join('\n')}`,
)

console.log(`\nGallery: ${join(out, 'gallery.html')}`)
process.exit(failed ? 1 : 0)
