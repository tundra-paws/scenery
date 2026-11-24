# Shaders here are TSL

Since 2026-11-24 the world is drawn by three's `WebGPURenderer` on its WebGL 2 backend
(`forceWebGL`, in `src/main.ts`) and every material is a node material written in TSL
(<https://threejs.org/tsl/>). Nothing here is GLSL text any more. What follows is what the
port learned, against three 0.184; when it and `node_modules/three/src` disagree, the source
wins.

## The shared layer (`src/world/shared/`)

| Module | Gives |
|---|---|
| `nodes.ts` | `heldVec2/3/4`, `heldColour`, `heldFloat`: a `{ value }` holder the CPU writes each step, as a node. `floatAttribute`, `vec3Attribute`, `vec4Attribute`: typed geometry attributes. `displaceInstances` (below). |
| `lit.ts` | `createLitMaterial(world, params)`: three's standard material, flat and matt by default, shaded by the clouds, hazed, developed. `createUnlitMaterial` for what gives its own light. `material.dye(fn)` changes the surface colour after vertex and instance colours, before light. `material.shown` replaces the way to the screen (the land beyond does). |
| `output.ts` | `developed(light)`: tone-mapped and encoded. `printed(colour)`: encoded only (sky, clouds, stars, haze). `hazed(shown, air)`: the fog, after tone mapping. `drawMirror(on)`: both hand the colour back untouched while the sea's mirror is drawn. |
| `wind.ts`, `daylight.ts`, `cloud-shadow.ts`, `swell.ts`, `cirrus.ts` | `world.wind.nodes` (`drift`, `aloft`, `frame`, `gust`), `world.day.nodes` (every colour and direction of the hour, `skyGlow`), `world.clouds.light(positionWorld)`, `swellNode`, `cirrusCover`. Each is written from the same table the CPU reads. |

## Rules

- **Type nodes.** `Node<'float'>`, `Node<'vec2'>`, `Node<'vec3'>`... from `'three/webgpu'`. A
  bare `Node` has no `.mul`. A colour uniform is typed `'color'` and will not pass as
  `'vec3'`: use `heldColour`, or cast as it does. `attribute(name, 'float')` is typed
  loosely: use the helpers. Some of three's functions return a bare `Node`
  (`sRGBTransferOETF`, `densityFogFactor`, `materialRoughness`): cast once, say why.
- **`positionNode` runs before the instance matrix.** It is worked out in the one copy's
  space, like GLSL's `begin_vertex` was. Right for a mesh that is not instanced (the wood,
  the rigs). For an instanced mesh that must move in the world's space (grass leaning
  downwind whichever way it was turned), use `displaceInstances(material, placed => ...)`,
  which is built after three's instancing node. The shadow three draws of a material does
  not go through it, so use it only for what casts none; `positionNode` does reach the shadow.
- **Instance matrices are attributes here.** three would keep a small mesh's matrices in a
  uniform array named after a node made for that one draw, so no two instanced meshes, and no
  two passes of one, could share a program (this world linked ninety). `main.ts` tells the
  backend there is no room for uniform arrays. Leave that line alone.
- **Programs are shared by generated code.** Two materials made alike on geometries with the
  same attributes are one program, whatever they are named, in every pass (picture, shadow,
  mirror). The gate allows 40; the world uses 20. A new `createLitMaterial(world)` on an
  instanced stone costs none. A new kind of material costs one, plus one if it casts a shadow.
- **Every material ends in `output.ts`.** The renderer is set to no tone mapping and linear
  output, so there is no pass over the finished frame and the canvas keeps its own
  antialiasing. `createLitMaterial` does it for you. A material with its own `fragmentNode`
  (sky, clouds, stars, sea) must end in `printed` or `developed`, and in `hazed` if it is on
  the ground. `scene.fog` is not set: the haze is `hazed`.
- **Per-instance data** beyond matrix and colour is an `InstancedBufferAttribute` on the
  geometry, read with `floatAttribute` / `vec3Attribute` (`aReach`, `aCloud`). Sized points do
  not exist: the stars are one instanced triangle each, sized in pixels in `vertexNode`.
- **Branches and lookups.** `If(cond, () => {...})` inside `Fn(() => {...})`, on a
  `.toVar()`. Inside a branch, sample with an explicit level: `texture(map, uv, float(0))`.
- **A render target's texture is read upside down** from what a GL projection gives: the
  sea's mirror flips `v` (`water/shader.ts`). A nested `renderer.render` from an object's
  `onBeforeRender` works (`water/mirror.ts`); hold each light's `shadow.autoUpdate` off
  round it or the shadow map is drawn again.
- **Determinism is unchanged.** Time reaches a shader through a held number set from
  `frame.frame * STEP`. Do not use TSL's `time`.

## Looking at what was generated

In a scratch script: load the page as `scripts/capture.ts` does and read
`renderer._pipelines.programs.vertex.keys()` (the GLSL of every vertex stage) and
`renderer._pipelines.caches` (which pairs are linked). Wrapping
`renderer._pipelines.getForRender` shows which objects share which program.
