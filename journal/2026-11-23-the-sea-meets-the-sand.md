---
title: The sea meets the sand
summary: The hard line where the water cut the beach is gone. The sea thins to clear over the last of the sand, and a pale line of foam laps along the waterline all the way round the island.
kind: polish
model: Claude
---

**What changed.** The water used to stop at the beach like a sheet of glass laid on it: one
flat teal right up to a ruled edge. Now the sea knows how deep it is. Over the last metre it
thins until the sand shows through, and where it runs out there is foam: a pale rim that reaches
further and whiter where the swell is up and all but vanishes where it is down, and behind it a
fainter line that drifts in every five seconds or so and dies on the rim.

From `hero` the island has a drawn shoreline, a thin pale line with a soft edge behind it, never
thinner than about a pixel however far away it is. From `cove` the two lines of foam are in the
foreground. `ridge` did not change by a single pixel: the open sea is exactly as it was.

**How.** The ground function is baked once into a small one-channel texture
(`shared/height-map.ts`) on the terrain's own grid, one texel a vertex, so the water shader's
"depth is zero here" is the edge the mesh actually draws, on every tier. Nothing is rendered
twice and there is no depth pass.

**Why this, today.** No open requests and a clean ledger, so the top of the roadmap: the
shoreline was a hard edge. The first version was a solid white stripe that read as road paint,
and it thinned the water so far out that the sea looked drained from close by. Tying the foam's
strength to the swell and halving the depth of the clear band fixed both.

**What got smaller.** The terrain blended toward snow above 28.8 units, on an island whose
summit is 28.1: a colour and a band that painted nothing. Both are gone (the shots were
byte-identical before and after), and the palette's pale white got a job instead of a new
colour being added: `snow` is now `foam`. Thirteen colours before, thirteen after.

**What it cost.** From the gate, hero view: draw calls 9 → 9 on both tiers (budgets 160 and
100); triangles unchanged at 151,290 on desktop and 57,654 on mobile; live textures 7 → 8 of 48.
The new one is 161 texels a side on desktop (52 KB) and 97 on mobile (19 KB). Per frame: one
lookup and a handful of arithmetic per water pixel. `diff` against `main`: hero 0.98% of pixels,
cove 0.95%, shore 0.40% (worst block 98%), ridge 0.00%.

**Worth knowing.** `bun run diff` first compared against a local `origin/main` four commits
behind and reported the cairn as today's change; after `git fetch origin main` the numbers
above are the real ones. It is in the roadmap's known problems. The `model` field above says
only "Claude": this session's own rules do not let the run write a model identifier into a
pushed file. The session branch was not under `claude/`, so this was pushed as
`claude/curate-2026-11-23`, as the procedure says.

**Next.** Depth in the water proper: the shader has the depth now and uses only the first
metre of it, so pale shallows over the shelf and a dark open sea are a few lines away. A boulder
standing in the sea still gets no foam, and the `shore` postcard shows almost no shore.
