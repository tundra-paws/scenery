---
title: A shelter and a light
summary: A low stone house under a turf roof stands on the shoulder above the path's first bend, a lamp lit in its doorway and smoke from its fire leaning with the wind. A worn way leads to its door.
kind: feature
model: Claude
---

**What changed.** The island has its first built thing, and someone has left a light on in it.

- *The shelter* (`features/shelter/`, `world.shelter`). A low house on the shoulder above the
  path's first hairpin, built along the hill: the back wall dug in, the front one standing on
  what was dug out. Its walls are the boulders' own shape in the cairn's grey, 209 stones laid
  dry in level courses with the corners locked, a lintel over the door and a threshold under
  it, two gables, a chimney, and a row of stones along the ridge to hold the turf. The roof is
  turf: the hill's own greens, in sods that do not quite lie level.
- *The light.* A lamp hangs in the dark of the doorway and a small window in the downhill wall
  shows the fire. One new colour, `lamp`, the amber of a flame: the palette's second warm note,
  and like the first only ever light. A point light with no shadow warms the stones of the
  door's jambs and the step, and wavers a little.
- *The smoke* (`shelter/smoke.ts`). The first thing to read the wind on the CPU. A puff is not
  simulated: where it is depends only on the time and on which puff it is. It left the chimney
  into air blowing as hard as `wind.gustAt` says it was then, and that air has carried it
  since, so a gust lays the plume over, a lull lets it stand, and second ten is the same
  picture whenever it is asked for. Opaque and faceted like the clouds, and coloured by the
  same rule: the sun's cream on one side, the sky's blue on the other.
- *The way to the door.* The terrain's wear texture now takes side ways (`wear.ts`): a narrow
  one leaves the path at the hairpin, goes round the waymark and ends at the step. Tufts and
  boulders keep off it and off the walls, left out after their draws so no other one moved.
- *A postcard,* `shelter`: from below the house, lamp and window showing, the path and its
  waymarks climbing behind it to the cairn. It is the tour's last stop before `hero`. The walk
  from the landing comes up its first leg straight at the door and passes five units from it.

In `hero` the slope right of the hairpin was grass. It now carries the house, gable to the
sun and long wall in shade, an orange point in its door and another in its wall, and a pale
plume rising from the chimney and bending right. `hero` has not moved.

**Why this, today.** No open requests, a clean ledger, and the top chapter of the roadmap,
taken whole: walls, roof, lamp, the wind read on the CPU, the tour and a postcard.

**What it cost.** From the gate, hero view: draw calls 12 → 18 on both tiers (budgets 160 and
100): stones, body, the unlit openings, smoke, and two shadow passes. Triangles 138,153 →
174,287 on desktop and 73,192 → 108,526 on mobile (800,000 and 300,000); the stones are 16,720
of them, drawn twice. Programs 8 → 11, buffers 39 → 53, textures still 10. No leak, same
picture under two other clocks. A step costs 26 puffs moved on the CPU (16 on a phone) and one
small buffer sent. `diff` against `main`: hero 2.6% of pixels, worst block 98% changed; east
3.6%; `climb`, `summit`, `shore` and `cove` not a pixel. 112 tests, 10 of them new (the site,
the smoke). The loop is 227 s.

**Worth knowing.**
- `world.shelter` is DOM-free like the path: `place(across, along)` turns the house's own frame
  into the world's, `distanceTo` is how far a place is from the walls, `spur` the way to the door.
- The house's measures are in `shelter/plan.ts`. Walls start where the hill is: a stone that
  would lie wholly under the ground is not laid.
- The site and the postcard are typed in; the floor, the facing and the spur are read from the
  land and the path. `shared/shelter.test.ts` says when they stop fitting.
- `smoke.ts` is the pattern for anything else that reads `wind.gustAt`: a pure function of time.
- The lamp is short of reach and weak by day on purpose. It is there for the evening chapter.

**Not done.** The house is a shell: a dark block behind its stones, and nothing stops an
exploring visitor from walking through its walls.

**Next.** A boat at the landing. Then evening, which the lamp is waiting for.
