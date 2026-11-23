# Production Lessons

Hard-won patterns distilled from a shipping three.js project. Read this when
architecting anything beyond a single demo: it captures the conventions that keep a
multi-module scene maintainable, deterministic, and leak-free.

## Architecture

- **Context injection, not globals.** Every scene module is a factory returning an
  `AppModule`: `{ name, build(ctx), update?(state, frame, ctx), dispose() }`.
  `ctx` (`SceneContext`) carries `{ scene, camera, renderer, rng, loop, ground?, materials?, models? }`.
  Modules never reach for globals — this kills init-order bugs and keeps modules
  steppable headless. (`ctx.loop` exists but is off limits in this repo; see below.)
- **One frame loop.** `createApp` (from `threejs-scenes`) builds the renderer, scene,
  camera, seeded rng, store, clock and the one shared loop. Each simulation tick flows
  state through every `module.update(state, frame, ctx)`, then `onFrame`, then one
  render. `app.tick(realDelta?)` pumps the simulation by hand — that is how captures
  are stepped. Modules read state; input goes back through `setState` / `dispatch`,
  never straight into the scene.
- **Metadata tagging for introspection.** Tag top-level objects with
  `obj.userData.module = name` when adding them. A click-to-inspect raycaster can
  then walk `object.parent` up to the scene-direct child and map a hit back to its
  owning module — `pickTopLevel(scene, camera, ndcX, ndcY)` from `threejs-scenes/compose`
  does the walk.
- **Lazy resource building.** Texture libraries and model loaders build on first use,
  not at import. Keeps cold-start cheap.

## Determinism

- **Time is the frame.** `update` receives `frame: { delta, elapsed, frame }`. Derive
  time as `frame.frame * STEP` (the repo's fixed-step constant). The clock is
  `createClock({ mode: 'fixed', step, maxSubSteps })`: in `'fixed'` mode every delta is
  exactly `step`, so tick count — not wall time — drives the sim. No `Date.now`,
  `new Date`, `performance.now`, `setTimeout` / `setInterval`, `requestAnimationFrame`,
  and not `THREE.Clock` (deprecated in r183, wall-clock based).
- **Seed once, fork per consumer.** The root `createSeededRng(seed)` is forked per module
  via `ctx.rng.fork('name')` (label-hashed state). The `SeededRng` API is
  `next() / range(min, max) / int(minInclusive, maxInclusive) / pick(items) / fork(label)`.
  Same seed + same module label ⇒ identical output regardless of build order. Essential
  for reproducible nightly captures and regression diffs. Adding a feature must not
  reshuffle the features built after it — that is why every feature forks its own stream.
- **Order-independent streams for streamed content.** Content that appears when the camera
  arrives (chunks) must be a function of its coordinates, not of arrival order. A fork derives
  from the parent's seed and the label only, never from how much the parent has consumed, so
  ``rng.fork(`chunk:${cx}:${cz}`)`` gives the same stream for a cell whenever it is built.
  `hash2(x, z)` / `hash3` (from `threejs-scenes/primitives`) are stateless unseeded hashes
  in [0, 1) for cheap per-cell jitter.
- **Procedural detail over assets.** Surface variation comes from `CanvasTexture` /
  `DataTexture` painted with seeded noise (grass blades, wood grain, stone mottle), not
  image files. Detail maps are near-white luminance (≈1.0) so `paletteColor × detail`
  preserves saturation — the texture adds grain, not colour. Zero network assets, tiny
  memory, deterministic.

## Disposal — the #1 footgun

- **Dispose only what you OWN.** Pooled/shared materials (`ctx.materials`, a
  `MaterialPool`) are NEVER disposed — disposing a shared `MeshStandardMaterial` nukes
  every mesh referencing it. A module disposes the geometry *it* created and leaves
  library/shared materials and geometry untouched.
- **`disposeScene(root)` disposes everything under `root`**, shared materials included
  (it walks every mesh and every texture-valued material property and uniform). Use it
  only on a subtree whose materials are all yours. `createProp(...).dispose()` calls it
  too, so a prop built from pooled materials will dispose them.
- **Track shared ownership with a Set.** When an assembly reuses geometry across mirrored
  twins, dedupe disposal through a `Set<object>` so you never double-dispose.
- **Remove, then dispose.** `obj.removeFromParent()` before freeing, so the scene does
  not keep a reference to a dead GPU resource.
- **Mixers need `uncacheRoot`.** `AnimationMixer.stopAllAction()` then
  `mixer.uncacheRoot(model)` on teardown, or clip caches leak. An
  `AnimationController`'s `dispose()` does this.
- **Render targets and textures** you allocate (`WebGLRenderTarget`, `DataTexture`,
  `CanvasTexture`, `Data3DTexture`) are disposed by you.

## Performance

- **Draw-call budget is real.** The budgets live in `budgets.json` (for example 100 draw
  calls on the mobile tier, 160 on desktop) and the gate counts WebGL draw calls itself,
  so trimming what `renderer.info` reports does not help. Default to `InstancedMesh`
  (one geometry, many matrices) or `BatchedMesh` (varied geometries, one material)
  before adding a second `Mesh`. Recompose, don't accumulate.
- **Flat-shaded low-poly.** `flatShading: true` + low segment counts (a cone at
  `radialSegments: 6`, not 32). Detail comes from form and texture, not smooth
  curvature — cheaper geometry, distinctive look, and flat materials pool cleanly.
- **No per-frame allocation.** Particle systems use deterministic phase math
  (`age = (t * speed + seedPhase) % 1`) instead of birth/death lists — zero garbage.
  Keep module-scope scratch `Object3D` / `Color` / `Vector3`; never `new` inside `update`.
- **Bounding volumes once.** `computeBoundingBox()` + `computeBoundingSphere()` at
  finalize time; frustum culling needs the sphere.
- **No shader compile stalls.** `createApp` pre-compiles the scene after building the
  modules, so build everything (lights, materials, particle systems) in `build`.

## Post-Processing

- **Chain order:** `RenderPass → UnrealBloomPass → ShaderPass(grade) → OutputPass`.
- **Grade in linear HDR**, before tone-mapping. Tint, contrast (around mid-grey),
  saturation, soft radial vignette, seeded grain, and radial chromatic aberration
  (`split ∝ dot(centerOffset, centerOffset)` so it grows toward the corners) all run
  scene-referred.
- **Tone-map exactly once, at `OutputPass`.** If a composer is active, do NOT also set
  `renderer.toneMapping` — you'll double-correct. Keep one composer per scene.
- The render call belongs to the app (`createApp`'s `render` option), not to a feature.
  See `post-processing.md`.

## Robustness / Headless

- **DOM-guard procedural textures.** `if (typeof document === 'undefined') return null`
  so a headless test degrades to flat colour instead of crashing. The library's
  `createNoiseTexture` and `createProceduralTexture` already return `null` that way.
- **Asset loaders never crash the scene.** A missing/malformed model returns an empty
  instance; modules fall back to procedural stand-ins. Per-asset try/catch, warn, continue.
- **Never depend on async completion.** A capture steps `app.tick()`; anything that
  resolves "later" (promises, image decode) lands on a different tick each run.

## Registry / Param Coercion (for config-driven content)

- **`as const satisfies Record<...>` registries** (bases, modifiers, palettes, presets)
  give type inference + exhaustiveness checks.
- **Coerce, never throw.** `resolveParams(spec, given)` (from `threejs-scenes/compose`)
  clamps numbers to `[min, max]`, validates enums against their option list, and falls
  back to the default for anything malformed. A `ParamSpec` is
  `{ kind: 'number' | 'int', default, min?, max? } | { kind: 'boolean' | 'string', default } | { kind: 'enum', default, options }`.
  A bad knob degrades to a sane default instead of exploding.
