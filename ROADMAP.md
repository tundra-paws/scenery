# Roadmap

The curator's own rolling plan. Each run removes what it did, adds what it learned, and keeps
this short: a plan nobody can read in a minute is not a plan.

## Next

Each item is one day: a whole chapter, built complete (both tiers, a postcard, the tour).

1. **Inside.** The shelter is a shell. A floor, a hearth with the fire in it, a bench, and a rig
   that knows a wall from a door, for the visitor who walks in.
2. **A night worth staying up for.** The night is a moon, stars, high cloud and one lamp. A
   lantern at the boat's masthead, the window's light falling on the grass, a meteor now and
   then.

## Known problems

- **The wood is typed in to fit `hero`** (`HEART`, `REACH` in `shared/wood.ts`): right of the
  house, clear of the cairn's hill. Which trees stand is a rule (dry, gentle ground, off the
  path, nothing before the door). Reshape the land or move the shelter and look at `hero`,
  `wood`, `shelter` and `east` again; `east` is now mostly wood, with the house hidden in it.
- **The infield is typed in to fit `hero`** (`FIELD`, `HEAD`, `FOLD` in `shared/infield.ts`),
  like the shelter's site. What it holds is read from the land: the rigs lie down its fall
  and stop short of the dyke, draped on the drawn grid (`grid.heightAt`). Its tests keep the
  walls off the path, the house, the way to its door, every tree and every low camera, and
  the field dyke on dry ground. The wood does not know about the walls: the test does.
  Move the shelter, the path or the land and look at `hero`, `landing`, `boat`, `infield`.
- The walls are solid only to the eye: the explore walk goes through them, and the flown
  legs clear them only because they keep five units up.
- The barley's ripple and the potato rigs are seen at second ten in gold light; at night the
  field is one dark shape. The rigs cast no shadow of their own (receive only).
- The lone birches are strewn by rule over the whole island (`strew`). One stands by the
  landing, in `hero`, `landing` and `boat`, where the pennant flies across its crown. Tests
  keep every tree off every postcard's camera and out of the tour's way: move a view or a
  rule and they say so.
- Stops on borrowed time: `wood` (from `east`, `wood`, `shelter`: 8, 7, 10), `mirror` and
  `moor` (`ridge` 5 + `moor` 5 + a dwell = the 15 s leg they split). Change one and the day
  test fails until they sum to what they did.
- Nothing knows a tree is there but the boulders: an exploring visitor walks through a trunk,
  tufts grow against it, and the lamp lights the far side of it. The crowns are lit as if
  half turned to the sky (`SKYWARD` in `wood/timber.ts`), so under the moon they are a little
  brighter than the grass.
- A tree's shadow is in the sun's one shadow map, a few texels a trunk. The leaves are solid
  lumps: no light comes through a crown and none falls dappled under it.

- The first frame waits for every shader program to link (`lib-stack/README.md`, "Tried and
  dropped"). Fewer programs would help: the gate counts 31.
- Nothing guards how long the world takes to start: `budgets.json` holds counts, not times.
  Ground samples per boot is a count, and tracks it. It would need a counter in the harness.
- The terrain's slope is read from `world.grid`, so it is measured across grid points, which
  are further apart on the smaller tiers. A rule keyed to slope (the rock line) lands a little
  differently on each tier.
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
- The boat rides the sea's swell (`shared/swell.ts`) and lays its shadow on the water, but an
  exploring visitor can walk through it. It makes no wake: at anchor it hardly moves.
- A run that finds `main` has gained its chapter sets its own aside and takes the next.
- The smoke is opaque puffs that shade nothing. From `hero` at second ten the top of the plume
  stands against a cloud of the same colours.
- The clouds' shadow and the sun's shadow map do not know about each other: a boulder's own
  shadow is as dark under a cloud as in the open. The clouds' shadow is also only roughly
  theirs now: it is laid as if the light never stood lower than 24 degrees (`REACH`), and a
  puff's height over its cloud's base is ignored, so that a turning sun cannot send it racing.
- `HEAD_START` in `shared/wind.ts` was picked by looking at second ten of this layout of
  clouds: the low sun stands clear in `hero` with two bars of cloud under it. Changing their
  count, their layout, the wind's speed or heading, or the sun's place at second ten
  (`OPENING`, `NORTH` in `shared/daylight.ts`) moves them: pick it again. The same clock
  decides the gusts the smoke at second ten left the chimney in, and so its bend.

- **The day is typed in to fit the tour.** `DAY` in `shared/daylight.ts` is the loop's length
  (289.5 s since `flock`) and `OPENING`, `EDGE` and `SLOW` put each stop at its hour. Add a view,
  or give a leg its own `travel`, and a test in `rig/tour.test.ts` fails until `DAY` follows;
  `OPENING` follows `DAY` by itself so second ten keeps its sun. Then print the sun's height at
  every stop and look at the night ones again (`flock` moved sunrise from `cove` toward `ridge`). A visitor who takes the
  camera keeps the same clock: nothing lets them wait for the moon or hurry the dawn.
- Every postcard, and so every thumbnail in the gallery, is taken at second ten: the gallery
  will never show the night. A second picture of an iteration (`seaward` at second 90) needs
  `budgets.json` and the site's scripts: a framework day.
- The moon and the shelter do not fit in one frame from any ground the smoke does not blow
  across: the hill behind the shelter is too steep. `seaward` settles for the path, the
  landing's stones, the boat and the moon's road on the water; the lamp shows only as a warm
  stone at the picture's foot.
- At the handover (sun seven degrees down) nothing casts a shadow for a few seconds and the
  land is lit by the sky alone. The light on the land never comes from lower than seven
  degrees (`LOWEST`), so at sunset the shadows are shorter than the sun says.
- The haze on the island is one colour, the horizon's. The sea and the land beyond fade into
  the glow on the sun's side (`features/beyond` does it by hand); the island's own far slopes
  still grey toward a sunset. Doing it for every built-in material is one `fog_fragment`.
- The lamp's light grows at night (`DARK_GAIN`) because the picture is exposed for the dark,
  not because the flame does. The window still lights nothing but itself.

- **The land beyond is typed in to fit `hero`** (`REACHES` in `shared/beyond.ts`). The
  headland's shoulder stops just short of the sun at second ten, and a test fails when it does
  not. Move the sun's place at second ten (`OPENING`, `NORTH`) or `hero`, and retune it by
  printing the skyline from `hero` bearing by bearing, as the test does.
- The skyline the sun goes behind is measured from the island's middle. From the far side of
  the island the sun disappears a little before or after its light goes.
- The sun goes behind the land some eight seconds before it reaches the sea, and from then
  until the moon takes over (`HANDOVER`) the island has no direct light. The sky's colours
  still go by the sun's height alone.

- **The mirror draws the world twice** (`water/mirror.ts`): every frame, everything over the
  water again from under it, at half the picture's size (a third on a phone). It costs a draw
  call an object and its triangles again: hero went from 31 draws and 400k triangles to 47
  and 604k on desktop (31 and 201k to 45 and 229k on a phone). Tufts and barley are kept out of it everywhere (`keepOutOfMirror`),
  the wood and the dykes on a phone, and the house's stones are cut coarser on a phone to pay
  for it. Something new that is many and small should be kept out too. The pass draws even
  when little water is on screen (`climb`, `summit`).
- The mirror pass renders into a target, where three neither tone-maps nor encodes, so every
  material it draws links a second program, on the first frame: live programs went from 19 to
  31 of 40. A new material now costs two. Rendering the mirror with the screen's own programs
  (and mixing it in after the sea's tone mapping) would win them back.
- The sea is still a flat plane: the swell tilts its light and the reflection, it does not move
  the surface, so the boat heaves on water that does not. The surf is a thin line from `hero`:
  the shelf there is steep. The land beyond still has no surf.
- What stands in the sea is told to it at build (`world.wash.stand`): the boulders, the
  landing's stones, the head-dyke's foot. Something new that stands in the water must say so,
  and `water` must stay last in `index.ts` to hear it. The boat is three uniforms, set each step.

- **The hefts are typed in to fit `hero`** (`HEFTS` in `shared/flock.ts`): the brae under the
  cairn, the inbye above the landing, the dooryard, the fold, and two on the far side for
  `cove`. Which ground a sheep stands on is a rule (grass, not steep, clear of the path and its
  waymarks, walls, trees, house, cairn, boulders and every postcard's camera); a test walks
  every sheep's round against it. Boulders are known only once `rocks` has built
  (`world.clutter`), so the test's flock does not know them. Move a view, and look again.
- A sheep's round is a loop of two to four places, walked in straight lines; it never meets
  another sheep, so two can walk through each other. Nothing but the boulders and the walls
  turn them: an exploring visitor walks through a sheep, and the tour's legs ignore them.
- The flock keeps its own clock (`at` in `shared/flock.ts`): it stops when the sun is under a
  degree and a half, so every sheep lies down where it stood, and runs again from sunrise.
- The trods are worn only where the path's picture reaches (`terrain/wear.ts`, its second
  channel): the brae and the inbye. The far hefts have sheep and no trods; a picture of the
  whole island would cost the path its texels. The sheep do not walk on their trods.
- Triangles are at 75% (desktop) and 72% (mobile). The walling stones are still 80
  triangles on desktop, drawn three times; the cope is 20 since `heather`.

- **The heather is a rule, not a map** (`shared/moor.ts`): above a fifth of the relief, off
  slopes over 0.3, in noise patches. The land's colour and the bushes read it; the grass
  tufts, the flock and the wood do not (sheep stand in it, a lone birch may). The bushes are
  in the tufts' material to share its program, so they sway by the grass's `BLADE`.
- The bushes are kept out of the mirror and cast no shadow: from far off the moor is its
  ground colour. On a phone, at its coarser grid, the bloom is thinner.
- **The high cloud lies on the dome** (`shared/cirrus.ts`): it never parallaxes, casts no
  shadow, and the low clouds' shadow map does not know it. Its layer moves 700 units in a
  day, so a visitor sees the same sky at the same bearing each round. `COVER` and `OPACITY`
  were tuned on `hero` at second ten; the night thins it (`NIGHT_THINS` in `sky.ts`).

## Ideas

Parts for a chapter, never a day by themselves.

- Flat stones set as steps into the steepest stretch of the path.
- A second colour of dawn: the stops are by the sun's height alone, so morning and evening
  are the same sky. A cooler, pinker east would need the hour as well as the height.
- The moon always full, because it stands opposite the sun. A phase would need it to be its
  own body, and then some nights would have none.
- Whitecaps far out where a gust crosses deep water. The heather paling as a gust crosses it.
- Stooks, a peat stack, a scythe left on the dyke: late summer on the infield, a later day.
- A kailyard against the house's gable. Peat banks cut into the moor, a peat stack by the door.
- An axe left in a stump by the stack. Leaves torn off the wood by a gust and carried
  downwind. A few of the birches turned yellow, for a day late in the summer.
- Something that lives here and is never near: terns over the stacks, a seal's head off the
  landing. Small, far, and gone when looked for. Sheep on the shore at low water, for the weed.
- The flock gathered: on one day of the year, all of it in the fold and its pen full.
- The boat's sail, furled on its yard along the thwarts, and a creel or a net on the beach.
- Grass growing on the shelter's roof: the meadow's own tufts. The tuft's shape and material
  would move out of `features/tufts` into `shared/` so both are drawn with one program.
- Stones stood on end for the shelter's door jambs, the way the landing's two are.
