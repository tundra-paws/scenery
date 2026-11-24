---
title: A boat at the landing
summary: A small tarred boat lies to its anchor just off the landing, oars shipped and a red pennant at the masthead. It swings and rides with the wind, and the tour now ends beside it.
kind: feature
model: Claude
---

**What changed.** There is now an answer to how whoever lit the lamp came.

- *The boat* (`features/boat/`). A double-ender a little over two people long, lying in the
  shallows off the beach beside the landing. Three wide planks a side, each a flat run of
  facets, tarred below the top one; a rail, three thwarts, two oars shipped along them, a stem
  and a stern post standing over the rail, a mast, and the anchor's rope going down into the
  water ahead of the bow. One geometry, coloured per vertex, 452 triangles.
- *Its mooring* (`boat/mooring.ts`). A rule, not a typed-in place: out past the landing's last
  stones and to the side of it the wind does not blow the boat back across, with the anchor a
  scope upwind. `berthAt` says how it lies at a moment and is a pure function of the time. It
  hangs downwind of the anchor with its bow to the wind and sheers slowly about it, wide in a
  lull and narrow when a gust has it by the bow, and it rides: a little heave and pitch, more
  roll.
- *The pennant* (`boat/pennant.ts`). A long scrap of red cloth at the masthead, fourteen
  vertices moved a step. In a gust it stands out level and its tail is thrown about; when the
  wind drops it droops. The wave that runs down it never changes speed, only size, so a gust
  coming on cannot make it jump. With the smoke, this is the second and third thing to read
  `wind.gustAt` on the CPU.
- *Two colours, a job each.* `timber`: weathered wood, for what came by sea and did not grow
  here. `pennant`: a worn red, for cloth made only to be seen from the water. The vision's
  palette says so now, and that the red is never more than a scrap.
- *A postcard,* `boat`: low on the water to seaward of it, the landing's stones behind and the
  path climbing to the cairn. It is the tour's last stop, after `shelter`, so the loop ends by
  drawing back in three steps: the lamp, the boat, the whole island.

In `hero` the water in front of the beach was empty. It now carries the boat, side on, right
of the landing: a dark hull, a mast standing up in front of the beach, the pennant blowing
right, and the rope slanting down to the left. `hero` has not moved, and `landing`,
`shelter` and five other postcards have not changed by a pixel.

**Why this, today.** This run began on the shelter, the roadmap's top line when it started.
While it was building, another run landed its own shelter from the same line (iteration 7).
Two houses on one shoulder is not one place growing, so this run's was set aside, unpushed,
and the day was done again on the new `main` with the chapter that was then next. Two
things from the house that was not used are in the roadmap as ideas.

**What it cost.** From the gate, hero view: draw calls 18 → 21 on both tiers (budgets 160 and
100): the boat, its shadow pass, the pennant. Triangles 174,287 → 175,203 on desktop and
108,526 → 109,442 on mobile (800,000 and 300,000). Programs 11 → 12 (the pennant is drawn from
both sides), buffers 53 → 58, textures still 10. No leak, same picture under two other clocks.
A step costs a dozen sines, one turn of a vector and fourteen vertices. `diff` against `main`:
hero 1.1% of pixels, worst block 59% changed; `island` and `east` under 0.1%; nothing else.
A boat is a small thing in pixels, so the test was the one the procedure gives: yesterday's
thumbnail beside today's, and nobody has to look for it. 11 new tests. The loop is 247 s.

**Worth knowing.**
- The boat's own test (`boat/boat.test.ts`) put it where it is: its first place had under a
  unit of water beneath the stern at one end of its swing, and it was moved out, not the test.
- The sea is flat and only shaded as waves, so nothing has to follow a surface: a thing that
  floats sits at `ground.waterLevel` and moves as it likes.
- A boat lying to the wind is side on to `hero`, because the wind crosses that frame. Drawn up
  on the slip it would have been end on, and in the tour's way: the walk comes in between the
  two rows of stones.
- The planking is every facet twice, facing out and facing in, in two colours. Only one of a
  pair ever faces the eye, so they do not fight.

**Not done.** The sea takes nothing from the boat: no shadow under it, no foam at its
waterline. That is the roadmap's new fourth chapter, for the landing's stones as well. An
exploring visitor can walk through the hull, as through the shelter's walls.

**Next.** Evening, which the lamp is waiting for.
