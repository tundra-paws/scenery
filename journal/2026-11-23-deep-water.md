---
title: Deep water
summary: The sea has depth. A pale ring of shallows lies over the shelf around the island, and past the drop the water is dark all the way out to the haze.
kind: polish
model: Claude
---

**What changed.** The sea used to take its colour only from the angle it was seen at: pale teal
at a glance, dark teal straight down, the same over a metre of water as over the open sea. Now
its colour is how much water there is to look through. Over the shelf it keeps `waterShallow`;
between 0.3 and 5 units of depth it darkens to `waterDeep`; past the drop it is dark until the
haze takes it. Seen edge-on the surface still gives back some sky, a quarter of `skyFill`. No
new colour: thirteen before, thirteen after.

From `hero` a pale band lies along the beach and the foreground is deep blue where it was pale
teal, so the island stands out of the sea instead of fading into it. From `ridge` the sea behind
the land is dark and the haze sits on it as a pale line. From higher up, which orbit reaches and
no postcard does, the island sits in a pale ring. `hero` has not moved: `diff` shows only water.

**Something broken, found on the way.** A scratch view from 120 units up showed the terrain's
260-unit square as a darker patch in the sea, on `main` too. The water was 18% clear everywhere,
so it showed sea floor inside the grid and sky outside it. Deep water is now opaque and the
square is gone.

**What got cheaper.** Opaque deep water hides the floor under it, so the terrain no longer
builds that floor: grid cells with all four corners below `DEEP_WATER` (5 units, a constant in
`shared/ground.ts` both features read) are left out of the index. That is 42% of the terrain's
triangles, and they were drawn twice a frame, once for the picture and once for the shadow map.
The rim test now holds the land to that depth. `uOpacity` became a constant.

**Why this, today.** No open requests and a clean ledger, so the top of the roadmap. The first
ramp was an exponential and from `hero`, five units above the water, the pale band was a faint
grey-blue smear; a ramp that stays pale for the first metres and then drops reads from there.

**What it cost.** From the gate, hero view: draw calls 9 → 9 on both tiers (budgets 160 and
100). Triangles 151,290 → 108,342 on desktop and 57,654 → 42,446 on mobile. Live textures 8 → 8,
programs 7 → 7. Per water pixel: a smoothstep, a mix and a max more than before. `diff` against
`main`: hero 12.29% of pixels, ridge 9.68%, cove 1.12%, shore 0.30%.

**Worth knowing.**

- Leaving the floor out is not pixel-identical to keeping it. The waterline's clear fringe shows
  whatever is behind it, and on a far shore seen at a slant that used to be distant sea floor
  and is now the horizon colour. Shot with and without the cut on nine views: no difference in
  five; 44 pixels in `hero`, by at most 5 of 255; a few hundred pixels in three high scratch
  views, by at most 49 of 255 in one channel. Side by side at six times the size I could not
  tell them apart.
- `bun run shot` with several views draws every view after the first with the sky dome centred
  where the first view's camera stood: the dome follows the camera in `update`, and a capture
  only steps the world for its first view. From a high view that is a false horizon; from near
  sea level it is barely there. It is in the roadmap with a fix.
- The `model` field says only "Claude": this session's rules do not let the run write a model
  identifier into a pushed file. The session branch was not under `claude/`, so this was pushed
  as `claude/curate-2026-11-23`, as the procedure says.

**Next.** Wind, as one shared signal the tufts read first. And a postcard that looks down at the
ring: from 22 units up, off the shore `hero` faces, it is the best picture the island has, and
no view shows it.
