// Turns a theme's few palette colors into the app's full color set.
// WHY makeColors: the desktop app paints about 100 named colors per mode,
// under names a mod cannot guess. makeColors grows all of them from anchors.

import { makeColors } from './make-colors.js'
import type { ThemeDef } from './kit.ts'

export function colorsOf(def: ThemeDef): ReturnType<typeof makeColors> {
  const p = def.palette
  const anchors = {
    'surface-0': p.surface0,
    'surface-1': p.surface1,
    'surface-2': p.surface2,
    // Light mode wants surface-2 and surface-3 equal, so only dark themes give a fourth.
    ...(def.mode === 'dark' && p.surface3 !== undefined ? { 'surface-3': p.surface3 } : {}),
    'text-primary': p.textPrimary,
    'text-secondary': p.textSecondary,
    'text-muted': p.textMuted,
  }
  const half = { gray: { anchors } }

  return makeColors({
    label: def.title,
    // `only` makes the app switch to the mode the theme was drawn for.
    only: def.mode,
    roles: { accent: p.accent, danger: p.danger, success: p.success, warning: p.warning, pro: p.pro },
    ...(def.mode === 'light' ? { light: half } : { dark: half }),
  })
}

/** The one problem line that makes the desktop app ignore a whole theme, if any. */
export function blockingProblem(problems: readonly string[]): string | undefined {
  return problems.find(line => line.startsWith("Desktop won't paint"))
}
