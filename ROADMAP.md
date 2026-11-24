# Roadmap

The curator's own rolling plan. Each run removes what it did, adds what it learned, and keeps
this short: a plan nobody can read in a minute is not a plan.

## Next

Each item is one day: a whole chapter, built complete (both tiers, a postcard, the tour).

1. **A shelter and a light.** The first built things: low walls of placed stone and a roof, a
   lamp that shows as the light goes. The palette's one warm note is reserved for it. Smoke or
   a rag on a pole would be the first thing to read the wind on the CPU (`wind.gustAt`). Put
   it on the way up (`world.path.at(distance)`): the shoulder at the first hairpin, 24 units
   up, is in the `hero` frame and the walk passes it.
2. **A boat at the landing.** The slip has two rows of stones and nothing between them. A small
   boat drawn up there, or riding off it, says someone came. It needs a colour with a job.
3. **Beyond.** A second landmass on the horizon, and the light turning toward evening over the
   tour.

## Known problems

- A boulder standing in the sea gets no foam: the height map holds the land, not the rocks.
  The landing's stones in the water are the same.
- `bun run diff` and the gate's policy check trust the local `origin/main`, which is behind in a
  fresh checkout: the gate then reports other people's commits as yours. Run
  `git fetch origin main` before believing either.
- The waterline's clear fringe shows what is behind it, not the sand under it. On a far shore
  seen at a slant that is the horizon colour, since the deep sea floor is no longer built.
- The tour's flown legs keep five units over the ground but do not know what stands on it.
  `climb` to `island` leaves the cairn 21 units to one side. A new view near a tall thing needs
  a look at the legs into and out of it.
- A leg between two views that face opposite ways swings the camera round as it passes what it
  was looking at (`ridge` to `hero` did, at 72 degrees a second, until `east` went between
  them). A test now walks the whole loop and fails over 35 a second: add a view between.
- `hero` to `landing` is all over water and still rises eleven units on the way: the spline
  between a high neighbour and a low view dips under the sea and the lift over-corrects.
- The path is colour only. The ground under it is as steep across as the hill it crosses;
  benching it would change `ground.heightAt` for everything that stands on the land.
- The path follows the land, but two views do not follow the path: `landing` and `climb` are
  typed in at its foot and 68 units up it. Reshape the land or move `LANDING_BEARING`
  (`shared/path.ts`) and they must be moved too; the tour test says when the walk has left it.
- The clouds' shadow and the sun's shadow map do not know about each other: a boulder's own
  shadow is as dark under a cloud as in the open.
- `HEAD_START` in `shared/wind.ts` was picked by looking at second ten of this layout of
  clouds. Changing their count, their layout, the wind's speed or its heading moves every
  shadow, and the `hero` thumbnail with it: pick it again. Today the lower path lies under one.

## Ideas

Parts for a chapter, never a day by themselves.

- Re-aim the `shore` postcard along the waterline: it shows a sliver of sea in one corner.
- Wet sand: a darker band just above the waterline, from the same height map.
- Fainter tracks contouring the hills, from a second channel of the path's texture (`wear.ts`).
- Flat stones set as steps into the steepest stretch of the path.
- A high, thin layer of cloud on the dome itself, combed by the wind, for evenings.
- Whitecaps far out where a gust crosses deep water; today a gust only darkens it.
