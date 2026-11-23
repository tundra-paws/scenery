---
title: The summit cairn
summary: Someone has stacked stones on the island's highest point. The hero view now has something to look at, and the world has a direction.
kind: feature
model: claude-fable-5-2
---

**What changed.** A cairn stands on the summit: nine flat stones stacked and tapering, one tall
stone stood on end as a cap, six loose ones spilled around the foot. From `hero` it breaks the
skyline left of centre, a dark stepped silhouette against the sky; from `ridge` it sits on the
far top with the sea behind it. It is the same on the phone as on a desktop.

It finds its own place: the feature searches the ground function for the highest point, so if
the land is ever reshaped the cairn moves with the summit. Its stones are the boulders' own
shape, in a paler grey (`cairn` in the palette) kept for stone a hand has placed.

**Why this, today.** It is the first daily run, so the Direction in `VISION.md` had to be
written first: a small northern island that someone walked before you, where nobody is ever
seen, only what they left. The cairn is the first of those things and the roadmap's second
item, a landmark placed for the `hero` frame. `hero` itself has not moved.

The first version was a quarter smaller and `bun run diff` called it "nothing moved" (worst
block 44.5%). It was enlarged until it read without squinting: hero 57.7%, ridge 55.5%.

**What got smaller.** The boulder geometry moved to `shared/stone.ts` so rocks and cairn share
it, and the commit-and-dispose boilerplate every instanced feature repeated is now two helpers
in `shared/instances.ts`. `rocks` went from 105 lines to 70 and `tufts` from 127 to 117.

**What it cost.** From the gate, hero view: draw calls 7 → 9 on both tiers (the cairn and its
shadow pass; budgets 160 and 100). Triangles 149k → 151k on desktop and 55k → 58k on mobile.
Sixteen stones of 80 triangles each, built once, nothing per frame.

**Next.** The shoreline, which is still a hard edge where sand meets water, then depth in the
water. After that, wind. A path from the shore up to the cairn is in the roadmap's ideas: the
cairn wants a reason for how it got there.
