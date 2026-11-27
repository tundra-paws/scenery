---
title: After the shower
summary: A shower has just gone over the island: stone and turf are dark and shining with the sky, puddles lie on the path and in the furrows, the hill runs with white threads, the burn is in spate.
kind: feature
model: Claude
---

A shower has just gone over, and the island is wet with it.

**The weather** (`shared/weather.ts`, `world.weather`). A third shared signal, beside the
wind and the hour: where every shower is, and how wet the island is from those that have
crossed it. Rain over the land soaks it in some ten seconds and it dries over four
minutes, all worked out from the showers' own tracks, so it is the same at second ten
whenever it is asked. A sixth shower (`PASSED` in `clouds/showers.ts`) crossed the
northern half of the island twenty seconds before the postcards: from `hero` its cloud is
the new heap behind the wood. The tour gets another at first light: one comes over the
island from `cove` to `fall` and wets it all again.

**What it leaves.** Every lit material is wet with it (`wets` in `shared/lit.ts`): darker,
smoother, and giving back the hour's sky as water does, by Schlick's fresnel off the
facet's own normal (off the grain's it sparkled like frost). Leaves, blades, fleece,
feathers and cloth shed it (`sheds()`): a little darker, no shine. The land holds less of
a film where it is grown over. On the bare path, where it is near level, the rain stands
in puddles that give back the sky and shrink into their hollows as it dries
(`terrain/wet.ts`); down every furrow of the field a thread of water stands (`aFurrow`,
`wetRigs`). The steep faces under the tops run with white threads of run-off
(`shared/runoff.ts`): heads put down on steep high ground facing the visit and walked
downhill, wandering, until the ground eases or they reach the burn, the sea or a wall.
They are the burn's own water in one mesh, and dry from their heads down. The burn itself
runs whiter, and the sea is roughened and pocked under every shower.

In `hero` the island glistens against the low sun: white threads down both hills, sky in
the furrows, the stone of the tower, the houses and the cairn shining, the beach dark.

**Why.** The second chapter on the roadmap, taken whole; the first (the other insides)
would not have shown in `hero`.

**Cost**, from the gate: desktop 113 to 114 draws of 160 and 608k to 616k triangles of
800k; phone 79 to 80 draws of 100 and 240k to 248k of 300k. Programs 33 of 40,
unchanged. The rills are one draw call, kept out of the mirror. A step adds up some 270
moments of rain over six showers on the CPU.

**Next.** The other insides. A rainbow wants a view that looks away from the sun at a
shower: not `hero`, which has the sun in it.
