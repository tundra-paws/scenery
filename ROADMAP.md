# Roadmap

The curator's own rolling plan. Each run removes what it did, adds what it learned, and keeps
this short: a plan nobody can read in a minute is not a plan.

## Next

Each item is one day: a whole chapter, built complete (both tiers, a postcard, the tour).

1. **A boat at the landing.** The slip has two rows of stones and nothing between them. A small
   boat drawn up there, or riding off it, says how whoever lit the lamp came. It needs a colour
   with a job. A pennant on it could read the wind the way the smoke does (`shelter/smoke.ts`).
2. **Evening.** The light turning over the tour, which the lamp and the window are waiting for:
   by day they are two orange points. `SUN` is one constant that the light, the sky, the sea's
   glint and the clouds' shadow all read, and the shadow's slant is written into GLSL as a
   number (`cloud-shadow.ts`): moving the sun means making that a uniform first.
3. **Beyond.** A second landmass on the horizon.
4. **Inside.** The shelter is a shell. A floor, a hearth with the fire in it, a bench, and a rig
   that knows a wall from a door, for the visitor who walks in.

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
- The shelter has no inside and the walk knows only `ground`: an exploring visitor can walk
  through its walls and sees the stones from behind. Its lamp casts no shadow, so a little of
  its light reaches the grass behind the gable.
- The shelter's site (`shared/shelter.ts`) and the `shelter` postcard are typed in. The floor,
  the facing and the way to the door are read from the land and the path, and the land is not
  benched for it: the walls simply start where the hill is. Reshape the land and look again.
- The smoke is opaque puffs that shade nothing. From `hero` at second ten the top of the plume
  stands against a cloud of the same colours.
- The clouds' shadow and the sun's shadow map do not know about each other: a boulder's own
  shadow is as dark under a cloud as in the open.
- `HEAD_START` in `shared/wind.ts` was picked by looking at second ten of this layout of
  clouds. Changing their count, their layout, the wind's speed or its heading moves every
  shadow, and the `hero` thumbnail with it: pick it again. Today the lower path lies under one.
  The same clock decides the gusts the smoke at second ten left the chimney in, and so its bend.

## Ideas

Parts for a chapter, never a day by themselves.

- Re-aim the `shore` postcard along the waterline: it shows a sliver of sea in one corner.
- Wet sand: a darker band just above the waterline, from the same height map.
- Fainter tracks contouring the hills, from a second channel of the path's texture (`wear.ts`).
- Flat stones set as steps into the steepest stretch of the path.
- A high, thin layer of cloud on the dome itself, combed by the wind, for evenings.
- Whitecaps far out where a gust crosses deep water; today a gust only darkens it.
- A low wall running off from the shelter's gable, or a fold beside it: `shelter/walls.ts` lays
  any course from a line and the land under it.
- A stack of cut turf or driftwood by the door, which would want a colour for wood.
