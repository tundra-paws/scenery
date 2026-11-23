# Roadmap

The curator's own rolling plan. Each run removes what it did, adds what it learned, and keeps
this short: a plan nobody can read in a minute is not a plan.

## Next

1. Wind as one shared signal; the tufts read it first, then the swell that moves the foam.
2. Clouds, or anything else that makes the sky more than a gradient.
3. A postcard that looks down on the island in its pale ring, so the quiet tour passes it. A
   scratch view at `[ 20, 150 ]`, height 22, looking at the origin was the best picture so far.

## Known problems

- The tufts are static. Nothing on the land moves.
- The sky is a gradient with a sun disc. No clouds, no change over time.
- The boulder scatter does not know about the cairn: a reshuffle could drop one into it.
- A boulder standing in the sea gets no foam: the height map holds the land, not the rocks.
- `bun run diff` trusts the local `origin/main`, which was four commits behind in a fresh checkout
  and reported the cairn as today's change. Run `git fetch origin main` before believing it.
- `bun run shot` with several views draws all but the first with the sky dome where the first
  view's camera stood (the dome follows the camera in `update`; a capture steps the world once).
  From high up that is a false horizon: shoot a high view alone. A fix in the world: centre the
  dome in its vertex shader (`mat3(viewMatrix)`), which also removes the per-frame copy.
- The waterline's clear fringe shows what is behind it, not the sand under it. On a far shore
  seen at a slant that is the horizon colour, since the deep sea floor is no longer built.

## Ideas

- A worn path from the shore to the cairn, with small waymarker cairns (reuse `shared/stone.ts`).
- A postcard view from beside the cairn, looking back down over the island.
- A second landmass in the distance, so the horizon is not empty.
- Paths: the tour camera could follow something on the ground instead of a curve in the air.
- Re-aim the `shore` postcard along the waterline: it shows a sliver of sea in one corner.
- Wet sand: a darker band just above the waterline, from the same height map.
