# Voxel Geometry

How to build performant voxel worlds in vanilla three.js.

## Data Model

Voxels live in a flat `Uint16Array` (id per cell) sized `size³`. `VoxelChunk` and
`greedyMesh` are in `threejs-scenes/primitives`:

```ts
import { VoxelChunk, greedyMesh, createNoise3D } from 'threejs-scenes/primitives'

const chunk = new VoxelChunk(16)               // .size, .data (Uint16Array)
chunk.set(x, y, z, id)                         // id 0 = empty; out of bounds get() returns 0
chunk.get(x, y, z)
chunk.fill(id)
chunk.forEach((x, y, z, id) => { /* visit voxels */ })

const noise = createNoise3D(seed)              // fill from a seeded field
for (let z = 0; z < 16; z++) for (let x = 0; x < 16; x++) {
  const h = Math.floor(4 + noise.fbm(x * 0.1, 0, z * 0.1, 3) * 6)
  for (let y = 0; y < h; y++) chunk.set(x, y, z, y === h - 1 ? 2 : 1)
}

const geometry = greedyMesh(chunk)             // indexed BufferGeometry with normals + vertex colors
const mesh = new THREE.Mesh(geometry, sharedVoxelMaterial)   // material with vertexColors: true
```

Encode (id, light, metadata) into bit-packed values if needed.

## Greedy Meshing

Naive meshing emits 6 quads per voxel — millions of triangles for a small world. Greedy
meshing merges coplanar adjacent faces of the same id into maximum-size rectangles per axis
slice. Typical reduction: 10–30× fewer triangles. The algorithm walks the 3 axes, slicing the
chunk into 2D mask planes, then sweeps each mask emitting the largest possible rectangles of
identical voxel id.

`greedyMesh(chunk)` meshes one chunk in isolation: neighbours outside the chunk count as
empty, so faces on the chunk boundary are always emitted. Colours are derived from voxel ids;
there is no `uv` attribute, so texture atlasing needs your own mesher.

## Smooth Voxels

When the blocky aesthetic is wrong, use marching cubes on a scalar field.
`three/addons/objects/MarchingCubes.js` provides a real-time variant for metaball-style
effects; the table-driven algorithm is ~150 lines for static meshing. For editable terrain,
store the SDF in a `DataTexture` (2D slice atlas) and remesh affected chunks on edit.

## Atlas Texturing

Different voxel ids need different surface looks. Pack all material textures into a single
atlas (painted procedurally), then pass an `aTextureIndex` per-vertex attribute into a
`ShaderMaterial`:

```glsl
// vertex
attribute float aTextureIndex;
varying vec2 vUv;
varying float vTexIdx;
void main () {
  vTexIdx = aTextureIndex;
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}

// fragment
uniform sampler2D uAtlas;
uniform float uAtlasGrid;   // e.g. 4.0 for a 4x4 grid
varying vec2 vUv;
varying float vTexIdx;
void main () {
  float col = mod(vTexIdx, uAtlasGrid);
  float row = floor(vTexIdx / uAtlasGrid);
  vec2 atlasUv = (vec2(col, row) + fract(vUv)) / uAtlasGrid;
  gl_FragColor = texture2D(uAtlas, atlasUv);
}
```

## Ambient Occlusion (Per-Vertex)

Cheap voxel AO: for each face vertex, count how many of the 3 adjacent voxels (corner + 2
side neighbors) are solid. Map to a darkening factor (0 = no AO, 3 = full corner). Store as a
vertex attribute and multiply into the fragment colour. Dramatic depth for almost no cost.

## Voxel Perf

- One `BufferGeometry` per chunk; one `Mesh` per chunk; share one material across all chunks.
- Rebuild only chunks that changed; never rebuild the world.
- Remesh synchronously inside the tick (a 16³ chunk is cheap); see `streaming-worlds.md` for why
  not to generate off-thread by default and for chunk streaming and pooling.
- Texture variation via vertex colors or a per-vertex `aTextureIndex` attribute.
- For editable worlds, mark adjacent chunks dirty when a face on a chunk boundary changes —
  they need to remesh too because their face visibility now differs.
- Dispose each chunk's geometry when it is replaced or removed.

## Common Pitfalls

- Naive meshing (6 quads per cell) — works for 4×4×4 demos, dies at 16³.
- Updating the entire chunk's geometry every frame — only rebuild on edit.
- Voxel ids are `uint16` to fit material variety past 256.
- Not marking neighbor chunks dirty on edge-voxel edits.
- Per-voxel `Mesh` instances — death by 1000 draw calls.
