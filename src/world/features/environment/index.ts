// src/world/features/environment/index.ts
import * as THREE from 'three'
import { createHemisphereFill, createSun } from 'threejs-scenes/raster'
import { PALETTE } from '../../shared/palette.ts'
import type { Feature, World } from '../../world.ts'
import { createSkyMaterial } from './sky.ts'

/** Where the sun sits, as a direction from the origin. Low enough to rake the hills. */
const SUN_DIRECTION = new THREE.Vector3(-0.62, 0.46, 0.3).normalize()

/** Distance of the light from what it lights. Only has to clear the terrain. */
const SUN_DISTANCE = 260

/** Radius of the sky dome. Inside the camera's far plane, outside everything else. */
const SKY_RADIUS = 1200

/** The direction the light comes from, for materials that shade against it by hand. */
export const SUN = SUN_DIRECTION

/**
 * Sky, sun, fill light and fog.
 *
 * Mounted first, because it is also where the renderer's shadow settings are
 * decided, and those have to be in place before any other feature creates a
 * material.
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

      const reach = world.ground.size * 0.62

      sun = createSun({
        color:         PALETTE.sun,
        intensity:     3.2,
        position:      SUN_DIRECTION.clone().multiplyScalar(SUN_DISTANCE),
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
        createSkyMaterial({ zenith: PALETTE.zenith, horizon: PALETTE.horizon, sun: PALETTE.sun, sunDirection: SUN_DIRECTION }),
      )
      sky.name          = 'sky'
      sky.frustumCulled = false
      sky.renderOrder   = -1

      scene.add(sun, sun.target, fill, sky)
    },

    update (_state, _frame, { camera }) {
      // The dome rides with the camera, so walking never brings its wall closer.
      sky?.position.copy(camera.position)
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
