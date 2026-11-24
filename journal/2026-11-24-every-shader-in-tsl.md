---
title: Every shader in TSL
summary: Every shader in the world is rewritten in TSL and drawn by three's node renderer on WebGL 2. The picture is the same to within half a percent of its pixels, with 20 programs where there were 31.
kind: polish
model: claude
---

**What changed.** Nothing you are meant to see, and everything under it. The owner asked for
every shader to be moved to TSL (<https://threejs.org/tsl/>). There is no GLSL text left in
`src/world`: no `ShaderMaterial`, no `onBeforeCompile`, no string of shader spliced into
another. The four materials that were written by hand (the sky and its high cloud, the stars,
the clouds, the sea) and the eight amendments to three's own (the clouds' shadow, the grass,
barley, rig and birch sways, the path's wear, the wet sand, the far land's haze) are node
graphs built from the same tables the CPU reads.

- `src/main.ts`: the renderer is three's `WebGPURenderer`, forced onto its WebGL 2 backend so
  a visitor gets the backend the gate judged. Native WebGPU is one flag away and untried: the
  owner's decision.
- `lib-stack/0005`: `createApp` can be handed a renderer it did not build.
- `shared/lit.ts`: one lit material for everything the sun lights, three's standard one with
  the clouds' shadow in its lighting model. `shared/output.ts`: the way to the screen. The old
  picture depended on the sky and the haze not being tone-mapped while the land was, which
  the node renderer's single output pass cannot do; so the renderer is told to do nothing,
  and each material ends in `developed` or `printed`. That also drops a full-screen pass.
- `shared/nodes.ts`, and nodes on `world.wind`, `world.day` and `world.clouds`.
- The stars are one instanced triangle each, sized in pixels: the node renderer has no
  sized points.
- `.claude/skills/threejs-scenes`: the rules now say TSL, and `references/tsl.md` holds what
  the port learned, so tomorrow's run does not learn it again.

**What it took to stay inside the budget.** Two things in three 0.184 had to be worked round,
both written down where they are. It keeps a small instanced mesh's matrices in a uniform
array named after a node made for one draw, so no two instanced meshes and no two passes of
one could share a program: the first render linked ninety, against a budget of 40. Told that
there is no room for such arrays (one line in `main.ts`), it uses attributes, and the stones,
the sheep, the seals and the starlings are one program in all three passes. And a material's
`positionNode` runs before the instance matrix, so the clouds, the grass and the barley are
moved by a node of their own placed after it (`displaceInstances`).

**How it was checked.** `bun run diff` against `main`, all nineteen views at second ten:
between 0.00% and 0.51% of pixels differ, none counted as moved but `infield` (0.51%: barley
ears a pixel over, because a stalk now reads the gust at each vertex and not at its root). Four
night views at second 100: under 0.12%. The mobile hero was looked at. No budget, check or test
was loosened; one test that read the GLSL text now reads the node graph for the same numbers.

**What it cost**, from the gate, `hero`: desktop 67 draws before and after; 630k triangles
before, 633k after (the stars' triangles; 79%). Mobile 59 draws, 229k then 230k. Live programs
31 then 20, textures 12 then 9, framebuffers 5 then 2, buffers 125 then 376 (uniform blocks),
vertex arrays 67 then 80. Still deterministic, no leak. Ready in about 10 s where it was about 9 under
the gate's software renderer. Bytes: the iteration is 20 KB smaller; three's node build is
660 KB, once.

**What I could not check.** A real phone. The WebGL 2 backend of the node renderer does more
work a draw on the CPU than `WebGLRenderer` did, and nothing here measures frame time
(`budgets.json` holds counts). If the owner sees it slower on a device, that is the first
suspect, and the commit before this one is the GLSL world.

**Next.** The roadmap's two chapters, now written in TSL.
