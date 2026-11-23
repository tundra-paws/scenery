# Cinematic lighting & stylized factories

Patterns abstracted from shipping projects (a cinematic VRM viewer, an AI-generated
infinite liminal walker, raymarched shader journeys), available as library factories. Load
this doc when a request mentions: mood/stage lighting, light beams, colour grading / LUT /
teal-and-orange, tunnels or tube geometry along a path, triplanar materials, or
full-screen shader (shadertoy-style) effects.

Endless corridors and streamed worlds are in `streaming-worlds.md`. The camera rig is
framework code in this repo; the factories that drive a camera along a path are not covered
here.

## Named lighting presets — `createLightingRig`

Five hand-tuned cinematic rigs: `dramatic`, `studio`, `soft`, `neon`, `sunset`
(`LIGHTING_PRESETS`, `LightingPresetName`). One call builds hemi + key + rim + accent + spot
lights and two volumetric beam cones; `setPreset()` retunes everything with zero allocation.

```ts
import { createLightingRig } from 'threejs-scenes/raster'

const rig = createLightingRig(ctx.scene, ctx.renderer, { preset: 'sunset', shadows: true })
// rig = { hemi, key, rim, accent, spot, cones, setPreset(name), dispose }
// dispose: rig.dispose()
```

`setPreset` also sets `scene.background`, a `scene.fog` (created if missing) and
`renderer.toneMappingExposure`. In this repo another feature owns those; use the rig only
where it is the owner, or read its lights as a starting point and build your own.
Extend with your own configs via `presets: { myLook: { ... } }` (`LightingConfig`: `background`,
`exposure`, `fog: [near, far]`, `hemi`, `key`, `rim`, `accent`, `spot?`, `beams?`). Beams
only show on presets with a `beams` entry.

## Volumetric beams — `createLightCone`

Additive open cone with rim fresnel + length falloff. Reads as a theatrical shaft with no
raymarching. `createLightCone(from, to, { color, spread })` returns a mesh — add it to the
scene, dispose geometry + material when done.

## Cinematic colour grade — `createCinematicLUT`

Procedural teal-and-orange `Data3DTexture` for three's `LUTPass`. See `post-processing.md`.

## Path tubes — `parallelTransportFrames` / `createPathTube`

Twist-free frames along a polyline and a swept-circle tube with a per-point radius
function. Tunnels (`inward: true`), conduits, tentacles, roots. See `geometry.md`.

## Triplanar grid material — `createTriplanarMaterial`

```ts
import { createTriplanarMaterial } from 'threejs-scenes/primitives'

const material = createTriplanarMaterial({ palette: [ '#223', '#334', '#6cf' ], tileScale: 2, fogDistance: 60 })
```

World-space UVs picked by dominant normal axis — no unwrap, no seams on procedural
geometry. Palette-driven (`[baseA, baseB, grid]`) with analytic grid lines, cheap
directional shading and its own distance fog tint (`fogDistance`) — it is a `ShaderMaterial`
and does not read `scene.fog`.

## Full-screen shader scenes — `createShaderQuad`

Shadertoy-style fragment shader over one fullscreen triangle with the standard uniform
contract `iResolution` (device px), `iTime` (s), `uPointer` (-1..1, +y up).

```ts
import { createShaderQuad } from 'threejs-scenes/primitives'

const quad = createShaderQuad({ fragmentShader: RAYMARCH_GLSL, pointerElement: canvas })
// quad = { scene, camera, material, update(frame, renderer), render(frame, renderer), dispose }
```

It owns its own `scene` and orthographic `camera`; `render` draws straight to the current
render target, so on its own it replaces the world's frame. To use it as part of a world,
render it into a `WebGLRenderTarget` and sample the target as a texture (sky dome, screen),
calling `quad.update(frame, renderer)` first and then overriding
`quad.material.uniforms.iTime.value = frame.frame * STEP` so time stays frame-derived. The
`pointerElement` listener is a `pointermove` listener; `dispose()` removes it.

## Guarantees

All factories follow the library contract: explicit `dispose()`, zero per-frame allocation,
seeded determinism where randomness exists. Wherever a factory takes a time (`frame` /
`elapsed`), feed it the frame-derived time.
