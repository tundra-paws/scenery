---
title: The tide is out
summary: The sea keeps a tide now, out and back twice in the day. The visit opens at low water: a wet strand under a line of wrack, weed on every stone, the pier and the skerry tall on dark feet.
kind: feature
model: Claude
---

The sea has a tide, and the visit opens on the bottom of it.

**The tide** (`shared/tide.ts`, `world.tide`). A fourth shared signal, beside the wind, the
hour and the weather: one number, the height of the sea. It falls 1.2 units from high water
and comes back twice in the day, low at second ten, when the postcards are taken, and again
at first light; full at dusk and in the afternoon. Everything on the island was placed
against high water, so the sea only ever goes down from there: nothing is flooded, and a
test holds twice her draught under the boat at the bottom of it. The sea's plane, its
mirror, its depth and so its shallows, surf and foam all lie at the tide's level. The boat
rides it at her anchor, the small boat goes down the pier's side on ropes that are now
drawn each step from their posts, the seal comes up in it, the burn runs out over the
strand to wherever the edge has gone, and a visitor on foot walks down after it
(`RigEnv.sea`). What stands in the sea tells it twice, for high water and for low, and the
foam goes between.

**What the ebb shows** (`shared/shore.ts`). One weed, in one new colour (`wrack`, an olive
brown: the only thing the sea grows). Every stone that stands in the tide wears it from a
little under high water down, by its height in the world, so the pier, the skerry, the
landing's rows, the dyke's foot and the boulders all draw the one ragged line. The land
wears it on its rock, in clumps on its sand, and in a line cast up along the top of the
beach; under low water it lies in beds of tangle, darker, which the sea shows through its
shallows and which take the mirror from it where they are awash. The strand between the
marks is stained and wet whatever the weather, and holds the sky in sheets that are
widest by the water. The pier is laid three courses deeper, to stand on its own foot at
low water, its ladder and its dark with it.

In `hero` the sea has gone down: the beach is twice as wide and shining under its dark
line, the pier and its light stand a man's height taller, the skerry is twice the rock it
was with weed round its foot, and the boat lies lower in the bay.

**Why.** No request is open. The roadmap's first chapter (the other insides) does not show
in `hero` and wants something that does; the tide is that something, and took the day.

**Cost**, from the gate: desktop 113 draws of 160 (114 before) and 616k triangles of
800k, as before; phone 80 draws of 100, unchanged, and 248k to 247k of 300k. Programs 33
of 40, unchanged. The pier's three more courses and the ropes' draw call were paid for: the land
is no longer built under water the lowest tide still closes over (`BUILT`), and a phone's
pier stops at low water. No new texture: the wash map grew a channel.

**Next.** The other insides. For the tide: the beach is steep, so the strand is only a
few units wide; a broad ebb wants the land reshaped under the sea. The camera's heights
are still measured from high water.
