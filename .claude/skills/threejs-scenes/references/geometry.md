# Geometry — programmatic meshes & grouping

Build bespoke geometry in code instead of importing models. Factories live in
`threejs-scenes/primitives` (shapes, extrusion, lathe, deformers, merge, tubes, graphs,
ground) and `threejs-scenes/compose` (grouping and layout helpers).

## Shape builders

Return a `THREE.Shape` you feed to extrusion or `THREE.ShapeGeometry`:

```ts
import { roundedRectShape, polygonShape, starShape, gearShape, ringShape } from 'threejs-scenes/primitives'

roundedRectShape(width, height, radius)
polygonShape(sides, radius)
starShape(points, outerRadius, innerRadius)
gearShape(teeth, outerRadius, innerRadius, toothDepth = 0.25)  // bored center
ringShape(outerRadius, innerRadius)                            // annulus with a hole
```

## Extrusion & lathe

```ts
import { createExtrudedMesh, extrudeAlongPath, createLatheMesh, starShape } from 'threejs-scenes/primitives'

// from a shape OR raw 2D points; centered + normals computed; casts/receives shadow
const badge = createExtrudedMesh({ shape: starShape(5, 1, 0.5), depth: 0.6, bevel: true, material })
const pipe  = extrudeAlongPath(profileShape, new THREE.CatmullRomCurve3(points), { steps: 64 })
const vase  = createLatheMesh([ [ 0.2, 0 ], [ 0.6, 0.4 ], [ 0.3, 1 ] ], { segments: 32 })  // x=radius, y=height
```

`createExtrudedMesh` options: `{ shape | points, depth, bevel, bevelThickness, bevelSize,
bevelSegments, steps, curveSegments, material }`. Default material is a neutral
`MeshStandardMaterial`. `createLatheMesh` options: `{ segments, phiStart, phiLength, material }`.

## Vertex deformers (in place, build-time)

Mutate the `position` attribute, recompute normals, return the same geometry for chaining:

```ts
import { applyTwist, applyTaper, applyBend, displaceByNoise } from 'threejs-scenes/primitives'

applyTwist(geo, Math.PI, 'y')          // rotation grows 0→angle along the axis
applyTaper(geo, 0.4, 'y')              // perpendicular axes scale 1→factor
applyBend(geo, Math.PI / 2, 'x')       // bend into an arc
displaceByNoise(geo, { amp: 0.25, freq: 1.2, rng: ctx.rng.fork('rock') })  // along normals; or { seed }
```

`displaceByNoise` takes `{ amp, freq, seed }` or a `SeededRng` as `rng` — same seed, same
rock. In a feature pass the forked `ctx.rng`.

## Addon wrappers (return a NEW geometry)

Thin wrappers over `three/addons` modifiers + `BufferGeometryUtils`:

```ts
import { simplifyGeometry, tessellateGeometry, edgeSplit, mergeVertices, recomputeNormals } from 'threejs-scenes/primitives'

simplifyGeometry(geo, targetVertexCount)
tessellateGeometry(geo, maxEdgeLength, iterations)
edgeSplit(geo, cutOffAngleRad)         // keep hard creases sharp under flat shading
mergeVertices(geo, tolerance)          // weld duplicates → indexed
```

These are expensive — run at build, never per frame.

## Merging & grouping

```ts
import { mergeMeshes, mergeGeometryList } from 'threejs-scenes/primitives'
import { createGroup, layoutGrid, layoutRadial, layoutStack, groupBounds } from 'threejs-scenes/compose'

const batched = mergeMeshes(meshes)    // → one Mesh per material; bakes each local matrix
const g = createGroup([ a, b, c ], { position: [ 0, 1, 0 ], scale: 2 })
layoutGrid(objects, { cols: 4, spacing: 2, plane: 'xz' })
layoutRadial(objects, { radius: 5, faceCenter: true })
layoutStack(objects, 'y', 1)
const box = groupBounds(group)         // THREE.Box3
```

## Paths and tubes

```ts
import { parallelTransportFrames, createPathTube } from 'threejs-scenes/primitives'

const tube = createPathTube(curve.getPoints(120), {
  radius: (t, i) => 2 + Math.sin(t * 14) * 0.3,   // or a number
  radialSegments: 24,
  inward: true,                                    // normals face the axis: fly through it
})
scene.add(new THREE.Mesh(tube, material))
```

`parallelTransportFrames(points)` returns twist-free `{ tangents, normals, binormals }`.
Roots, rivers-as-ribbons, cables, tunnels.

## Merge vs instance — pick one

- **`mergeMeshes`** — many *different*, *static* shapes (a building, scattered rocks of
  varied geometry). Collapses to one draw call per material. You lose per-object culling and
  independent movement.
- **`createInstancedField` / `createBatchedBuildings`** (see `instancing.md`) — the *same*
  geometry repeated many times, especially if instances move or need per-instance data.

Rule of thumb: repeated identical geometry → instance; a fixed pile of distinct static
parts → merge.

## Disposal

Every geometry you build owns GPU memory. Dispose it on teardown — three.js never
auto-frees. Deformers mutate in place so there is one geometry to dispose; addon wrappers
create a new geometry, so dispose the original if you discard it. `mergeMeshes` bakes the
sources into new geometry: dispose the source geometries you no longer use.
