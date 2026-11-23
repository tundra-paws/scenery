# Performance

Diagnose before optimizing. Most three.js perf problems fall into one of three
buckets: too many draw calls, too much fragment work, or too much GC pressure.

## Bottleneck Taxonomy

- Many draw calls → draw-call problem. Budgets live in `budgets.json` (for example 100
  on the mobile tier, 160 on desktop); the gate counts WebGL draw calls itself, so
  trimming what `renderer.info` reports does not help. `renderer.info.render.calls` is
  still a useful local read.
- `triangles` huge, calls low → geometry problem (too many verts, no LOD).
- Neither, but FPS is bad → fragment problem (shaders, overdraw, post-processing,
  oversized shadow maps).
- Periodic stutters with low average frame time → GC pressure or shader recompile stalls.

## Draw Calls

Strategies in order:

1. **Share materials.** Creating a new material per mesh defeats three.js's
   auto-batching.
2. **Merge static geometry** with `mergeGeometries` from `BufferGeometryUtils`.
3. **Instance dynamic repeats** with `InstancedMesh`.
4. **Batch varied geometries** sharing a material with `BatchedMesh`.
5. **Texture atlas** to collapse material variants into one.

```ts
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'

const merged = mergeGeometries([ geo1, geo2, geo3 ])   // null if attributes mismatch
const mesh = new THREE.Mesh(merged, sharedMaterial)
```

Every shadow-casting light renders the casters again, and every post-processing pass is
a fullscreen draw; both add to the count.

## Fragment Cost

- **Overdraw is invisible until you measure it.** Transparent particles, layered
  post-processing, and full-screen quads stack fragment cost.
- **Shadow map resolution** is fragment cost squared. 2048² is usually plenty; 4096²
  should be justified.
- **Pixel ratio** clamped to 2 max. Retina × pixelRatio 3 = 9× the fragments.
- **Post-processing chain length.** Each pass = one fullscreen fragment shader. Combine
  where possible.

## Memory and GC

- **No per-frame allocations.** Pre-declare scratch `Vector3`, `Matrix4`, `Quaternion`,
  `Color`, `Raycaster` at module scope.
- **Dispose what you own.** Recurse your own subtree, dispose geometries, materials,
  textures, render targets. Three.js does NOT auto-dispose. `disposeScene(root)` from
  `threejs-scenes/core` walks a subtree, shared materials included.
- **Texture memory dominates GPU memory.** A 4K RGBA mipmapped texture = ~85 MB. Keep
  generated textures small (256-512) and power-of-two.

```ts
// disposing a subtree you fully own
import { disposeScene } from 'threejs-scenes/core'

disposeScene(root)       // geometry, material, every texture-valued property/uniform
root.removeFromParent()
```

## LOD and Culling

- **LOD** via `LOD` group with 2–3 detail tiers swapping at distance:

  ```ts
  const lod = new THREE.LOD()
  lod.addLevel(meshHigh, 0)
  lod.addLevel(meshMid,  10)
  lod.addLevel(meshLow,  50)
  scene.add(lod)
  ```

- **Frustum culling** stays on for everything except single giant InstancedMeshes
  covering huge area (terrain grass) — disable manually there.

## Profiling Toolkit

- **`renderer.info`** — draw calls, triangles, geometries, textures, programs.
- **Spector.js** — capture and inspect a frame's WebGL calls (browser extension).
- **Chrome DevTools Performance tab** — find JS hotspots, GC events, layout thrashes.
- **`renderer.compile(scene, camera)`** — pre-warms shaders. `createApp` already
  compiles after building the modules, so build everything in `build`.

## Quality Tiers

`threejs-scenes/core` ships tier presets:

```ts
import { QUALITY_PRESETS, getQualitySettings, detectTier } from 'threejs-scenes/core'

// QualityTier = 'mobile' | 'desktop' | 'highEnd'
// mobile:  pixelRatio 1.5, shadowMapSize 1024, chunkViewRadius 2, particleBudget 5000,   maxLights 2
// desktop: pixelRatio 2.0, shadowMapSize 2048, chunkViewRadius 4, particleBudget 50000,  maxLights 4
// highEnd: pixelRatio 2.0, shadowMapSize 4096, chunkViewRadius 6, particleBudget 250000, maxLights 8
const settings = getQualitySettings('mobile')   // { tier, ...preset }
```

`detectTier()` reads `navigator` (touch points, core count, devicePixelRatio). If world
content branches on it, a capture is no longer a function of the seed; take sizes from
what `World` hands you.

## Common Pitfalls

- `new Material()` inside `update` → memory leak + shader recompile stall.
- `setSize` on every resize event without debounce → thrashes the swapchain.
- `lookAt` on a parented object without calling `updateMatrixWorld` first.
- Updating `geometry.attributes.position.needsUpdate = true` every frame on a huge mesh
  — upload a sub-range with `attribute.addUpdateRange(start, count)` (element units,
  then `clearUpdateRanges()` after upload), or move the motion to a vertex shader.
- Setting `transparent: true` on opaque materials disables depth optimizations.
- Adding lights past the scene's current light count triggers a full shader recompile.
- Forgetting to dispose a `WebGLRenderTarget` after post-processing — leaks framebuffer
  memory.
- `setPixelRatio(window.devicePixelRatio)` uncapped on retina mobile — effectively 3×
  the fragment work.
