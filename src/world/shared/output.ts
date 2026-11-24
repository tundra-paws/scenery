// src/world/shared/output.ts
import { acesFilmicToneMapping, densityFogFactor, float, mix, sRGBTransferOETF, uniform } from 'three/tsl'
import type { Node } from 'three/webgpu'

/** How fast the haze takes the land and the sea, per world unit (squared, as three's exponential fog is). */
export const HAZE = 0.0028

/** 1 while the sea's mirror is being drawn, 0 for the picture itself. */
const mirrored = uniform(0)

/** A colour in linear light as the numbers an sRGB screen wants. three's own function, typed. */
function encoded (colour: Node<'vec3'>): Node<'vec3'> {
  return sRGBTransferOETF(colour) as Node<'vec3'>
}

/**
 * How a colour in linear light gets to the screen.
 *
 * The renderer is told to do nothing to what a material gives it: no tone
 * mapping, no encoding, no pass over the finished frame. Each material ends
 * with one of these instead, because this world needs two ways out and the
 * renderer has one. What the light fell on is `developed`: tone-mapped, then
 * encoded. What is the sky's own (the dome, the clouds, the stars, and the
 * haze everything fades into) is `printed`: encoded and nothing else, so the
 * land fades into exactly the colour the dome has at the horizon.
 *
 * The sea's mirror wants neither: it is a picture in linear light that the
 * sea develops once, with its own colour. While it is drawn both of these
 * hand the colour back as it came (`drawMirror`), from the same program.
 */
export function printed (colour: Node<'vec3'>): Node<'vec3'> {
  return mix(encoded(colour), colour, mirrored)
}

/** A lit colour as the screen shows it: tone-mapped (ACES, exposure 1), then encoded. */
export function developed (light: Node<'vec3'>): Node<'vec3'> {
  return mix(encoded(acesFilmicToneMapping(light, float(1)) as Node<'vec3'>), light, mirrored)
}

/**
 * The haze laid over a colour that is ready for the screen: three's
 * exponential fog, by how far off the fragment is, into `air` as it is
 * printed. Laid on after tone mapping, as three's WebGL renderer laid its fog.
 */
export function hazed (shown: Node<'vec3'>, air: Node<'vec3'>, density: number = HAZE): Node<'vec3'> {
  return mix(shown, printed(air), densityFogFactor(float(density)) as Node<'float'>)
}

/** Say whether what is drawn next is the sea's mirror. */
export function drawMirror (on: boolean): void {
  mirrored.value = on ? 1 : 0
}

// perf: a tone map and an encode a fragment, where the renderer's own way was
// a second pass over a half-float copy of the whole frame.
