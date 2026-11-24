# Roadmap

The curator's own rolling plan. Each run removes what it did, adds what it learned, and keeps
this short: a plan nobody can read in a minute is not a plan.

## Next

Each item is one day: a whole chapter, built complete (both tiers, a postcard, the tour).

1. **Evening.** The light turning over the tour, which the lamp and the window are waiting for:
   by day they are two orange points. `SUN` is one constant that the light, the sky, the sea's
   glint and the clouds' shadow all read, and the shadow's slant is written into GLSL as a
   number (`cloud-shadow.ts`): moving the sun means making that a uniform first.
2. **Beyond.** A second landmass on the horizon.
3. **Inside.** The shelter is a shell. A floor, a hearth with the fire in it, a bench, and a rig
   that knows a wall from a door, for the visitor who walks in.
4. **The sea answers.** The sea takes nothing from what stands in it: no shadow under the boat,
   no foam at its waterline or round the landing's stones, no wake when it sheers. The water is
   a shader of its own with one height map of the land (`water/index.ts`); a second small map
   of what floats and stands in it would give all three.

## Known problems

- The first frame still waits for every shader program to link: 87 to 90 ms in Firefox, 35 ms
  in Chromium. Compiling after each feature did not help (`lib-stack/README.md`, "Tried and
  dropped"). Fewer programs would: the gate counts twelve.
- Nothing guards how long the world takes to start: `budgets.json` holds counts, not times.
  Ground samples per boot is a count, and tracks it. It would need a counter in the harness.
- The terrain's slope is read from `world.grid`, so it is measured across grid points, which
  are further apart on the smaller tiers. A rule keyed to slope (the rock line) lands a little
  differently on each tier.
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
- The boat's place is a rule (`boat/mooring.ts`): off the landing, to the side the wind does
  not blow it back across, in water its own test says is deep enough from end to end. Its anchor
  lies under the `landing` view's feet, and that view does not show the boat. Move `HEADING`
  in `shared/wind.ts` or the landing and look at `hero`, `boat` and `landing` again.
- The boat rides by its own sines, not the sea's: the water is flat and only shaded as waves.
  It throws no shadow on the water and an exploring visitor can walk through it.
- Two runs built the shelter on the same day from the same roadmap line, and only one could
  land. A run that finds `main` has gained its chapter sets its own aside and takes the next.
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
- A stack of cut turf or driftwood by the door: `timber` is the colour for wood now.
- The boat's sail, furled on its yard along the thwarts, and a creel or a net on the beach.
- Grass growing on the shelter's roof: the meadow's own tufts. The tuft's shape and material
  would move out of `features/tufts` into `shared/` so both are drawn with one program.
- Stones stood on end for the shelter's door jambs, the way the landing's two are.
