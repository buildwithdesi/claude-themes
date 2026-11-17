// custom-theme: 20 animated backgrounds for the Claude desktop app.
//
//   /custom-theme              what is on, and every theme
//   /custom-theme <name>       turn one on (part of a name works: "honu", "dunes night")
//   /custom-theme random       a surprise
//   /custom-theme next         step through the list
//   /custom-theme off          back to the app's own look
//
// The choice is saved, so the next session opens with it, and every session
// already open switches to it within a few seconds.

import type { EngineInterface, Register, ThemeSetArgs } from 'claude-code'

import { blockingProblem, colorsOf } from './colors.ts'
import type { ThemeDef } from './kit.ts'
import { THEMES } from './themes.ts'

const COMMAND = 'custom-theme'
// Every backdrop name this mod sets starts with this, so its drawing hook
// can tell its own backdrops from another mod's.
const PREFIX = 'ct_'
const STORE_KEY = 'theme'
const OFF = 'off'

// True while this mod's session.start runs. Another mod that sets its look
// at start (da-theme does) is not the person choosing it, so it does not
// switch this mod off.
let booting = false

// False until this mod's session.start has finished. WHY: the order mods
// start in is not fixed, so another mod's start look can land before this
// mod's start runs. Without this, that look saved "off" for every session.
let started = false

// How often an open session checks for a pick made in another session.
// WHY: the store is one file every session and account shares, but a session
// reads it only at start. Without this, open sessions keep an old theme.
const SYNC_MS = 3000

// The pick this session shows now, so the check acts only on a change.
let shown: string | undefined
let checking = false

// Built scenes are kept: switching back to one costs nothing.
const built = new Map<string, string>()

function artOf(def: ThemeDef): string {
  const ready = built.get(def.id)

  if (ready !== undefined) return ready
  const art = def.art()
  built.set(def.id, art)

  return art
}

/** A short stamp of the art. WHY: the app keeps a backdrop it already drew under the same name, so changed art needs a new name or the old picture stays. */
function stamp(art: string): string {
  let h = 0

  for (let index = 0; index < art.length; index += 1) h = (Math.imul(h, 31) + art.charCodeAt(index)) | 0

  return (h >>> 0).toString(36)
}

/** Finds a theme from what the person typed: the exact name, then the start of one, then any part. */
function find(words: string): { match?: ThemeDef; options: readonly ThemeDef[] } {
  const wanted = words.trim().toLowerCase().replace(/[\s_]+/g, '-')
  const exact = THEMES.find(def => def.id === wanted)

  if (exact !== undefined) return { match: exact, options: [exact] }
  const starts = THEMES.filter(def => def.id.startsWith(wanted))

  if (starts.length === 1) return { match: starts[0], options: starts }
  // "dunes night" should find dither-dunes-night: every word must appear.
  const parts = wanted.split('-').filter(part => part !== '')
  const loose = THEMES.filter(def => parts.every(part => def.id.includes(part) || def.title.toLowerCase().includes(part)))

  return loose.length === 1 ? { match: loose[0], options: loose } : { options: starts.length > 0 ? starts : loose }
}

function listing(current: string): string {
  const line = (def: ThemeDef) => `${def.id === current ? '>' : ' '} ${def.id.padEnd(20)} ${def.blurb}`
  const light = THEMES.filter(def => def.mode === 'light')
  const dark = THEMES.filter(def => def.mode === 'dark')

  return [
    `${THEMES.length} themes. Pick one with /${COMMAND} <name>, or try /${COMMAND} random.`,
    '',
    'Light:',
    ...light.map(line),
    '',
    'Dark:',
    ...dark.map(line),
    '',
    `/${COMMAND} next steps through them. /${COMMAND} off goes back to the app's own look.`,
  ].join('\n')
}

/** Colors and backdrop go in ONE call: a later set replaces the whole theme. */
async function apply($: EngineInterface, def: ThemeDef): Promise<string> {
  const { theme, problems } = colorsOf(def)
  const art = artOf(def)
  const scene = `${PREFIX}${def.id}_${stamp(art)}`
  const newer = { colors: theme, backdrop: { scene, glass: def.glass }, overrideColorScheme: def.mode } as ThemeSetArgs
  // Builds before v2.1.323 call the backdrop's name "id" and refuse "scene".
  const older = { colors: theme, backdrop: { id: scene, glass: def.glass, colorScheme: def.mode } } as unknown as ThemeSetArgs
  const set = await $.theme.set(newer).catch(() => $.theme.set(older))
  const blocked = blockingProblem(problems)

  if (blocked !== undefined) return `${def.title} is on, but the app may skip its colors: ${blocked}`
  if (!set.isDrawn) return `${def.title} is saved. It shows in the desktop and mobile apps: ${set.reason}`

  return `${def.title} is on. It is a ${def.mode} theme, so the app switches to ${def.mode} mode while it is on.`
}

async function saved($: EngineInterface): Promise<string> {
  const kept = await $.store.get(STORE_KEY)

  return typeof kept === 'string' ? kept : OFF
}

/**
 * Another mod took the background, or cleared it: remember that this mod is
 * off, so the next session does not bring it back. It never throws: this runs
 * inside another mod's theme change, and must not break it.
 */
async function stepAside($: EngineInterface, by: string): Promise<void> {
  const self = $.plugin.name

  if (booting || !started || by === self || by.startsWith(`${self}@`) || by === COMMAND || by.startsWith(`${COMMAND}@`)) return
  // This session now shows the other mod's look. Marking it off here keeps
  // the sync check from clearing that look on its next tick.
  shown = OFF

  try {
    if ((await saved($)) !== OFF) await $.store.set(STORE_KEY, OFF)
  } catch {
    // The store is unavailable: the worst case is this theme returning next session.
  }
}

/**
 * Puts this session on the newest pick when another session changed it.
 * It never throws: it runs on a timer, and the next tick tries again.
 */
async function follow($: EngineInterface): Promise<void> {
  if (checking) return
  checking = true

  try {
    const kept = await saved($)

    if (kept === shown) return
    shown = kept

    if (kept === OFF) {
      await $.theme.clear()

      return
    }
    const def = THEMES.find(one => one.id === kept)

    if (def !== undefined) await apply($, def)
  } catch {
    // The store or the theme was busy for a moment.
  } finally {
    checking = false
  }
}

export const register: Register = on => {
  // A theme lasts only while the session runs, so put the saved one back at
  // every start. It goes on after the other mods' start hooks, so it wins.
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: COMMAND,
      description: `Animated backgrounds: /${COMMAND} <name>, random, next, list or off`,
    })
    booting = true

    try {
      const result = await next(e)
      const kept = await saved($)
      const chosen = THEMES.find(one => one.id === kept)
      shown = kept

      if (chosen !== undefined) {
        const answer = await apply($, chosen)

        if (!answer.includes(' is on.')) $.ui.status(answer)
      }
      $.clock.every(SYNC_MS, () => {
        void follow($)
      })

      return result
    } finally {
      booting = false
      started = true
    }
  })

  on('theme.set', async ($, e, next) => {
    const result = await next(e)
    await stepAside($, next.origin.plugin)

    return result
  })

  on('theme.clear', async ($, e, next) => {
    const result = await next(e)
    await stepAside($, next.origin.plugin)

    return result
  })

  on('ui.render', { component: 'Backdrop' }, ($, e, next) => {
    // Every mod's backdrop passes through here. Draw only this mod's.
    const props = e.props as { scene?: string; id?: string; plugin?: string }
    const name = props.scene ?? props.id ?? ''

    if (props.plugin !== $.plugin.name || !name.startsWith(PREFIX) || (e.surface !== 'desktop' && e.surface !== 'mobile')) {
      return next(e)
    }
    const id = name.slice(PREFIX.length, name.lastIndexOf('_'))
    const def = THEMES.find(one => one.id === id)

    if (def === undefined) return next(e)
    const { Svg } = $.ui.resolve(e)

    return <Svg source={artOf(def)} alt={def.alt} isInteractive />
  })

  on('command.run', { command: COMMAND }, async ($, e) => {
    try {
      return await run($, e.args)
    } catch (error) {
      return { text: `custom-theme hit a problem: ${error instanceof Error ? error.message : String(error)}` }
    }
  })
}

/** What /custom-theme does with the words typed after it. */
async function run($: EngineInterface, args: string): Promise<{ text: string }> {
  {
    const words = args.trim().toLowerCase()
    const current = await saved($)

    if (words === '' || words === 'list' || words === 'help') {
      const now = THEMES.find(def => def.id === current)

      return { text: `${now === undefined ? 'No theme is on.' : `On now: ${now.title}.`}\n\n${listing(current)}` }
    }

    if (words === OFF) {
      shown = OFF
      await $.store.set(STORE_KEY, OFF)
      const cleared = await $.theme.clear()

      return { text: cleared.isDrawn ? 'Theme off.' : `Theme off. The app's own look is back.` }
    }
    let pick: ThemeDef | undefined

    if (words === 'random') {
      const others = THEMES.filter(def => def.id !== current)
      pick = others[Math.floor(Math.random() * others.length)]
    } else if (words === 'next' || words === 'prev') {
      const at = THEMES.findIndex(def => def.id === current)
      const step = words === 'next' ? 1 : -1
      pick = THEMES[(at + step + THEMES.length) % THEMES.length]
    } else {
      const { match, options } = find(words)

      if (match === undefined) {
        const hint =
          options.length > 1
            ? `"${words}" fits ${options.length} themes: ${options.map(def => def.id).join(', ')}.`
            : `No theme called "${words}".`

        return { text: `${hint}\n\n${listing(current)}` }
      }
      pick = match
    }

    if (pick === undefined) return { text: listing(current) }
    shown = pick.id
    await $.store.set(STORE_KEY, pick.id)

    return { text: await apply($, pick) }
  }
}
