// src/world/shared/palette.ts

/**
 * Every colour in the world, in one place.
 *
 * The seed is deliberately plain. The art direction in VISION.md is what this
 * file should come to express, and a feature that needs a colour takes it from
 * here rather than inventing one, so a change of mood is a change to one file.
 */
export const PALETTE = {
  zenith:       '#2f5f9f',
  horizon:      '#d3e0ea',
  sun:          '#fff1d6',
  lamp:         '#ffb45a',
  skyFill:      '#a9c4e8',
  groundFill:   '#6b6452',
  sand:         '#cdbf9a',
  grass:        '#6f8f4e',
  grassDry:     '#8f9a5a',
  path:         '#c0ad86',
  rock:         '#7d7a74',
  cairn:        '#a8a193',
  timber:       '#8f7a5c',
  bark:         '#d9d3c3',
  pennant:      '#a8483a',
  barley:       '#c4b56e',
  leaf:         '#d9ae4c',
  heather:      '#86607a',
  bracken:      '#9a5530',
  fleece:       '#e2dccb',
  moorit:       '#7a5840',
  face:         '#2e2926',
  waterDeep:    '#1d4d68',
  waterShallow: '#8fc2cc',
  foam:         '#eef2f5',
  wrack:        '#806a24',
  aurora:       '#8fe6b0',
} as const

/**
 * The sky and its light at five hours, by how high the sun stands.
 *
 * `zenith` and `horizon` are the dome, and the horizon is the haze's colour
 * too. `light` is the body that lights the land: the sun's cream by day,
 * deepening as it sinks to the rose that is left on the clouds after it has
 * set, and at night the moon's cold blue-white, which the stars share. `fill`
 * and `ground` are what the sky and the land give back to what the light does
 * not reach. The day's row is the palette's own colours: the other four are
 * the same place later on.
 */
export const HOURS = {
  day:    { zenith: PALETTE.zenith, horizon: PALETTE.horizon, light: PALETTE.sun, fill: PALETTE.skyFill, ground: PALETTE.groundFill },
  gold:   { zenith: '#3a5c9a', horizon: '#efd0a2', light: '#ffc98a', fill: '#b6b4d2', ground: '#6e5b47' },
  sunset: { zenith: '#2c417c', horizon: '#eda772', light: '#ff9455', fill: '#9a8fb8', ground: '#5c4a48' },
  dusk:   { zenith: '#16254c', horizon: '#6f6f96', light: '#e68c7c', fill: '#8189bb', ground: '#4d4c63' },
  night:  { zenith: '#091126', horizon: '#1c2b47', light: '#c2d2f0', fill: '#3a4d78', ground: '#1b2132' },
} as const

export type PaletteName = keyof typeof PALETTE

export type HourName = keyof typeof HOURS
