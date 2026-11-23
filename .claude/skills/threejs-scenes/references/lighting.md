# Lighting

Scene lighting hierarchy and shadow tuning.

In this repo the environment feature owns the sky, fog, the sun and the shadow map type
(`PCFShadowMap`). Do not set `renderer.shadowMap.type` yourself, and never
`PCFSoftShadowMap`: it is deprecated in this three version and logs a warning. Read the
environment feature before adding a light, a fog, or a `scene.background`.

## Hierarchy

1. **Environment / IBL first.** A PMREM-prefiltered env map is the cheapest,
   best-looking diffuse + specular baseline. Generate it from a procedural scene
   (`PMREMGenerator.fromScene`), not from a downloaded HDR file.
2. **One `DirectionalLight`** for the sun. Tune `shadow.camera` aggressively —
   oversized frustums waste depth precision and tank performance.
3. **`HemisphereLight`** for cheap sky/ground ambient — preferable to `AmbientLight`
   because it adds directional cues from sky vs ground colors.
4. **`PointLight` / `SpotLight`** sparingly. Each with shadows costs a full shadow render
   pass per frame.
5. **`LightProbe`** for SH-baked lighting where applicable.
6. **`RectAreaLight`** for soft realistic accents (no shadow support; needs
   `RectAreaLightUniformsLib.init()` from `three/addons/lights/RectAreaLightUniformsLib.js`).

## Library helpers

```ts
import { applyEnvironment, createSun, createHemisphereFill, setupStandardLighting } from 'threejs-scenes/raster'
```

- `applyEnvironment(scene, renderer, { intensity, envScene })` — PMREM-filters `envScene`
  (default: three's `RoomEnvironment`, an indoor studio) into `scene.environment` and
  returns the texture. Pass your own sky `Scene` for outdoor light.
- `createSun({ color, intensity, position, shadowMapSize, shadowFrustum, shadowFar })` — a
  `DirectionalLight` with `castShadow`, a tight shadow camera (±15, far 30 by default),
  `bias -0.0001`, `normalBias 0.02`. It does not add itself or its `target` to the scene.
- `createHemisphereFill({ skyColor, groundColor, intensity })`.
- `setupStandardLighting(scene, renderer, { env, sun, hemi })` — env + sun + hemisphere in
  one call, returns `{ env, sun, hemi, dispose }`. `createApp` does this itself when its
  `lighting` option is on.
- `createLightingRig(scene, renderer, { preset })` — see `cinematic-and-streaming.md`; it
  also retunes `scene.background`, fog and exposure, so only use it where nothing else owns them.

## Shadow Tuning

The single biggest lighting performance lever. Tight shadow frustum + smallest acceptable
map size wins.

```ts
const sun = new THREE.DirectionalLight('#fff5e0', 3)
sun.position.set(8, 12, 6)
sun.castShadow = true
sun.shadow.mapSize.set(2048, 2048)
sun.shadow.camera.near = 1
sun.shadow.camera.far = 30
sun.shadow.camera.top = sun.shadow.camera.right = 15
sun.shadow.camera.bottom = sun.shadow.camera.left = -15
sun.shadow.bias = -0.0001
sun.shadow.normalBias = 0.02
scene.add(sun, sun.target)
```

Visualize the shadow frustum while developing (and remove before committing):

```ts
scene.add(new THREE.CameraHelper(sun.shadow.camera))
```

## Cascaded Shadow Maps

For large outdoor scenes a single shadow camera can't cover both near detail and far
distance. Use cascaded shadow maps via `CSM` from `three/addons/csm/CSM.js`:

```ts
import { CSM } from 'three/addons/csm/CSM.js'

const csm = new CSM({
  maxFar: 200,
  cascades: 4,
  mode: 'practical',
  parent: scene,
  shadowMapSize: 2048,
  lightDirection: new THREE.Vector3(1, -1, 1).normalize(),
  camera,
})

// in update: csm.update()
// every material that should receive cascaded shadows: csm.setupMaterial(material)
// in dispose: csm.remove(); csm.dispose()
```

CSM creates and parents its own directional lights; each cascade is a shadow pass, so
budget accordingly.

## Hemisphere Fill

Cheap ambient with directional bias:

```ts
const sky = new THREE.HemisphereLight('#a0c0ff', '#3a2a1a', 0.4)
scene.add(sky)
```

`AmbientLight` is functionally equivalent to `HemisphereLight` with both colors the same —
prefer hemisphere for the free vertical gradient.

## Light Counts and Recompilation

Adding a light past the scene's current light count triggers a full shader recompile for
every material in the scene. To avoid recompile stalls:

- Add all lights in `build`, even if some start with `intensity = 0`.
- Toggle visibility / intensity (from `update`) instead of `add()` / `remove()` mid-run.

## Common Pitfalls

- Using `AmbientLight` as a sole light — flattens everything, looks dead.
- 4096² shadow maps "just to be safe" — usually overkill and tanks mobile FPS.
- Shadow camera frustum sized to the whole world — depth precision collapses, shadows look
  chunky everywhere.
- Forgetting `castShadow` on the mesh OR `receiveShadow` on the floor — one side missing
  breaks the whole effect.
- Adding/removing lights at runtime — triggers shader recompile every time.
- Using `RectAreaLight` and expecting shadows — they don't support shadows.
- Custom `ShaderMaterial`s receive no light or shadow unless you write it in; use
  `onBeforeCompile` on a standard material when you need both.
