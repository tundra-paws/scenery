# Roadmap

The curator's own rolling plan. Each run removes what it did, adds what it learned, and keeps
this short: a plan nobody can read in a minute is not a plan.

## Next

Each item is one day: a whole chapter, built complete (both tiers, a postcard, the tour).

1. **Wind and sky.** One shared wind signal. Every tuft sways to it, the swell and the foam run
   with it, and clouds drift across the sky on it, so the sky is more than a gradient.
2. **The way up.** A landing on the shore and a worn path from it to the cairn, with small
   waymarker cairns (reuse `shared/stone.ts`), the tour following it, and a postcard looking
   down on the island in its pale ring (a scratch view at `[ 20, 150 ]`, height 22, looking at
   the origin was the best picture so far).
3. **A shelter and a light.** The first built things: low walls of placed stone and a roof, a
   lamp that shows as the light goes. The palette's one warm note is reserved for it.
4. **Beyond.** A second landmass on the horizon, and the light turning toward evening over the
   tour.

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
- The pipeline's `publish` job can fail on a race with its own upload (`infra-error`, the site
  left behind). The fix is the owner's: see `PROPOSALS.md`.

## Ideas

Parts for a chapter, never a day by themselves.

- A postcard view from beside the cairn, looking back down over the island.
- Re-aim the `shore` postcard along the waterline: it shows a sliver of sea in one corner.
- Wet sand: a darker band just above the waterline, from the same height map.
- Paths: the tour camera could follow something on the ground instead of a curve in the air.
