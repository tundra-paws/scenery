---
title: The birch wood
summary: A wood of wind-bent birch now stands beside the shelter, with stumps and a stack of logs by the wall, and lone birches lean on the open island. Trees sway with the gusts.
kind: feature
model: Claude
---

**What changed.** Nothing on the island was taller than grass unless somebody had built it.
Now there is a wood (`features/wood`, `shared/wood.ts`):

- **Fifty-two downy birches** on the low shoulder east of the shelter. Pale trunks scarred
  near black and dark at the foot, thin limbs, and crowns of faceted lumps in the meadow's own
  two greens. Tall (up to thirteen units) in the low middle, thinning to scrub at the edge
  and toward the treeline. Every one grew leaning the way the wind blows.
- **Twenty lone birches** strewn over the rest of the island by the same rule, far from each
  other and off the cairn's hill: small, and bent hard, since nothing stands between them and
  the wind. One is by the landing; one stands over the northern cove.
- **What the fire burns.** The three trees nearest the door are stumps, and their wood is
  stacked against the shelter's downhill wall under the eave, cut ends out.

In `hero` the right of the frame, which was a bare slope, is the wood, with the house at its
edge and the smoke going back over it; a lone birch leans on the slope above the landing, and
another further along the shore. `east` is now the wood from outside. Eight of the old twelve
postcards changed.

**It answers to the wind.** The whole wood is one mesh in world space. Each vertex carries
its tree's foot and the square of its height up the tree, so in the vertex shader a tree
reads the gust at its own root (`WIND_GLSL`, the grass's signal) and gives from the foot up:
a front crossing the meadow now crosses the wood, tree by tree. Each lump of leaves is
tossed a little out of step. The shadow pass uses the same push, so shadows sway too.

**A postcard and the tour.** `wood` stands at the water's edge below the trees: stumps in
front, the stack and the lit window on the left, the cairn's tip over the roof, birches going
up the slope. It sits between `east` and `shelter`. The loop is also the day, so rather than
lengthen it I gave the three legs round the new stop short times (8, 7 and 10 seconds) that
add up to what one leg was: `DAY` is unchanged and every earlier stop keeps its hour. Two new
tests: no camera stands in a crown or against a trunk, and the tour never flies through one.

**Why this, today.** No request was open. The roadmap's first chapter was *Inside* the
shelter, which cannot show in `hero`, and the owner asked for days that are plain in the
thumbnail; looking at the pictures, what the place lacked most was anything growing. Inside
stays first on the roadmap.

**Choices.** One new colour, `bark`; leaves, scars, stumps and cut wood are made from colours
already there. Placement is a rule over the land (dry, gentle ground, off the path, nothing
before the door), with only the wood's heart typed in. The same trees stand on every tier; a
phone gets fewer sides and four lumps a crown instead of six. Leaves are lit as if half
turned to the sky, as the tufts are, or a crown's underside goes as dark as a boulder's.
Boulders keep off the trunks.

**Cost**, from the gate on `hero`. Desktop: 23 → 25 draw calls (of 160), 184k → 269k
triangles (of 800k). Mobile: 23 → 25 draw calls (of 100), 113k → 167k triangles (of 300k).
Programs 14 → 16. One draw and one shadow pass for all of it; nothing per frame on the CPU.

**Next.** *Inside* the shelter. For the wood: a walker still passes through a trunk, no
light falls dappled under a crown, and an axe could be left in a stump (`ROADMAP.md`).
