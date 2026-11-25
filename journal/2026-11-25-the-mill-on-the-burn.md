---
title: The mill on the burn
summary: A click mill stands astride the burn above its pool, its wheel turning under the floor. The first rigs of barley are cut and stooked for it, and the head-dyke lets the water through a gate.
kind: feature
model: claude
---

The roadmap's third chapter, taken first because it is the one that shows from `hero`, and
grown by the half of it that was missing: a mill wants something to grind.

**The mill.** `shared/mill.ts` finds its place from the burn: astride the water on the last
of the fall above the pool, the one gentle shelf the burn crosses (below the head-dyke it
runs across a slope of 0.5 to 0.9, where nothing can be built). One room of placed stone
under turf, 4.8 by 3.6, lower in the door than the house. The floor is level and the burn
is not, so the wall the water comes in under stands low and the one it leaves by a storey
higher: under the floor is the wheel's room, open to the pool. The wheel is a tirl,
a post with eight leaning blades, lying flat and turning; a trough throws the water at it,
and below the mill the burn runs white until the pool has settled it. The door is shut, a
worn millstone leans by it, and the way to it leaves the path at the hairpin and crosses
the burn on two slabs at the wall's foot. Nobody, as ever: it is simply running.

**The water-gate.** Where the burn went under the head-dyke the wall was laid across it. Now
the dyke stops at a post each side and a spar lies across with poles hung from it to the
water: the burn goes through and the flock does not. Its place is found (where the burn
meets a wall), not typed.

**The harvest.** The first two rigs of every plot of barley are cut: stubble, the barley's
colour bleached, and stooks down their crowns, six sheaves head to head, throwing the
evening's long shadows. The rest still stands and bows to the wind.

**In the picture.** From `hero` the mill is in the middle, under the cairn, where the white
falls of the spring were: a dark gable-high block with a green roof, the water-gate a brown
bar on the dyke below it, and the right of the field pale with stooks. A new postcard,
`mill`, looks over the fold at it with the cairn above; `burn`, `landing`, `infield` and
`flock` all show it. Looked at on both tiers, and at night.

**Fitting it in.** Grass, tufts, heather, boulders, trods and the burn's own stones keep off
it and its way. The sheep's rule is now passed the burn as well as the mill (the feature
had left the burn out), so the brae's flock stands a little differently. The tour stops at
`mill` between `infield` and `flock` on 9.5 s taken from eight afternoon legs: growing the
day by that much put `ridge` two degrees before its sunrise, so the day stays 313.5 s and
every stop before `east` keeps its hour.

**Leaving the code no worse.** The house's stone-laying and its turf roof became
`shared/masonry.ts` and `shared/roof.ts`, which both buildings use; `diff` shows the house
pixel for pixel as it was. The mill's three materials are made like the house's stone and
turf and the gate's boards, and the stooks like the boulders, so no program was added.

**Cost, from the gate.** Desktop 72 draws and 606,235 triangles before; 82 and 616,570 after
(77% of 800,000). Mobile 63 and 237,821 before; 70 and 238,223 after (79% of 300,000).
Programs 29 of 40, as before; textures 10. A phone was at 79% of its triangles, and the mill
took it to 82%, so room was made there: the mill's stones cast no shadow of their own on a phone (the dark block
inside them throws the mill's) and the house's stones are left out of the sea's mirror, as
the dykes' already were. The cut rigs carry no ears, which pays for the stooks.

**Next.** Inside: the house and now the mill are shells. The night. And the harvest home: a
stackyard and a kiln, so something stands between the stooks and the mill.
