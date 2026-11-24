// src/world/shared/mirror.ts
import type * as THREE from 'three'


/** The flag an object carries in `userData` when the sea is not to show it. */
const KEPT_OUT = 'unmirrored'

/**
 * Leave something out of the sea's reflection.
 *
 * The sea draws the world a second time, upside down, for what it gives back
 * (`features/water/mirror.ts`). What is small, many and low (a field of grass
 * blades, the ears of the barley) costs as much the second time and is lost
 * in the ripples anyway: the land it stands on is reflected in its colour.
 */
export function keepOutOfMirror (object: THREE.Object3D): void {
  object.userData[KEPT_OUT] = true
}

/** Whether `keepOutOfMirror` was said of this object. */
export function isKeptOutOfMirror (object: THREE.Object3D): boolean {
  return object.userData[KEPT_OUT] === true
}
