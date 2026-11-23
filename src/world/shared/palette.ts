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
  skyFill:      '#a9c4e8',
  groundFill:   '#6b6452',
  sand:         '#cdbf9a',
  grass:        '#6f8f4e',
  grassDry:     '#8f9a5a',
  rock:         '#7d7a74',
  cairn:        '#a8a193',
  waterDeep:    '#1d4d68',
  waterShallow: '#8fc2cc',
  foam:         '#eef2f5',
} as const

export type PaletteName = keyof typeof PALETTE
