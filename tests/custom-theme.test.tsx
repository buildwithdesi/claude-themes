import type { On } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'

import { THEMES } from '../hooks/themes.ts'

/** Runs /custom-theme with these words. The engine stamps origin and presentation itself. */
function slash($: Engine, args: string) {
  return $.command.run({ command: 'custom-theme', args } as Parameters<Engine['command']['run']>[0])
}

type Set = { backdrop?: { scene?: string }; overrideColorScheme?: string; colors?: unknown }

/** Hooks that stand for the engine: an in-memory store and a theme that records each set. */
function engine(on: On, kept: Map<string, unknown>, sets: Set[], clears: number[] = []) {
  on('command.register', () => ({ value: { command: 'custom-theme' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('store.get', (_, e) => ({ value: kept.get(e.key) }))
  on('store.set', (_, e) => {
    kept.set(e.key, e.value)

    return { value: undefined }
  })
  on('theme.set', (_, e) => {
    sets.push(e as Set)

    return { value: { isDrawn: true as const, requestId: 'r1' } }
  })
  on('theme.clear', () => {
    clears.push(1)

    return { value: { isDrawn: false as const, reason: 'cleared' } }
  })
  on('ui.status', () => ({ value: undefined }))
}

test('a name turns its theme on, in its own mode, and is saved', async ($, on) => {
  const kept = new Map<string, unknown>()
  const sets: Set[] = []
  engine(on, kept, sets)
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })

  const ran = await slash($, 'honu')

  expect(JSON.stringify(ran)).toContain('Honu Lagoon is on')
  expect(sets.at(-1)?.backdrop?.scene?.startsWith('ct_honu-lagoon_')).toBe(true)
  expect(sets.at(-1)?.overrideColorScheme).toBe('light')
  expect(sets.at(-1)?.colors === undefined).toBe(false)
  expect(kept.get('theme')).toBe('honu-lagoon')
})

test('the saved theme comes back at the next start', async ($, on) => {
  const kept = new Map<string, unknown>([['theme', 'night-reef']])
  const sets: Set[] = []
  engine(on, kept, sets)

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })

  expect(sets.at(-1)?.backdrop?.scene?.startsWith('ct_night-reef_')).toBe(true)
})

test('off clears the theme and is saved', async ($, on) => {
  const kept = new Map<string, unknown>([['theme', 'halftone-dawn']])
  const sets: Set[] = []
  engine(on, kept, sets)
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })

  await slash($, 'off')

  expect(kept.get('theme')).toBe('off')
})

test('a word that names nothing gets the list, not silence', async ($, on) => {
  const kept = new Map<string, unknown>()
  engine(on, kept, [])
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })

  const ran = await slash($, 'zzzz')

  expect(JSON.stringify(ran)).toContain('No theme called')
  expect(kept.get('theme')).toBe(undefined)
})

test('every theme draws its own scene, under the size limit', async ($, on) => {
  engine(on, new Map(), [])

  for (const def of THEMES) {
    for (const surface of ['desktop', 'mobile'] as const) {
      const ui = await $.ui.mount({
        plugin: 'custom-theme',
        surface,
        component: 'Backdrop',
        requestId: `bd-${def.id}`,
        props: { scene: `ct_${def.id}_test`, plugin: 'custom-theme', glass: false },
      })
      const svg = await ui.find({ type: 'Svg' })
      const source = String((svg as { props?: { source?: string } } | undefined)?.props?.source ?? '')

      expect(source.startsWith('<svg')).toBe(true)
      expect(source.length < 131072).toBe(true)
      await ui.unmount()
    }
  }
})

test('part of a name is enough when it fits one theme', async ($, on) => {
  const kept = new Map<string, unknown>()
  engine(on, kept, [])
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })

  await slash($, 'dunes night')

  expect(kept.get('theme')).toBe('dither-dunes-night')
})

// A stand-in for da-theme: sets its look at every start, and on its own command.
const OTHER = {
  name: 'other-theme',
  register: (on: On) => {
    on('session.start', async ($, e, next) => {
      await $.theme.set({ backdrop: { color: '#000000' } })
      await $.command.register({ name: 'other', description: 'other look' })

      return next(e)
    })
    on('command.run', { command: 'other' }, async $ => {
      await $.theme.set({ backdrop: { color: '#111111' } })

      return { text: 'other on' }
    })
  },
}

test('a mod that sets its look at start does not switch this one off', { plugins: [OTHER] }, async ($, on) => {
  const kept = new Map<string, unknown>([['theme', 'ember']])
  const sets: Set[] = []
  engine(on, kept, sets)

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })

  expect(kept.get('theme')).toBe('ember')
  // This mod's set lands last, so its scene is the one on screen.
  expect(sets.at(-1)?.backdrop?.scene?.startsWith('ct_ember_')).toBe(true)
})

test('picking another look switches this one off', { plugins: [OTHER] }, async ($, on) => {
  const kept = new Map<string, unknown>([['theme', 'ember']])
  engine(on, kept, [])
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })

  await $.command.run({ command: 'other', args: '' } as Parameters<Engine['command']['run']>[0])

  expect(kept.get('theme')).toBe('off')
})

// The order mods start in is not fixed. A mod that sets its look before this
// one's start has run is still not the person choosing it.
test('a look set before this mod starts does not switch it off', { plugins: [OTHER] }, async ($, on) => {
  const kept = new Map<string, unknown>([['theme', 'snow-pines']])
  const sets: Set[] = []
  engine(on, kept, sets)

  await $.command.run({ command: 'other', args: '' } as Parameters<Engine['command']['run']>[0])
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })

  expect(kept.get('theme')).toBe('snow-pines')
  expect(sets.at(-1)?.backdrop?.scene?.startsWith('ct_snow-pines_')).toBe(true)
})

// The store stands for the one file every open session shares: a write to
// `kept` from the test is a pick made in another session.

test('an open session switches to a pick made in another session', async ($, on) => {
  const clock = mock.clock(on)
  const kept = new Map<string, unknown>([['theme', 'ember']])
  const sets: Set[] = []
  engine(on, kept, sets)
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })

  kept.set('theme', 'aurora')
  await clock.advance(3000)

  expect(sets.at(-1)?.backdrop?.scene?.startsWith('ct_aurora_')).toBe(true)
})

test('off in another session turns this one off too', async ($, on) => {
  const clock = mock.clock(on)
  const kept = new Map<string, unknown>([['theme', 'ember']])
  const clears: number[] = []
  engine(on, kept, [], clears)
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })

  kept.set('theme', 'off')
  await clock.advance(3000)

  expect(clears.length).toBe(1)
})

test('with no new pick, the check changes nothing', async ($, on) => {
  const clock = mock.clock(on)
  const kept = new Map<string, unknown>([['theme', 'ember']])
  const sets: Set[] = []
  const clears: number[] = []
  engine(on, kept, sets, clears)
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  const before = sets.length

  await clock.advance(9000)

  expect(sets.length).toBe(before)
  expect(clears.length).toBe(0)
})

test('the check never wipes a look another mod set in this session', { plugins: [OTHER] }, async ($, on) => {
  const clock = mock.clock(on)
  const kept = new Map<string, unknown>([['theme', 'ember']])
  const clears: number[] = []
  engine(on, kept, [], clears)
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })

  await $.command.run({ command: 'other', args: '' } as Parameters<Engine['command']['run']>[0])
  await clock.advance(6000)

  expect(kept.get('theme')).toBe('off')
  expect(clears.length).toBe(0)
})
