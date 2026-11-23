# Instancing

When and how to use `InstancedMesh` and `BatchedMesh` to collapse draw calls.

## Decision Tree

1. Count < ~50 identical objects → regular `Mesh`. Not worth instancing overhead.
2. Count ≥ 50, single geometry, single material → `InstancedMesh`.
3. Multiple different geometries sharing one material → `BatchedMesh`.
4. Multiple geometries AND multiple materials → group by material, use one
   `BatchedMesh` per material bucket.
5. Need per-instance arbitrary shader data → `InstancedBufferAttribute` on the geometry
   of an `InstancedMesh`. (`BatchedMesh` carries per-instance color via `setColorAt`.)

## The library factories

```ts
import { createInstancedField, createBatchedBuildings } from 'threejs-scenes/primitives'
```

`createInstancedField({ geometry, material, count, radius, seed, hueBase, hueSpread, scaleMin, scaleMax, place })`
returns one `InstancedMesh` with per-instance colors, a `StaticDrawUsage` matrix buffer and
`frustumCulled = false`. Default placement is a seeded radial scatter. Pass `place` for
anything else; it is called once per index with a seeded `rng` function and scratch
`object` / `color` you mutate:

```ts
// src/world/features/meadow/flowers.ts
const rng = ctx.rng.fork('flowers')
const field = createInstancedField({
  geometry, material, count: 4000,
  seed: rng.int(1, 0x7fffffff),                  // same seed → identical field
  place (_i, r, object, color) {
    object.position.set((r() - 0.5) * 80, 0, (r() - 0.5) * 80)
    object.position.y = heightAt(object.position.x, object.position.z)
    object.rotation.y = r() * Math.PI * 2
    object.scale.setScalar(0.6 + r() * 0.8)
    color.setHSL(0.08 + r() * 0.1, 0.7, 0.55)
  },
})
```

`createBatchedBuildings({ geometries, material, transforms, sortObjects?, perObjectFrustumCulled? })`
sizes the `BatchedMesh` from the geometries' vertex/index totals and adds one instance per
`Matrix4` (geometry `i % geometries.length` for transform `i`). Hide an instance with
`batch.setVisibleAt(id, false)`.

## InstancedMesh

Use when one geometry × N transforms. Trees, grass, asteroids, props in a level. Each
instance can have its own matrix and color; richer per-instance data via
`InstancedBufferAttribute`.

Key points:

- Pre-declare scratch `Object3D` + `Color` at module scope; mutate inside the loop,
  never allocate.
- Call `mesh.instanceMatrix.needsUpdate = true` after writing transforms.
- Disable `frustumCulled` when one InstancedMesh covers a huge area — the bounding
  sphere becomes the whole world and culling never helps. For many smaller instanced
  meshes (one per chunk), leave it on and call `mesh.computeBoundingSphere()` after
  placing.
- For static instancing, use `StaticDrawUsage` on the matrix buffer.
- Dispose the geometry and material you created; `mesh.dispose()` frees the instance
  buffers.

## BatchedMesh

Use when N different geometries all share ONE material. Varied buildings, modular pieces,
mixed prop sets. Each instance can be individually shown/hidden via `setVisibleAt(id, bool)`
and updated via `setMatrixAt(id, matrix)`.

- You must know total vertex count and total index count upfront. Pre-sum them from your
  geometry array: `new THREE.BatchedMesh(maxInstanceCount, maxVertexCount, maxIndexCount, material)`.
- `batch.addGeometry(geometry)` returns a geometry ID; `batch.addInstance(geomId)` returns
  an instance ID. Track both.
- `sortObjects` defaults to true (back-to-front) — benchmark with it off; for opaque
  scenes it's often faster off.
- `perObjectFrustumCulled` defaults to true and is usually correct.

## Per-Instance Shader Data

When per-instance values matter to the shader (color tint, animation phase, texture index
into an atlas), expose them as `InstancedBufferAttribute`, filled from a seeded stream:

```ts
const rng = ctx.rng.fork('phases')
const phases = new Float32Array(count)
for (let i = 0; i < count; i++) phases[i] = rng.range(0, Math.PI * 2)
geometry.setAttribute('aPhase', new THREE.InstancedBufferAttribute(phases, 1))
```

Inside the vertex shader (a `ShaderMaterial` already declares `position`, `normal`, `uv`,
and for instanced draws `instanceMatrix`):

```glsl
attribute float aPhase;
uniform float uTime;
void main () {
  vec3 displaced = position + vec3(0.0, sin(uTime + aPhase) * 0.2, 0.0);
  gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(displaced, 1.0);
}
```

`uTime` is set from the frame (`frame.frame * STEP`), never from a clock.

## Real-World Impact

A demo with 9,000 chair meshes dropped to ~300 draw calls after switching to
`InstancedMesh`. The same scene with `BatchedMesh` covering 12 chair variants × 750
instances each renders in 1 draw call.

## Common Pitfalls

- Forgetting `instanceMatrix.needsUpdate = true` after setting matrices.
- Creating a new material per instance — defeats the entire optimization.
- Using `InstancedMesh` for varied geometries (use `BatchedMesh`); using `BatchedMesh` for
  one repeated geometry (use `InstancedMesh`).
- Setting `frustumCulled = true` on a single InstancedMesh covering a huge area — three.js
  culls the entire mesh as one unit, which never helps for ground cover.
