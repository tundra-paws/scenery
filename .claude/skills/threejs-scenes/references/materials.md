# Materials — common starting points

Tuned starting materials so you don't hand-set `metalness`/`roughness` every time. From
`threejs-scenes/primitives`.

## PBR presets

```ts
import { createStandardMaterial, MATERIAL_PRESETS } from 'threejs-scenes/primitives'

createStandardMaterial('gold')                              // a tuned MeshStandardMaterial
createStandardMaterial('plastic', { color: '#5fb0ff' })     // preset + overrides
createStandardMaterial({ metalness: 0.5, roughness: 0.2 })  // raw params, no preset
```

`MATERIAL_PRESETS` keys: `metal`, `chrome`, `gold`, `plastic`, `rubber`, `glass`, `matte`,
`emissive`. Overrides always win over the preset.

**`glass` is special** — it returns a `MeshPhysicalMaterial` with `transmission: 1`,
`thickness`, and `ior` so it actually refracts. The others are `MeshStandardMaterial`.
Glass/transmission needs an environment map to look like anything, and transmission adds a
render pass of the opaque scene (more draw calls); see `lighting.md`.

## Toon (cel) shading

```ts
import { createToonMaterial, createGradientToonMap } from 'threejs-scenes/primitives'

createToonMaterial({ color: '#ff7ad9', steps: 4 })
const ramp = createGradientToonMap(3)   // a NearestFilter DataTexture → hard bands
```

`createGradientToonMap(steps)` builds the quantized ramp; `NearestFilter` keeps the bands
crisp (linear filtering would smear them back into a gradient).

## Matcap

```ts
import { createMatcapMaterial } from 'threejs-scenes/primitives'

createMatcapMaterial(generatedTexture)   // a Texture; a URL string is also accepted but means a network fetch
```

Matcaps bake lighting into a sphere texture — zero scene lights needed, very cheap, great
for stylized props. Generate the matcap texture procedurally (a radial-gradient
`CanvasTexture`) rather than loading one.

## Holographic, triplanar, fullscreen shader

- `createHolographicMaterial({ baseColor, fresnelStrength, scanlineDensity, opacity })` — a
  `ShaderMaterial` whose `userData.tick(frame)` advances `uTime`; call it from `update`.
- `createTriplanarMaterial({ palette, tileScale, fogDistance, side })` — see
  `cinematic-and-streaming.md`.
- `createShaderQuad({ fragmentShader, uniforms, pointerElement })` — see
  `cinematic-and-streaming.md`.

## Tone mapping

The renderer applies ACES tone mapping by default. **If you add post-processing, tone-map
exactly once at the `OutputPass`** and turn the renderer's tone mapping off — double
tone-mapping washes everything out. See `post-processing.md`. For `emissive` materials to
bloom, drive `emissiveIntensity` above 1 and add bloom.

## Fog

Built-in materials fog automatically from `scene.fog`. A custom `ShaderMaterial` must
include three's fog chunks (see `shaders.md`).

## Reuse & dispose

Materials compile a shader on first use. **Share one material instance across meshes**
rather than building one per mesh — fewer compiles, fewer state changes. For pooled
sharing across modules use `ctx.materials?.get(key, () => new THREE.MeshStandardMaterial(...))`
(a `MaterialPool`, also constructible from `threejs-scenes/compose`). Never dispose a
pooled/shared material a module didn't create; dispose your own materials and their textures
in the module's `dispose()`.
