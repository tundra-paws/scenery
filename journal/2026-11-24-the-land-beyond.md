---
title: The land beyond
summary: The island now lies off a mountain coast. A fell and a long range stand in the haze to the north-west, and the sun goes down behind them, leaving the island in their shadow.
kind: feature
model: Claude
---

**What changed.** The island sat alone in a sea that ran out to a level horizon. Now there is
land beyond the water (`features/beyond`, `shared/beyond.ts`):

- a **mountain coast** across the north-west, 540 to 1000 units out, eighty degrees of it;
- a **fell headland** nearer in on its southern end, broad-shouldered, 240 units high;
- a low **holm** to the north, for the summit's view; and **stacks** off the headland.

In `hero` the headland now stands on the left of the frame, where there was only glow, with
the range going back behind it and the low sun just clear of its shoulder. It is one mesh,
flat-shaded and lit by the same light as the island, so it keeps the hour: grey-blue in the
evening, black-violet at dusk, cold under the moon, pink on its eastern faces at first light.

**The haze is its own.** The fog fades into the horizon's one colour, so a far coast in front
of a sunset went grey where it should warm (a known problem in the roadmap). The far land fades
into the sky's own colour in the direction looked in, glow and all, the way the far sea does,
with a little of the zenith's blue in the air and pure horizon in the mist on the water, so
coast and sea meet as one. Nearer things are clearer: the headland stands out against the range.

**The sun goes down behind it.** `createDaylight` now takes the skyline (measured once from the
island's middle). When the sun drops behind the land, its light leaves the island and the
glint leaves the sea, about eight seconds before it would reach the water; the sky and the
clouds keep their hour by its height alone. So the tour now comes in to the landing with the
island in the mountains' shadow and the sky still burning. A test holds both promises: the sun
sets behind the mainland, and at second ten it still stands clear of everything in `hero`.

**The `shore` postcard** looked at a hillside with a sliver of sea. It now stands on the western
beach looking out past a boulder and the foam to the stacks, the headland, the range and the
sun. The tour's turn test passes; `DAY` is unchanged.

**The skill.** At the owner's request, the three.js skill now has a section, *Reach for what exists
first*: three, its add-ons, the scene library and `shared/` before anything hand-written.
Today's work follows it: a built-in material amended through `shared/amend.ts`, the library's
`createNoise2D` and `ridged`, and the sky's own `SKY_GLOW_GLSL`.

**Cost**, from the gate on `hero`. Desktop: 22 → 23 draw calls (of 160), 175k → 184k
triangles. Mobile: 22 → 23 draw calls (of 100), 109k → 113k triangles. Programs 13 → 14.
No shadow pass for it, nothing per frame; the skyline is a table built once.

**Next.** The far coast has no foam and no surf of its own, and the island's own fog is
still one colour; the next day should be *Inside* (the shelter's floor, hearth and bench),
or *The sea answers*.
