---
title: Room for node materials
summary: The build and the gate's contract can now ship three's node renderer and TSL as shared files, so the world's shaders can move to TSL. Nothing in the world changes today.
kind: framework
model: claude
---

**What changed.** Nothing you can see. The owner asked today for every shader in the world to
be rewritten in TSL (three's shading language, <https://threejs.org/tsl/>). TSL is not a
library on top of the renderer the world uses: node materials are drawn only by three's
`WebGPURenderer`, which lives in `three/webgpu`, and the language itself in `three/tsl`. The
framework allowed neither. The build left only `three` to the import map, and the gate's
contract refused any other shared file and any other bare import. So the request starts here,
in a change of its own (rule 7), and the shaders follow in a world change.

- `vite.config.ts`: `three`, `three/webgpu` and `three/tsl` are all left external. Which of
  three's builds is shipped is read off the bundle. A world that imports only `three` gets
  exactly what it got yesterday: `three.module.min.js` and `three.core.min.js`, one import-map
  entry. A world that imports `three/webgpu` or `three/tsl` gets `three.webgpu.min.js`,
  `three.tsl.min.js` and the same core, and the import map sends all three names there:
  `three` and `three/webgpu` are then one module, so there is still exactly one three.
- `scripts/gate/contract.ts`: the vendor directory may hold those two more of three's own
  build files, still checked byte for byte against npm's. A chunk may import a bare name only
  if the page's import map sends it to one of three's files in the vendor directory; the
  three names are the only ones it may. A bundled copy of three still fails.
- `CLAUDE.md`: the import rule names the two new entries.

**Why this is not loosening a check.** No budget moved and no check was removed. The contract
still demands one three, npm's bytes, nothing off the site and nothing bundled. It admits two
more files of the same package at the same version, which it verifies the same way.

**What I measured before asking for it.** A spike on today's world with the custom shaders
switched off, drawn by `WebGPURenderer` on its WebGL 2 backend (`forceWebGL`) under the gate's
software browser: it boots (8.3 s to ready, as before), the picture is identical under two
clocks, nothing leaks, a drag orbits and W walks. The gate's census still counts, because the
backend is WebGL 2. One number failed: 45 live programs against a budget of 40, with the sea,
the sky and the clouds not yet drawn. The cause is known: under that renderer an instanced
mesh of up to about a thousand instances keeps its matrices in a uniform array sized by its
count, so no two instanced meshes share a vertex shader. The world change has to make them
share (one size of array for all of them, or attributes of its own) and stay inside 40. The
budget is not being raised for it.

**What it costs.** For this change, nothing: the build is byte for byte the same shape. For the
world change that follows: 660 KB of three, once for the three version (the node build is
637 KB against the classic one's 365 KB, and the classic one is then no longer loaded).

**Next.** The world change: the renderer in `src/main.ts`, a library improvement so
`createApp` can be handed a renderer (`lib-stack/0005`), and every material rewritten: the
sky, the stars, the clouds, the sea and its mirror, and the eight amendments to three's own
materials (the clouds' shadow, the sways, the path's wear, the wet sand, the haze). It will
run on the WebGL 2 backend everywhere, visitors included, so that what the gate judges is
what a visitor gets; turning on native WebGPU is a decision for the owner, later.
