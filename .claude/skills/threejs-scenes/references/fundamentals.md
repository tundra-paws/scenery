# Fundamentals — three.js primitives & scene building blocks

Distilled from the three.js manual's fundamentals chapters, mapped onto this library's
modules. Read this when you need the *conceptual* model behind a feature; read the
per-module reference for the API. For upstream source, read `node_modules/three/src`,
`node_modules/@types/three` and `node_modules/three/examples/jsm`.

| Manual chapter | What to know | In this repo / library |
| --- | --- | --- |
| Fundamentals | The mandatory quartet: `Renderer` + `Scene` + `Camera` + a render loop. Mesh = `Geometry` + `Material`. Lights affect only light-responsive materials. | `createApp` builds all four and hands them to modules as `ctx` — [production-lessons.md](./production-lessons.md). |
| Primitives | Built-in geometries: Box, Sphere, Cylinder, Cone, Torus, TorusKnot, Plane, Circle, Ring, Dodeca/Icosa/Octa/Tetrahedron, Lathe, Extrude, Shape, Tube, Edges, Wireframe. Reuse ONE geometry across many meshes. | `threejs-scenes/primitives` — [geometry.md](./geometry.md) wraps Extrude/Lathe/Shape + modifiers. `threejs-scenes/compose` — [props-and-factories.md](./props-and-factories.md) bundles primitives into reusable props. |
| Scenegraph | The scene is a tree; each node's transform is relative to its parent. Use `Group`/`Object3D` pivots for orbits and turrets. `updateMatrixWorld` flows top-down. | `createGroup` / `layoutGrid` / `layoutRadial` in `compose`; `pickTopLevel` walks the tree to the owning module. |
| Materials | `MeshBasic` (unlit) → `MeshLambert`/`MeshPhong` (cheap lit) → `MeshStandard`/`MeshPhysical` (PBR: roughness/metalness) → `MeshToon`/`MeshMatcap` (stylized). Share material instances; tone-map once. | [materials.md](./materials.md): `createStandardMaterial` presets, toon, matcap, holographic. `MaterialPool` (`ctx.materials`) owns sharing + disposal. |
| Textures | UV-mapped images: `map`, `normalMap`, `roughnessMap`, `aoMap`, `emissiveMap`. Mind `colorSpace` (SRGB for color maps, NoColorSpace for data), `wrapS/T`, `repeat`, mipmaps, anisotropy. | `createNoiseTexture` (primitives); `createProceduralTexture` cache (compose) — [textures-and-maps.md](./textures-and-maps.md). |
| Lights | Ambient/Hemisphere (fill) · Directional (sun, parallel) · Point (bulb) · Spot · RectArea. Lights cost real GPU time — prefer an IBL environment + one key light over many dynamic lights. | [lighting.md](./lighting.md): `createSun`, `createHemisphereFill`, `applyEnvironment` (raster). |
| Cameras | `PerspectiveCamera(fov, aspect, near, far)` for 3D depth; `OrthographicCamera` for iso/2D/HUD. Keep near/far tight to preserve depth precision. | The camera rig is framework code; `ctx.camera` is the live camera. |
| Shadows | Shadow maps: `castShadow` / `receiveShadow`, and size the light's shadow *camera frustum* to the scene. Tune `bias` / `normalBias` to kill acne & peter-panning. The shadow map type is the environment feature's. | `createSun` ships a tuned shadow frustum + bias defaults. |
| Fog | `Fog` (linear near/far) or `FogExp2` (exponential density) fades distance to a colour — match the fog colour to the scene background. Cheap depth cue for open worlds. Custom `ShaderMaterial`s need the fog chunks. | `scene.fog`; [shaders.md](./shaders.md); chunk streaming radius in [streaming-worlds.md](./streaming-worlds.md). |
| Render Targets | Render into a `WebGLRenderTarget` texture instead of the screen — the basis of post-processing, mirrors, portals, picking, and depth/normal capture. Attach a `DepthTexture` to read scene depth. | [post-processing.md](./post-processing.md): `createComposer` binds a DepthTexture so DOF/god-rays sample depth. |
| Custom BufferGeometry | Author `position`/`normal`/`uv`/`color` `BufferAttribute`s directly; index to share vertices. Recompute normals after deforming. The escape hatch when no primitive fits. | `displaceByNoise` / `recomputeNormals` / `mergeGeometryList`; `greedyMesh` builds geometry from scratch — [voxel-geometry.md](./voxel-geometry.md). |
| Physics | three.js has NO physics engine. The pattern: step the physics world each tick, copy body transforms onto the matching `Object3D`s. Keep render and sim decoupled. | Step it in the module's `update` with a fixed delta (`STEP`), never wall time. A physics library must be added as a dependency, not loaded from a CDN. |

## The minimum every feature needs

```ts
// src/world/features/<name>/index.ts
export function createThing (_world: World): AppModule {
  const owned: { dispose (): void }[] = []
  return {
    name: 'thing',
    build (ctx) {
      // 1. primitives + materials → meshes        (Primitives, Materials)
      // 2. parent into Groups for relative motion  (Scenegraph)
      // 3. light only if no other feature owns it  (Lights, Shadows)
      // 4. everything created here goes in `owned` (dispose path)
    },
    update (_state, frame) { /* per tick, time = frame.frame * STEP */ },
    dispose () { for (const o of owned) o.dispose() },
  }
}
```

## Cross-references

- API for code-built geometry: [geometry.md](./geometry.md)
- Reusable prop definitions: [props-and-factories.md](./props-and-factories.md)
- Material starting points: [materials.md](./materials.md)
- Texture/UV detail: [textures-and-maps.md](./textures-and-maps.md)
- Lighting: [lighting.md](./lighting.md)
- Render targets in practice: [post-processing.md](./post-processing.md)
- Scratch-built geometry at scale: [voxel-geometry.md](./voxel-geometry.md)
