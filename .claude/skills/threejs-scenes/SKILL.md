---
name: threejs-scenes
description: >
  Craft rules and API map for writing three.js (WebGL2) world code in this repo with
  three 0.184 and threejs-scenes 3.0.0. Use whenever you add or change anything under
  src/world or src/rig, or touch three.js: procedural geometry, instancing/BatchedMesh,
  shaders and ShaderMaterial, lighting and shadows, particles, billboards, textures,
  post-processing, chunk streaming, performance and draw-call budgets, determinism,
  disposal, or code style for 3D code.
---

# three.js Scenes

Provenance: distilled from the owner's personal `threejs-scenes` skill (1.7.3) and
corrected against `threejs-scenes@3.0.0` on 2026-11-23. When this skill and
`node_modules/threejs-scenes/dist/**/*.d.ts` disagree, the d.ts wins; `bun run api:digest`
prints the current API.

The library installed here is 3.0.0 plus this repository's own improvements in `lib-stack/`
(`bun run stack --list`), so the digest holds things the published 3.0.0 does not:
`createNoise2D`, `pixelRatioFor`, and `renderOn` / `fps` / `invalidate()` on `createApp`.
When the library is slow, wrong, or missing something any scene would want, add an entry
there (`lib-stack/README.md`) instead of working around it. Never edit `node_modules`.

Vanilla three.js (WebGL2), procedural-first. Load only the references the task needs.

## Scenery rules (authoritative over everything else here)

- **Where code lives.** World code is `src/world/features/<name>/`: a factory that takes the
  `World` services object and returns an `AppModule` (`{ name, build(ctx), update?(state, frame, ctx), dispose() }`,
  type from `threejs-scenes/core`). Register it in `src/world/index.ts`. `World`, `Feature`
  and `STEP` are in `src/world/world.ts`; the land is `world.ground` (`heightAt`, `slopeAt`),
  already sampled on the terrain's lattice as `world.grid` (`shared/height-grid.ts`: use it
  for anything per vertex or per texel instead of asking `ground` again), placement is
  `scatterOnGround` in `shared/scatter.ts`, colours are `shared/palette.ts`.
  Read an existing feature first (`features/rocks` is the shortest complete one).
- **Determinism** (lint-enforced in `src/world/**` and `src/rig/**`). No `Math.random`,
  `Date.now`, `new Date`, `performance.now`, `setTimeout` / `setInterval`,
  `requestAnimationFrame`, and no `ctx.loop`. Time is `frame.frame * STEP` from `update`'s
  frame; randomness is `ctx.rng.fork('name')`. Do not pass the whole `ctx` to library
  functions that take a `loop` (`createProp`, `createAnimationController`); pass `{ rng }`
  and tick the returned controller from `update`.
- **No library scaffolds.** Never `createFpsScaffold`, `createRailsScaffold`,
  `createOrbitScaffold`, `createTppScaffold`, `createIsoScaffold`: each builds its own app
  and rAF loop, so it cannot be stepped or captured. Rigs are modules in `src/rig`.
- **Imports.** three only as `'three'` and `'three/addons/...'`. Never `three/src/...`,
  `three/webgpu` or `three/tsl`: three ships as one shared external file and a second
  bundled copy fails the gate. No three imports inside web workers (import maps do not
  apply there).
- **No runtime network.** No CDN URLs, remote assets, or web fonts. Procedural-first; a
  binary asset only when unavoidable and small.
- **Budgets** live in `budgets.json` (for example 100 draw calls on the mobile tier, 160 on
  desktop). The gate counts WebGL draw calls itself, so trimming what `renderer.info`
  reports does not help. Instance, batch or merge.
- **WebGL2 only.** `WebGLRenderer`; GLSL through `ShaderMaterial` / `RawShaderMaterial`; a
  custom material that should fog must include three's fog chunks (`shaders.md`).
- **Shadows.** The environment feature sets the shadow map type (`PCFShadowMap`). Do not set
  `PCFSoftShadowMap`: it is deprecated in this three version and logs a warning.
- **Disposal.** A module disposes what it owns in `dispose()`; never pooled/shared
  materials (`ctx.materials`).
- **Style.** `@tuomashatakka/eslint-config` (no semicolons, single quotes, two-space indent,
  no `any`), a one-line path comment at the top of every file, kebab-case filenames, at most
  666 lines per file, a `// perf:` note at the bottom of non-trivial modules, Semantic Nodes
  CSS for any DOM UI, pointer events only. `bun run lint` has zero warnings allowed.

## Reach for what exists first

Do not reinvent the wheel. Before writing a helper, a shader, a loader, a control or a
post pass, look for one that is already installed, and use it when it fits:

1. **three itself**: core classes and their methods, `MathUtils`, `ShaderChunk`s, and the
   built-in materials extended with `onBeforeCompile` instead of rewritten as a
   `ShaderMaterial` (`shared/amend.ts` lets several features amend one material).
2. **three's add-ons**: `node_modules/three/examples/jsm`, imported as `three/addons/…`
   (`BufferGeometryUtils.mergeGeometries`, `SimplexNoise`, `Sky`, `Water`, `Lensflare`,
   `ConvexGeometry`, `RoundedBoxGeometry`, the post-processing passes, and more). `ls` the
   folder before writing something an add-on may already do.
3. **The scene library**: `grep` `.scenery/api.md` (most of its exports are still unused):
   noise (`createNoise2D`/`createNoise3D`, `fbm`, `ridged`), `smoothstep`, `poissonDisk`,
   instancing, props, materials, lighting rigs, post chains.
4. **This repository's `shared/`**: the ground, the grid, the scatter, the wind, the hour,
   the clouds' shadow and the haze's glow (`SKY_GLOW_GLSL`) are already one signal each.

Write your own only when none of those fits, and say why in a comment where you do. When
the library is the right home for what you wrote, give it there (`lib-stack/`). An add-on
is still bound by the rules above: no network, no second copy of three, no loop of its own,
and it counts toward the draw-call budget like anything else.

## Non-negotiables

- Programmatic generation over static data; more than ~20 hand-typed entries is a smell.
- Mutate, don't reallocate: module-scope scratch `Vector3` / `Matrix4` / `Color`, nothing
  `new` inside `update`.
- Share materials and geometries; instance repeats.
- Pointer events only (`pointer*`), `touch-action: none` on the canvas, `setPointerCapture`
  on drags, `ResizeObserver` not `window.resize`, pixel ratio capped at 2.
- Tone-map exactly once. Colour maps `SRGBColorSpace`; normal/ORM/data maps `NoColorSpace`.
- Build every light, material and particle system in `build`: `createApp` pre-compiles after
  the modules are built.

## Imports and API truth

`import { createApp } from 'threejs-scenes'`; everything else from a subpath (tree-shaking,
and the root barrel only re-exports a handful of names):

| Entry | Holds |
|---|---|
| `threejs-scenes/core` | `createApp`, `AppModule`/`AppOptions`/`App` types, `createClock`, `createStore`, `disposeScene`, `attachPointerGesture`, `projectToScreenUv`, `QUALITY_PRESETS`, `getQualitySettings` |
| `threejs-scenes/primitives` | shapes, extrude/lathe/modifiers/merge/path-tube, `createInfiniteGround`, material presets, `createSeededRng`, `mulberry32`, `hash2`/`hash3`, `createNoise3D`, `poissonDisk`, `createNoiseTexture`, `createInstancedField`, `createBatchedBuildings`, `VoxelChunk`, `greedyMesh` |
| `threejs-scenes/raster` | lighting (`createSun`, `applyEnvironment`, `createLightingRig`), cameras, post (`createComposer`, `createPostPipeline`, grade/glitch/god-rays/DOF/grain passes, `createCinematicLUT`), particles (`createEmitter`, `createGpuEmitter`, curves) |
| `threejs-scenes/compose` | `MaterialPool`, `createProceduralTexture`, `resolveParams`, `pickTopLevel`, props (`defineProp`, `createProp`, `createInstancedProp`, `createPropComposite`), loaders, animation (`createAnimationController`, clips), `createGroup`/layout helpers, `createChunkManager`, `createSkybox` |
| `threejs-scenes/state` | `tweened`, `lerpOnChange`, `EASINGS`, state controllers |

The root also re-exports the shared types (`SceneContext`, `FrameContext`, `SeededRng`).
API truth is `node_modules/threejs-scenes/dist/**/*.d.ts` (and the `.js` next to them for
behaviour). Do not import `threejs-scenes/webgpu`, `/jsx` or `/scaffold`. Gone since 1.7.3:
`startRenderLoop`, `pauseLoop`, `resumeLoop`, `resetLoop`, `setFpsCap`, the `view`
namespace; not reachable from any public entry: `createSegmentStream`, `createParticleEmitter`.

## Upstream three.js API

There is no network in the sandbox; answer upstream questions from the installed sources, not
memory: `node_modules/three/src` (behaviour and defaults), `node_modules/@types/three`
(signatures), `node_modules/three/examples/jsm` (add-ons, imported as `three/addons/...`).
`grep` the class or method before relying on a recalled signature.

## Reference index

Read `core-principles.md` first for any new work; `production-lessons.md` before anything
multi-module.

| File (`references/`) | Load when... |
|---|---|
| `core-principles.md` | starting any three.js work: stack, feature anatomy, input rules, the five questions |
| `production-lessons.md` | architecting a feature: context injection, determinism, disposal ownership, draw budgets, capture |
| `anti-patterns.md` | a quick scan before committing |
| `code-style.md` | writing any TypeScript or CSS: eslint-config specifics, Semantic Nodes |
| `performance.md` | optimizing, draw-call reduction, memory/GC, quality tiers |
| `instancing.md` | many copies of geometry; `InstancedMesh` vs `BatchedMesh`; per-instance attributes |
| `geometry.md` | programmatic meshes: shapes, extrusion, lathe, deformers, merge, tubes, layout |
| `materials.md` | PBR presets, toon, matcap, holographic, sharing and disposal |
| `textures-and-maps.md` | colour/normal/ORM maps, procedural textures, render-target textures |
| `shaders.md` | custom `ShaderMaterial`, fog chunks, `onBeforeCompile`, GLSL chunks |
| `lighting.md` | sun, hemisphere, IBL, shadow tuning, cascaded shadows |
| `particles.md` | emitters (CPU/GPU), GPGPU ping-pong, vertex-shader particles |
| `billboards.md` | sprites and GLSL-billboarded `InstancedMesh`, soft particles |
| `programmatic-generation.md` | seeded factories, noise, Poisson disk, render-to-texture |
| `props-and-factories.md` | props with clips/lights/instancing, composites |
| `animation-system.md` | `AnimationMixer` controller and programmatic clips |
| `streaming-worlds.md` | chunk streaming, pooling, origin rebasing, infinite ground |
| `voxel-geometry.md` | voxel chunks, greedy meshing |
| `post-processing.md` | composer chains: bloom, grade, god rays, DOF, grain, LUT |
| `cinematic-and-streaming.md` | lighting rigs, light cones, triplanar and fullscreen-shader materials |
| `fundamentals.md` | the three.js mental model mapped to this library |

Picks: **new feature** `core-principles` + `production-lessons` + `code-style`; **scatter**
`instancing` + `programmatic-generation` + `streaming-worlds`; **terrain** `streaming-worlds` +
`geometry` + `shaders`; **atmosphere** `lighting` + `particles` + `post-processing`.

## When things go wrong

- **Black or empty frame** — camera inside geometry, or no light and the material is not
  `MeshBasicMaterial`. Check `ctx.camera` and what owns the lights.
- **Shader compile error** — uniform names must match; do not redeclare `position` /
  `modelViewMatrix` in a `ShaderMaterial`. **Ignores fog** — missing fog chunks.
- **GC spikes** — `new Vector3()`, captured fresh objects, `Array.from()` in `update`.
- **Z-fighting** — tighten `near` / `far`, offset co-planar surfaces.
- **Capture differs run to run** — wall time, `Math.random`, async arrival order, or cells
  visited in a different order. Fork the rng by label.
- **Draw calls over budget** — instance, batch, or merge; shadow casters and post passes count.
