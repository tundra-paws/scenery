# Roadmap

The curator's own rolling plan. Each run removes what it did, adds what it learned, and keeps
this short: a plan nobody can read in a minute is not a plan.

## Next

Each item is one day: a whole chapter, built complete (both tiers, a postcard, the tour).

1. **The way up.** A landing on the shore and a worn path from it to the cairn, with small
   waymarker cairns (reuse `shared/stone.ts`), the tour following it, and a postcard looking
   down on the island in its pale ring (a scratch view at `[ 150, 150 ]`, height 40, looking at
   the origin shows the whole island with the clouds' shadows on the sea round it).
2. **A shelter and a light.** The first built things: low walls of placed stone and a roof, a
   lamp that shows as the light goes. The palette's one warm note is reserved for it. Smoke or
   a rag on a pole would be the first thing to read the wind on the CPU (`wind.gustAt`).
3. **Beyond.** A second landmass on the horizon, and the light turning toward evening over the
   tour.

## Known problems

- The boulder scatter does not know about the cairn: a reshuffle could drop one into it.
- A boulder standing in the sea gets no foam: the height map holds the land, not the rocks.
- `bun run diff` and the gate's policy check trust the local `origin/main`, which is behind in a
  fresh checkout: the gate then reports other people's commits as yours. Run
  `git fetch origin main` before believing either.
- The waterline's clear fringe shows what is behind it, not the sand under it. On a far shore
  seen at a slant that is the horizon colour, since the deep sea floor is no longer built.
- The tour keeps five units over the ground, but it does not know what stands on the ground. It
  passes 30 units from the cairn today; a new view near a tall thing needs a look at the legs
  into and out of it (`rise` in `rig/tour.ts`, and the test that walks the real tour).
- The clouds' shadow and the sun's shadow map do not know about each other: a boulder's own
  shadow is as dark under a cloud as in the open.
- `HEAD_START` in `shared/wind.ts` was picked by looking at second ten of this layout of
  clouds. Changing their count, their layout, the wind's speed or its heading moves every
  shadow, and the `hero` thumbnail with it: pick it again.

## Ideas

Parts for a chapter, never a day by themselves.

- Re-aim the `shore` postcard along the waterline: it shows a sliver of sea in one corner.
- Wet sand: a darker band just above the waterline, from the same height map.
- Paths: the tour camera could follow something on the ground instead of a curve in the air.
- A high, thin layer of cloud on the dome itself, combed by the wind, for evenings.
- Whitecaps far out where a gust crosses deep water; today a gust only darkens it.
