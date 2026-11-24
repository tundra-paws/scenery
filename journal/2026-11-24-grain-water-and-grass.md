---
title: Grain, water and grass
summary: Every surface has a texture made in the shader, with relief. A burn runs from a spring under the cairn down the brae to the sea. Grass grows by the blade wherever the visitor stands.
kind: feature
model: claude
---

Three things the owner asked for while the run was going, so three in one day.

**A texture on every surface.** `shared/surface.ts` is a small texture library written in
TSL on three's own gradient noise, the noise `tsl-textures` is built on. A surface is its
colour and its height; `material.finish(surface)` lays the colour over the plain one and
turns the facet's normal by the height (bump mapping from screen derivatives, heights in
world units). Stone is blotched, lichened and cracked; turf is tussocks and blades; birch
bark has its dark dashes and the crowns their dabs of leaf; the boat and the gate have a
grain along their boards, the sheep a fleece, the seals a dappled hide, the rigs their
clods, the far coast its beds. The land no longer blends a colour a vertex: each fragment
decides between sand, turf, straw, heather and rock, so the turf ends on the beach in a
ragged line, the heather stands in clumps and rock breaks out where a slope steepens. Sand
is rippled across the wind. Where the land is rock its vertices are pushed out of true: the
one real displacement. A grain fades out before it is finer than a pixel, so nothing sparkles.

**The burn.** The day I had planned before the requests came. `shared/burn.ts` finds its
course as the path's was found: downhill from a spring under the cairn, turned aside from the
landing's slip. Its water is a strip of mesh on the drawn land with a shader of its own: it
gives back the sky of the hour, runs at the pace of the fall under it, and breaks white where
that is steep. The spring is kerbed with pale stones and marked with one stood on end; there
are washed stones along both banks, a slow pool at the foot of the fold with stepping stones
over its tail, and a fan over the sand. Grass, heather, boulders and sheep keep out of it.
A new postcard, `burn`, looks up it from the water off its mouth; the day grew to 313.5 s for
it, and the leg from `cove` to `ridge` to 22 s so the ridge still has its sunrise.

**Grass.** `features/grass`: 46,000 blades on desktop and 14,000 on a phone, a triangle each,
never planted. The vertex shader gathers them in a patch of ground ahead of the camera, roots
each on the land from one picture of the island (`sward.ts`: height, and how thick the grass
is), and leans them in the island's wind. Thick in the meadow, thin on the tops, none on
heather, rock, sand, ways, wall feet or the burn's banks.

**In the picture.** From `hero` the burn is the change: a pale thread from under the cairn,
white at its head, across the brae to the beach left of the boat. The textures show there as
mottled turf, clumped heather and cracked reef; close to (`shelter`, `wood`, `skerry`,
`burn`) they are most of what is seen. Looked at on both tiers.

**What was not done as asked**, and why, is in `PROPOSALS.md`: no `tsl-textures` package
(a new dependency is the owner's to add), no photographed maps (made from code, nothing
fetched, 400 KB a file), and no displacement finer than the land's own grid (triangles).

**Cost, from the gate.** Desktop 67 draws and 633,216 triangles before; 72 and 606,235 after
(76% of 800,000). Mobile 59 and 229,922 before; 63 and 237,821 after (79% of 300,000).
Programs 20 to 29 of 40, textures 9 to 10. Room was made by cutting the dykes' stones with
twenty facets on every tier, and the waymarks' on a phone: the grain carries them. No lookup
was added to a fragment: a textured surface is three to six noises. `hero` is over water, so
it pays for the grass and shows almost none.

**Also.** The site is still behind: "Every shader in TSL" and its fix are on `main`
unpublished. This push should publish all of it as one iteration.

**Next.** The inside of the shelter; the night; a mill on the burn and a water-gate under
the head-dyke. If the owner raises the triangle budget: a finer land near the camera.
