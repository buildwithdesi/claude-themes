// Every theme in the pack, in the order /custom-theme list shows them.
// To add a theme: write a scene file in ./scenes, then add it here.

import type { ThemeDef } from './kit.ts'
import { aurora } from './scenes/aurora.ts'
import { blueprint } from './scenes/blueprint.ts'
import { brailleStars } from './scenes/braille.ts'
import { deepWater } from './scenes/deep.ts'
import { departureBoard } from './scenes/departure.ts'
import { ditherDunes, ditherDunesNight } from './scenes/dunes.ts'
import { ember } from './scenes/ember.ts'
import { halftoneDawn, halftoneDusk } from './scenes/halftone.ts'
import { koiMosaic } from './scenes/koi.ts'
import { honuLagoon, nightReef } from './scenes/lagoon.ts'
import { paperGarden, paperGardenKraft } from './scenes/paper.ts'
import { snowPines } from './scenes/pines.ts'
import { plotterTide, plotterTideNight } from './scenes/plotter.ts'
import { teletextClouds } from './scenes/teletext.ts'
import { vectorRange } from './scenes/vector.ts'

export const THEMES: readonly ThemeDef[] = [
  honuLagoon,
  koiMosaic,
  halftoneDawn,
  halftoneDusk,
  plotterTide,
  plotterTideNight,
  ditherDunes,
  ditherDunesNight,
  paperGarden,
  paperGardenKraft,
  nightReef,
  snowPines,
  brailleStars,
  teletextClouds,
  vectorRange,
  departureBoard,
  blueprint,
  deepWater,
  aurora,
  ember,
]
