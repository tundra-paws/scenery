# Anti-Patterns

Quick scan before committing. If your code does any of these, fix it.

## Repo Rules (lint or gate enforced)

- **`Math.random`, `Date.now`, `new Date`, `performance.now`, `setTimeout`,
  `setInterval`, `requestAnimationFrame`, `ctx.loop`** in `src/world/**` or `src/rig/**`.
  Time comes from `frame.frame * STEP`; randomness from `ctx.rng.fork('name')`.
- **The library scaffolds** (`createFpsScaffold`, `createRailsScaffold`,
  `createOrbitScaffold`, `createTppScaffold`, `createIsoScaffold`). Each builds its own
  app and its own rAF loop, so it cannot be stepped or captured.
- **Importing `three/src/...`, `three/webgpu`, or `three/tsl`.** Three ships as one shared
  external file; a second bundled copy fails the gate. Import only `'three'` and
  `'three/addons/...'`.
- **three inside a web worker.** Import maps do not apply there.
- **Runtime network**: CDN URLs, remote assets, web fonts.
- **`PCFSoftShadowMap`.** Deprecated in this three version and logs a warning; the
  environment feature sets `PCFShadowMap`.
- **Exceeding `budgets.json`.** The gate counts draw calls itself.

## Stack

- **Using R3F, Drei, or any React abstraction over the scene graph.** Vanilla three.js only.
- **Mixing WebGPU and WebGL imports.**
- **Writing raw GLSL strings when a `ShaderMaterial` factory pattern would do.** Always
  wrap in `/* glsl */` template literals and compose reusable chunks.
- **A custom material that should fog but omits three's fog chunks.** See `shaders.md`.

## Performance

- **Allocating `Vector3` / `Matrix4` / `Color` inside `update`.** Pre-declare at module scope.
- **Creating a new `MeshStandardMaterial` per mesh** instead of sharing one.
- **Hand-typing arrays of positions, colors, or instance transforms longer than ~20
  entries** instead of using a seeded factory.
- **`setPixelRatio(window.devicePixelRatio)` uncapped on retina.** Always clamp to 2 max.
- **`new Material()` inside `update`** → memory leak + shader recompile stall.
- **Adding/removing lights at runtime** — triggers shader recompile for every affected
  material.
- **Building lazily after the first frame** — `createApp` pre-compiles after `build`;
  materials first seen later stall on compile.
- **Forgetting to dispose textures, materials, geometries, and render targets** you own.
- **Setting `transparent: true` on opaque materials** — disables depth optimizations and
  forces back-to-front sorting.
- **Per-frame `attribute.needsUpdate = true` on a huge buffer** — uploads the entire
  array every frame. Use `attribute.addUpdateRange(start, count)` (and
  `clearUpdateRanges()`), or move the motion into the vertex shader.

## Disposal

- **Disposing a pooled or shared material** (`ctx.materials`, `MaterialPool`).
- **`disposeScene(root)` on a subtree that holds shared materials.**
- **Double-disposing geometry shared between meshes.** Dedupe through a `Set`.

## Instancing

- **Using `InstancedMesh` for varied geometries.** Use `BatchedMesh` instead.
- **Using `BatchedMesh` for one repeated geometry.** Use `InstancedMesh` — cheaper.
- **Setting `frustumCulled = true` on a single InstancedMesh covering a huge area** —
  three.js culls the whole mesh as one unit, which never helps for ground cover.
- **Forgetting `instanceMatrix.needsUpdate = true`** after writing transforms.

## Voxels

- **Naive voxel meshing** — emitting 6 quads per voxel at scale. Use `greedyMesh`.
- **Per-voxel `Mesh` instances** — death by 1000 draw calls.
- **Rebuilding the world every edit** — only remesh affected chunks (and their boundary
  neighbors).

## Camera & Input

- **Using `mousedown` / `mousemove` / `mouseup` or `touchstart` / `touchmove` /
  `touchend`.** Pointer events only.
- **Missing `el.setPointerCapture(e.pointerId)` in `pointerdown`** — drag breaks when the
  pointer leaves the canvas.
- **Forgetting `touch-action: none` on the canvas** — iOS Safari fires native pinch/scroll
  on top of your handlers.
- **Resize handler on `window.resize`** instead of `ResizeObserver`.
- **Moving the camera infinitely** in an open world instead of rebasing the origin around
  a threshold.

## Post-Processing

- **Stacking unrelated effects in one shader.** Keep each pass single-purpose so it can be
  disabled per perf tier.
- **Putting `OutputPass` before effect passes** — corrupts color space.
- **Forgetting the `DepthTexture`** when DOF / god rays need it (`createComposer` attaches
  one by default; `createPostPipeline` needs `withDepth: true`).
- **`composer.setSize()` not called on resize** → blurry/stretched output.
- **Mixing `composer.render()` and `renderer.render()`** in the same frame.

## Particles

- **Using `Sprite` (not `Points` / `InstancedMesh`) for 10k+ particles** — each `Sprite`
  is one draw call.
- **Randomness drawn per particle per frame on the CPU** — pre-bake it into attributes
  once, from a seeded stream.
- **`depthWrite: true` on transparent particles** — they occlude each other weirdly.

## Lighting

- **Using `AmbientLight` as a sole light source** — flattens everything, looks dead. Use
  `HemisphereLight` or IBL.
- **4096² shadow maps "just to be safe"** — usually overkill and tanks mobile FPS.
- **Shadow camera frustum sized to the whole world** — depth precision collapses; shadows
  look chunky everywhere.

## Styling

- **Tailwind, Shadcn, Radix, CSS Modules, styled-components, vanilla-extract, or
  `className` as a styling prop** anywhere in the codebase.
- **Div-soup.** Use HTML5 landmark elements: `header`, `main`, `nav`, `dialog`, `article`,
  `section`.
- **Class selectors when a tag selector would do.** Style `button`, `h1`, `nav a` directly.
