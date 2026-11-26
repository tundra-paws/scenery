---
title: A drying wind
summary: The boat at anchor has her sail hoisted to dry, the low sun coming through it, and the week's washing is out on a line under the house. Cloth is the wind's loudest voice now.
kind: feature
model: claude
---

The wind was the island's first motif and nothing on it showed the wind at a glance: a
scrap of pennant, the nets, the grass up close. And the boat in the middle of `hero` was a
bare pole with its sail rolled on the thwarts. Today it is a drying wind, and whoever lives
here has used it. The roadmap's own chapters (the insides, the night, what a shower leaves)
still cannot be seen from `hero` at second ten; this one stands in its foreground, and is
the half of the third that can: what is hung out once the shower has passed.

**The sail.** `boat/sail.ts`: a standing lug of undyed wool on a yard slung to port of the
mast and peaked up aft (`LUG` in `hull.ts`; the yard and its halyard are the hull's own
geometry, where the furled sail was, and the mast is a stride taller to carry it). The sheet is slack, so with the boat lying head to
wind it is a flag. Its head is laced to the yard and its luff is taut; the rest hangs in
folds that run from luff to leech as a curtain's do, deeper toward the foot and as it
gusts, never faster. As the boat sheers about her anchor the wind comes a little across
her, and the sail lies over to that side with a belly in it, against the mast and never
through it. It is sewn from strips, each in its own weathered shade, with two rows of
reef points, and a sheet sagging from the clew to the stern post. It is the boat's child:
it rides and swings with her. One draw, 230 triangles, 260 vertices moved a step.

**Light through cloth.** `LitMaterial.letThrough`: a share of the light that falls on the
far side of a facet shows on the near one, taking the cloth's colour twice, and falling
off fast as the cloth turns from it (`SLANT`), which is what draws a fold when the sun is
behind. At second ten the sun is square behind the sail from `hero`: it glows amber where
it would have stood grey. One new program, shared by the sail and the washing.

**The washing.** `shared/washing.ts`, `features/washing`: two poles on the green between
the house's low wall and the field, the line run along the contour so both stand level,
and on it a striped blanket of the flock's white and brown, a linen shirt pegged out by
its sleeves, a brown blanket and a pair of stockings. Each hem is carried downwind and
thrown out of its plane by the gust where it hangs. The flock is told where the line is
(`world.clutter`) and grazes round it. Tests hold it off the house, the walls, the paths,
the stacks, every tree, every camera and the tour.

**The tour.** `boat` is now the sail's postcard, `mirror` has it upside down in the bay,
`shelter` has the washing in its foreground. `infield` stood five units from the sail and
a third of its frame was cloth: it moved in under the field (65.5, 81.5), inshore of the
boat and a hair over three from the reef, and now looks up the rigs to the gate, the
house and the washing beside it. The leg in from `boat` took 0.4 s from the leg out, to
turn in under 35 degrees a second; the day is the length it was.

**In `hero`.** Where the mast stood bare before the nets, a pale sail as tall as the
house, lit from behind, the red pennant over it; right of the house, small, the washing.
`diff`: 8 of 24 views moved: `hero` by 1.6% (small in pixels, and the first thing the eye
finds at thumbnail size), `boat` 6.4%, `shelter` 3.6%, `wood` 2.8%, `skerry`, `mirror` and
`east` under 1%, `infield` all of it (it moved); 14 views by not one pixel.

**Cost** (the gate, `hero`): desktop 113 draws of 160 (108 before) and 597,014 triangles
of 800,000 (595,810); mobile 82 of 100 (79) and 239,258 of 300,000 (238,884). Programs 32
of 40 (31): the cloth's. Textures 10, nothing leaks, the same picture under two clocks.
A phone's sail throws no shadow; the washing is in nobody's mirror.

**Not done.** Nobody lowers the sail at dusk, and it lays no shadow on the sea. The
pennant and the nets are still opaque. Next: the insides, paired with something `hero`
can see (doors open, fires showing), or the night.
