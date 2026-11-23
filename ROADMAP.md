# Roadmap

The curator's own rolling plan. Each run removes what it did, adds what it learned, and keeps
this short: a plan nobody can read in a minute is not a plan.

## Next

1. Give the water depth: pale over the shallows, dark over the open sea. The water shader already
   knows its depth (`uGround`, from `shared/height-map.ts`); today it only uses the first metre.
2. Wind as one shared signal; the tufts read it first, then the swell that moves the foam.
3. Clouds, or anything else that makes the sky more than a gradient.

## Known problems

- The water has no depth past the first metre: one colour over the shelf and the open sea.
- The tufts are static. Nothing on the land moves.
- The sky is a gradient with a sun disc. No clouds, no change over time.
- The boulder scatter does not know about the cairn: a reshuffle could drop one into it.
- A boulder standing in the sea gets no foam: the height map holds the land, not the rocks.
- `bun run diff` trusts the local `origin/main`, which was four commits behind in a fresh checkout
  and reported the cairn as today's change. Run `git fetch origin main` before believing it.

## Ideas

- A worn path from the shore to the cairn, with small waymarker cairns (reuse `shared/stone.ts`).
- A postcard view from beside the cairn, looking back down over the island.
- A second landmass in the distance, so the horizon is not empty.
- Paths: the tour camera could follow something on the ground instead of a curve in the air.
- Re-aim the `shore` postcard along the waterline: it shows a sliver of sea in one corner.
- Wet sand: a darker band just above the waterline, from the same height map.
