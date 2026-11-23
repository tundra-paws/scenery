// src/world/shared/sun.ts
import * as THREE from 'three'

/**
 * Where the sun sits, as a unit direction from the ground toward it.
 *
 * Low enough to rake the hills. The light, the sky's disc, the glint on the
 * sea and the shadows of the clouds all take it from here, so they agree on
 * where the light comes from.
 */
export const SUN = new THREE.Vector3(-0.62, 0.46, 0.3).normalize()
