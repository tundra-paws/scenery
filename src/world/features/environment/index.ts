// src/world/features/environment/index.ts
import * as THREE from 'three'
import { createHemisphereFill, createSun } from 'threejs-scenes/raster'
import { PALETTE } from '../../shared/palette.ts'
import { SUN } from '../../shared/sun.ts'
import { STEP } from '../../world.ts'
import type { Feature, World } from '../../world.ts'
import { createSkyMaterial } from './sky.ts'

/** Distance of the light from what it lights. Only has to clear the terrain. */
const SUN_DISTANCE = 260

/** Radius of the sky dome. Inside the camera's far plane, outside everything else. */
const SKY_RADIUS = 1200

/**
 * Sky, sun, fill light, fog, and the wind's clock.
 *
 * Mounted first, because it is also where the renderer's shadow settings are
 * decided, and those have to be in place before any other feature creates a
 * material. For the same reason it is what moves the air on each step: every
 * feature after it then reads the same wind.
 */
export function createEnvironment (world: World): Feature {
  let sky: THREE.Mesh | null             = null
  let sun: THREE.DirectionalLight | null = null
  let fill: THREE.HemisphereLight | null = null

  return {
    name: 'environment',

    build ({ scene, renderer }) {
      // The library's renderer factory asks for PCFSoftShadowMap, which this
      // three version has retired and warns about on every load. The app is
      // created with shadows off and they are switched on here instead.
      renderer.shadowMap.enabled = world.quality.shadowsEnabled
      renderer.shadowMap.type    = THREE.PCFShadowMap

      scene.fog = new THREE.FogExp2(PALETTE.horizon, 0.0028)

      // Before the first step too, so nothing is ever drawn in still air.
      world.wind.blow(0)

      const reach = world.ground.size * 0.62

      sun = createSun({
        color:         PALETTE.sun,
        intensity:     3.2,
        position:      SUN.clone().multiplyScalar(SUN_DISTANCE),
        shadowMapSize: world.quality.shadowMapSize,
        shadowFrustum: reach,
        shadowFar:     SUN_DISTANCE * 2,
      })
      sun.castShadow = world.quality.shadowsEnabled

      // A frustum this wide spreads the shadow map thin, so the bias the
      // library picks for a tabletop scene leaves acne on every slope.
      sun.shadow.bias       = -0.0005
      sun.shadow.normalBias = 0.16

      fill = createHemisphereFill({ skyColor: PALETTE.skyFill, groundColor: PALETTE.groundFill, intensity: 1.7 })

      sky = new THREE.Mesh(
        new THREE.SphereGeometry(SKY_RADIUS, 24, 12),
        createSkyMaterial({ zenith: PALETTE.zenith, horizon: PALETTE.horizon, sun: PALETTE.sun, sunDirection: SUN }),
      )
      sky.name          = 'sky'
      sky.frustumCulled = false
      sky.renderOrder   = -1

      scene.add(sun, sun.target, fill, sky)
    },

    update (_state, frame) {
      world.wind.blow(frame.frame * STEP)
    },

    dispose () {
      sky?.geometry.dispose()

      if (sky?.material instanceof THREE.Material)
        sky.material.dispose()

      sun?.shadow.map?.dispose()
      sun?.removeFromParent()
      sun?.target.removeFromParent()
      fill?.removeFromParent()
      sky?.removeFromParent()
      sky  = null
      sun  = null
      fill = null
    },
  }
}
