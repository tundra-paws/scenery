---
title: The back end of the year
summary: The wood has gone gold and its leaves come down on the wind and lie under the trees; the bracken on the lower hill has turned to rust. A new stop, in under the birches.
kind: feature
model: claude
---

The roadmap's third chapter, taken whole. The first two (inside the buildings, the night)
cannot be seen from `hero` at second ten; this one fills it.

**The wood turns.** Until today a birch lump had a sixth to four fifths chance of being gold;
now it is a half to nearly all (`TURNED` in `wood/birch.ts`), the lone trees and the tops
first. The gold is the barley's made riper (`leaf` in the palette): olive in the shade
before, it now reads as turned leaves under any light. From `hero` the right third of the
picture, green with gold in it yesterday, is gold with green in it.

**The leaves come down.** 720 leaves (260 on a phone) are torn off the crowns, each on its
own clock: carried downwind, further in a gust, swung from side to side and turned over
as they fall, and gone into the grass (`wood/fall.ts`). And where they land they lie: the
land under each tree and downwind of it is strewn gold going to rust (`wood.litterAt`,
read into a new vertex attribute `aLitter`), over grass and heather alike.

**The bracken.** A new rule, `shared/bracken.ts`, like the heather's: beds on the drained
slopes from above the sand to just over the head-dyke, never on the flats, the path, the
field or the burn's edge, and never where the heather grows (a test holds that). The land
takes its rust (`bracken`, the one new colour, the dying fern's), and clumps of folded
fronds stand on it in the grass's material and wind (`tufts/bracken.ts`). Heather and
bracken share one channel of `aLand` (heather less bracken), since they never share
ground. From `hero` the lower brae under the flock is in rust beds; from `landing`,
`flock` and `cove` the slopes are.

**A postcard.** `fall` stands after `ridge`: in under the gold birches at the back of the
wood, the ground strewn, leaves coming down past the trunks. The day grew by its stop and
leg (twelve seconds, `DAY` 333.5) and every earlier stop kept its hour; `ridge`'s leg got
two seconds more, or it flew too fast. Placed first before `east`, its leg out flew
through a crown (the tour test said so), so it moved to before `moor`.

**Making room.** The bracken first cost 48k triangles on desktop and put both tiers past
80%. A frond is now two triangles, folded (ten a clump; a phone's clumps have three
fronds). The crowns, drawn three times (picture, shadow, sea), were cut from an 80-facet
ball; desktop now cuts them from a 36-facet dodecahedron. They read more faceted, which
is the house style: 82k triangles back from where the bracken had taken them.

**Cost, from the gate.** Desktop 93 draws and 604,708 triangles before; 95 and 574,484 after (72% of 800,000).
Mobile 76 and 231,917 before; 78 and 238,345 after (79% of 300,000). Programs 31 of 40: the falling leaves' is new. Looked at on both tiers: `hero`, `fall`, `wood`, `east`, `flock`,
`landing`, `cove`, `island`.

**Not done.** The flock grazes through the bracken; a leaf falls through roofs. The last
rig still stands (the barley's wind ripples need it), no shower wets anything.

**Next.** What a shower leaves; inside the house, the mill and the kiln; the night.
