// src/world/features/environment/index.ts
import * as THREE from 'three'
import type { QualityTier } from 'threejs-scenes'
import { createHemisphereFill, createSun } from 'threejs-scenes/raster'
import { POLE } from '../../shared/daylight.ts'
import { HOURS } from '../../shared/palette.ts'
import { STEP } from '../../world.ts'
import type { Feature, World } from '../../world.ts'
import { createSkyMaterial } from './sky.ts'
import { createStars } from './stars.ts'
import type { Stars } from './stars.ts'

/** Distance of the light from what it lights. Only has to clear the terrain. */
const SUN_DISTANCE = 260

/** Radius of the sky dome. Inside the camera's far plane, outside everything else. */
const SKY_RADIUS = 1200

/** Stars on the whole sphere. Half are under the horizon at any time, and the haze takes the low ones. */
const STARS: Record<QualityTier, number> = { mobile: 700, desktop: 1400, highEnd: 2000 }

/**
 * Sky, sun and moon, stars, fill light, fog, and the clocks of the wind and
 * of the day.
 *
 * Mounted first, because it is also where the renderer's shadow settings are
 * decided, and those have to be in place before any other feature creates a
 * material. For the same reason it is what moves the air and turns the sky
 * on each step: every feature after it then reads the same wind and the same
 * hour. One light does for the sun and the moon, since they are never up
 * together: `world.day` says where it stands, what colour it is and how
 * strong, and it is out at the moment it changes hands.
 */
export function createEnvironment (world: World): Feature {
  let sky: THREE.Mesh | null             = null
  let sun: THREE.DirectionalLight | null = null
  let fill: THREE.HemisphereLight | null = null
  let fog: THREE.FogExp2 | null          = null
  let stars: Stars | null                = null

  /** Put the light, the fill, the haze and the stars where the hour has them. */
  function keep (time: number, pixelRatio: number): void {
    const { day } = world

    day.turn(time)
    world.clouds.cast(day.light.direction, day.light.intensity)

    if (sun) {
      sun.position.copy(day.light.direction).multiplyScalar(SUN_DISTANCE)
      sun.color.copy(day.light.colour)
      sun.intensity = day.light.intensity
    }

    if (fill) {
      fill.color.copy(day.fill.sky)
      fill.groundColor.copy(day.fill.ground)
      fill.intensity = day.fill.intensity
    }

    fog?.color.copy(day.haze)
    stars?.turn(time, day.hour, pixelRatio)
  }

  return {
    name: 'environment',

    build ({ scene, renderer, rng }) {
      // The library's renderer factory asks for PCFSoftShadowMap, which this
      // three version has retired and warns about on every load. The app is
      // created with shadows off and they are switched on here instead.
      renderer.shadowMap.enabled = world.quality.shadowsEnabled
      renderer.shadowMap.type    = THREE.PCFShadowMap

      fog       = new THREE.FogExp2(HOURS.day.horizon, 0.0028)
      scene.fog = fog

      const reach = world.ground.size * 0.62

      sun = createSun({
        shadowMapSize: world.quality.shadowMapSize,
        shadowFrustum: reach,
        shadowFar:     SUN_DISTANCE * 2,
      })
      sun.castShadow = world.quality.shadowsEnabled

      // A frustum this wide spreads the shadow map thin, so the bias the
      // library picks for a tabletop scene leaves acne on every slope.
      sun.shadow.bias       = -0.0005
      sun.shadow.normalBias = 0.16

      fill = createHemisphereFill()

      sky = new THREE.Mesh(new THREE.SphereGeometry(SKY_RADIUS, 24, 12), createSkyMaterial(world.day.uniforms))
      sky.name          = 'sky'
      sky.frustumCulled = false
      sky.renderOrder   = -1

      stars = createStars({
        count:  STARS[world.quality.tier],
        rng:    rng.fork('environment:stars'),
        colour: HOURS.night.light,
        pole:   POLE,
        day:    world.day.uniforms,
      })

      scene.add(sun, sun.target, fill, sky, stars.points)

      // Before the first step too, so nothing is ever drawn in still air or
      // under a sky with no hour.
      world.wind.blow(0)
      keep(0, renderer.getPixelRatio())
    },

    update (_state, frame, { renderer }) {
      const time = frame.frame * STEP

      world.wind.blow(time)
      keep(time, renderer.getPixelRatio())
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
      stars?.dispose()
      sky   = null
      sun   = null
      fill  = null
      fog   = null
      stars = null
    },
  }
}

// perf: cheap — the dome and the stars are one draw call each, and the one
// light casts the one shadow map it always did. A step turns the day
// (`shared/daylight.ts`) and copies a direction, three colours and two
// numbers into the lights and the fog. The shadow map is drawn every frame,
// as before: the light now moves, so it has to be.
