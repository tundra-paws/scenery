# Post-Processing

Effect composer setup and pass library. WebGL only: `EffectComposer` from
`three/addons/postprocessing/`, never the `three/webgpu` / TSL pipeline.

In this repo the render call belongs to the app (`createApp`'s `render` and `onResize`
options, wired in framework code), not to a feature. Read how `src/world` / the app shell
wires its render function before adding passes; a module cannot replace the render call from
inside `build`. Each pass is a fullscreen draw and adds to what the gate counts against
`budgets.json`. Passes that animate take their time from the frame
(`pass.uniforms.uTime.value = frame.frame * STEP`), never a clock.

## Pipeline

Canonical chain order:

```
RenderPass → GodRays → UnrealBloom → DOF+CA → Glitch (optional) → FilmGrain → HudBeam → OutputPass
```

Order matters: DOF before grain (grain shouldn't blur), bloom after god rays (you want the
rays to bloom), glitch before grain (grain sits on top of glitch), `OutputPass` last
(handles tonemapping + color space).

## Composer Setup

```ts
import { createComposer, createPostPipeline } from 'threejs-scenes/raster'

// fixed chain: RenderPass → (UnrealBloomPass) → OutputPass, depth texture attached
const post = createComposer({
  renderer, scene, camera, width, height,
  withDepth: true, withBloom: true, bloomStrength: 0.7, bloomRadius: 0.4, bloomThreshold: 0.85,
})
post.addPassBeforeOutput(gradePass)
// render: post.composer.render()    resize: post.setSize(w, h)    teardown: post.dispose()
```

`createPostPipeline({ renderer, scene, camera, width, height, withDepth? })` is the
reorderable form: `register(name, pass)`, `setOrder(names)`, `setEnabled({ name: bool })`,
`get(name)`, `render(delta?)`, `setSize`, `dispose`. `RenderPass` stays first and `OutputPass`
last. Its `withDepth` defaults to `false`; `createComposer`'s defaults to `true`.

Equivalent by hand:

```ts
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass }     from 'three/addons/postprocessing/RenderPass.js'
import { OutputPass }     from 'three/addons/postprocessing/OutputPass.js'

const composer = new EffectComposer(renderer)
composer.setSize(width, height)
composer.addPass(new RenderPass(scene, camera))
// ... effect passes
composer.addPass(new OutputPass())
composer.render()   // instead of renderer.render(scene, camera)
```

Depth-based effects (DOF, soft particles, god rays) need a `DepthTexture` on the composer's
render targets, which the `withDepth` option attaches (`composer.renderTarget1.depthTexture`
is then the one to bind). Call `setSize` on resize, including the depth texture.

## Bloom

`UnrealBloomPass` is the default (`new UnrealBloomPass(new THREE.Vector2(w, h), strength,
radius, threshold)` from `three/addons/postprocessing/UnrealBloomPass.js`; `createComposer`
builds one). For selective bloom (only specific objects glow), render the scene twice into
separate render targets with a masking layer, bloom the emissive target, additively combine.
Cheaper alternative: drive bloom threshold from material emissive only and ensure
non-glowing materials stay below the threshold.

## Colour grade — `createGradePass`

```ts
import { createGradePass } from 'threejs-scenes/raster'

const grade = createGradePass({ tint: '#ffe9c8', contrast: 1.08, saturation: 1.1, vignette: 0.25, grain: 0.03, chromatic: 0.002 })
post.addPassBeforeOutput(grade)
// update: grade.setTime(frame.frame * STEP)
```

Runs scene-referred (linear HDR) ahead of the output pass: tint, contrast about mid-grey,
saturation, radial vignette, grain, radial chromatic aberration.

## Cinematic LUT — `createCinematicLUT`

```ts
import { LUTPass } from 'three/addons/postprocessing/LUTPass.js'
import { createCinematicLUT } from 'threejs-scenes/raster'

post.addPassBeforeOutput(new LUTPass({ lut: createCinematicLUT(), intensity: 0.6 }))
```

A procedural teal-and-orange `Data3DTexture` (`createCinematicLUT(size?, { contrast,
splitTone, saturation })`) — no `.cube` file to ship. Dispose the texture yourself.

## Glitch Effects

`createRgbShiftPass()`, `createBlockDisplacementPass()`, `createScanCorruptionPass()` return
`ShaderPass`es with a `uIntensity` uniform (and `uTime`) so they can be ramped and mixed:
`pass.uniforms.uIntensity.value = 0.4`.

- **RGB shift** — chromatic channel separation along an angle (`uAngle`).
- **Block displacement** — shifts blocky regions of the screen (`uBlockSize`).
- **Scan corruption** — VHS-style horizontal scan bands with jitter.

## Lens Flares

`Lensflare` / `LensflareElement` from `three/addons/objects/Lensflare.js`. Attach to lights —
they self-occlude against scene depth via an internal occlusion test. The flare textures are
generated (a radial `CanvasTexture`), not downloaded.

```ts
import { Lensflare, LensflareElement } from 'three/addons/objects/Lensflare.js'

const flare = new Lensflare()
flare.addElement(new LensflareElement(glowTexture, 700, 0))
flare.addElement(new LensflareElement(ringTexture, 60, 0.6))
sunLight.add(flare)
```

## God Rays (Volumetric Light Shafts)

Screen-space radial scatter toward the light's screen position, added on top of the scene.
Cheaper than true volumetrics. The pass disables itself when the light is behind the camera.

```ts
import { createGodRaysPass } from 'threejs-scenes/raster'

const godRays = createGodRaysPass()
post.addPassBeforeOutput(godRays)
// update: godRays.updateFromLight(sun.position, camera)
// optional: godRays.setOcclusionTexture(maskTexture)   // light non-black, occluders black
```

With no occlusion texture it samples the scene colour, which works when a bright sun sprite
is visible.

## Depth of Field with Chromatic Aberration

`BokehPass` is expensive. `createDofPass` blurs by the distance between a fragment's linear
depth and a focal distance, with chromatic separation modulated by the same circle of
confusion.

```ts
import { createDofPass } from 'threejs-scenes/raster'

const dof = createDofPass({ focalDistance: 10, focalRange: 4, maxBlur: 0.015, caStrength: 0.5, near: camera.near, far: camera.far })
dof.uniforms.tDepth.value = post.composer.renderTarget1.depthTexture
dof.setAspect(width / height)
post.addPassBeforeOutput(dof)
// update: dof.focusOn(targetWorldPosition, camera)   // sets the focal distance
```

## Film Grain

```ts
import { createFilmGrainPass } from 'threejs-scenes/raster'

const grain = createFilmGrainPass({ intensity: 0.08, luma: 0.5, desat: 0 })   // luma 0 = colour grain, 1 = luma grain
// update: grain.uniforms.uTime.value = frame.frame * STEP
```

## HUD Beam Transition

A luminous beam sweeps left → right, revealing content behind it with RGB-split fringes.
`createHudBeamTransition({ duration, beamWidth, beamColor, onComplete })` returns
`{ pass, play(onMidpoint?), tick(delta, time) }`; `onMidpoint` fires on the frame the beam
crosses 0.5 — swap content there. Call `tick(frame.delta, frame.frame * STEP)` from `update`.

## Stereoscopy

`createStereoRenderer(renderer, 'anaglyph' | 'stereo' | 'off', { width, height })` returns
`{ mode, render(scene, camera), setSize, dispose }`, wrapping `AnaglyphEffect` /
`StereoEffect` from `three/addons/effects/`. They bypass `EffectComposer`, so stereo plus
post-fx means rendering each eye into a render target; offer it as a quality tier only.

## Per-Quality-Tier Gating

Keep post-fx mostly off on mobile. `getQualitySettings(tier).postFx` (from
`threejs-scenes/core`) lists names per tier: mobile `['bloom']`, desktop
`['bloom', 'dof', 'filmGrain']`, highEnd adds `'godRays'`, `'glitch'`. Pair it with
`pipeline.setEnabled(...)`.

## Common Pitfalls

- Forgetting to attach a `DepthTexture` when DOF/godrays need it.
- Stacking 5+ passes on mobile — each pass is a fullscreen fragment shader.
- Order matters: `OutputPass` before effect passes corrupts color space; bloom before god
  rays makes rays not bloom.
- `composer.setSize()` not called on resize → blurry/stretched output.
- Mixing `composer.render()` and `renderer.render()` — pick one per frame.
- Bloom radius scaled with viewport — dramatic on small screens, weak on big ones. Use a
  fixed pixel-equivalent radius.
- Setting `renderer.toneMapping` while an `OutputPass` is active — tone-maps twice.
