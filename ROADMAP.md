# Roadmap

The curator's own rolling plan. Each run removes what it did, adds what it learned, and keeps
this short: a plan nobody can read in a minute is not a plan.

## Next

Each item is one day: a whole chapter, built complete (both tiers, a postcard, the tour).

1. **Inside.** The shelter and the mill are shells. A floor, a hearth with the fire in it, a
   bench; in the mill the stones, the hopper and a sack; and a rig that knows a wall from a
   door, for the visitor who walks in.
2. **A night worth staying up for.** The night is a moon, stars, high cloud and one lamp. A
   lantern at the boat's masthead, the window's light falling on the grass, a meteor now and
   then.
3. **The harvest home.** Stooks stand on the cut rigs and the mill turns, with nothing between
   them: round stacks on stone bases in the lee of the house, a kiln to dry the grain, a
   sledge or a creel left by the gate.

## Known problems

- **The wood is typed in to fit `hero`** (`HEART`, `REACH` in `shared/wood.ts`): right of the
  house, clear of the cairn's hill. Which trees stand is a rule. Reshape the land or move the
  shelter and look at `hero`, `wood`, `shelter` and `east` (mostly wood now) again.
- **The infield is typed in to fit `hero`** (`FIELD`, `HEAD`, `FOLD` in `shared/infield.ts`).
  What it holds is read from the land. Its tests keep the walls off the path, the house, the
  way to its door, every tree and every low camera; the wood does not know the walls, the
  test does. Move the shelter, the path or the land and look at `hero`, `landing`, `boat`,
  `infield`.
- The walls are solid only to the eye: the walk goes through them, and the flown legs clear
  them only because they keep five units up.
- The lone birches are strewn by rule (`strew`). One stands by the burn below the dyke (in
  `hero`, `landing`, `boat`; from `burn` it stands before the mill). Tests keep every tree
  off every camera and out of the tour's way.
- **The afternoon has no time left to lend.** `skerry`, `wood` and now `mill` stand on time
  cut from its legs: `east` 4, `skerry` 4, `wood` 3, `shelter` 5, `boat` 4, `infield` 4,
  `mill` 4.5, `flock` 3, `burn` 3.5, `starlings` 4. `skerry`'s leg turns the camera 33 degrees
  a second and `mill`'s 32.5, of the 35 the test allows. `mirror` and `moor` split a 15 s leg.
  Change one and the day test fails until they sum to what they did. Growing `DAY` instead
  does not work as it stands: 9 s more put `ridge` two degrees under the horizon, and each
  second then added to `cove`'s leg (22 s now, the sun half a degree up at `ridge`) won back
  0.15. The next view needs `EDGE` and `SLOW` retuned first.
- Nothing knows a tree is there but the boulders: a visitor walks through a trunk, tufts grow
  against it, the lamp lights its far side. The crowns are lit as if half turned to the sky
  (`SKYWARD` in `wood/timber.ts`), a little bright under the moon; they are solid lumps, with
  a few texels of shadow and none dappled under them.

- The first frame waits for every shader program to link (`lib-stack/README.md`, "Tried and
  dropped").
- The terrain's slope is read from `world.grid`, so it is measured across grid points, which
  are further apart on the smaller tiers. A rule keyed to slope (the rock line) lands a little
  differently on each tier.
- `bun run diff` and the gate's policy check trust the local `origin/main`, which is behind in a
  fresh checkout: the gate then reports other people's commits as yours. Run
  `git fetch origin main` before believing either.
- The tour's flown legs keep five units over the ground but do not know what stands on it.
  `climb` to `island` leaves the cairn 21 units to one side. A new view near a tall thing needs
  a look at the legs into and out of it.
- A leg between views that face opposite ways whips the camera round: a test walks the loop
  and fails over 35 degrees a second. Add a view between, or give the leg time.
- The path is colour only: benching it would change `ground.heightAt` for everything that
  stands on the land.
- The path follows the land, but two views do not follow the path: `landing` and `climb` are
  typed in at its foot and 68 units up it. Reshape the land or move `LANDING_BEARING`
  (`shared/path.ts`) and they must be moved too; the tour test says when the walk has left it.
- The shelter's site (`shared/shelter.ts`) and its postcard are typed in; how it sits is read
  from the land, which is not benched for it. Neither it nor the mill has an inside, and the
  walk knows only `ground`: a visitor walks through their walls. The lamp casts no shadow.
- The boat's place is a rule (`boat/mooring.ts`); its anchor lies under the `landing` view's
  feet, and that view does not show the boat. Move `HEADING` in `shared/wind.ts` or the
  landing and look at `hero`, `boat` and `landing` again. It rides the swell and shadows the
  water; a visitor walks through it; it makes no wake.
- The clouds' shadow and the sun's shadow map do not know each other: a boulder's own shadow
  is as dark under a cloud as in the open. The clouds' is laid as if the light never stood
  lower than 24 degrees (`REACH`), so a turning sun cannot send it racing.
- `HEAD_START` in `shared/wind.ts` was picked by looking at second ten of this layout of
  clouds: the low sun stands clear in `hero` with two bars of cloud under it. Change the
  clouds, the wind or the sun's place at second ten (`OPENING`, `NORTH`) and pick it again.
  The same clock bends the smoke.

- **The day is typed in to fit the tour.** `DAY` in `shared/daylight.ts` is the loop's length
  (313.5 s) and `OPENING`, `EDGE` and `SLOW` put each stop at its hour. Change a leg's time
  and a test in `rig/tour.test.ts` fails until `DAY` follows; `OPENING` follows `DAY` by
  itself. Then print the sun's height at every stop. A visitor who takes the camera keeps the
  same clock: nothing lets them wait for the moon or hurry the dawn.
- Every postcard, and so every thumbnail in the gallery, is taken at second ten: the gallery
  will never show the night. A second picture of an iteration (`seaward` at second 90) needs
  `budgets.json` and the site's scripts: a framework day.
- The moon and the shelter do not fit in one frame: the hill behind the shelter is too steep.
  `seaward` settles for the path, the boat and the moon's road on the water; the mill's roof
  is in its corner now.
- At the handover (sun seven degrees down) nothing casts a shadow for a few seconds and the
  land is lit by the sky alone. The light on the land never comes from lower than seven
  degrees (`LOWEST`), so at sunset the shadows are shorter than the sun says.
- The haze on the island is one colour, the horizon's. The sea and the land beyond fade into
  the glow on the sun's side (`features/beyond` does it by hand); the island's own far slopes
  still grey toward a sunset. Doing it for every lit material is `shown` in `shared/lit.ts`.

- **The land beyond is typed in to fit `hero`** (`REACHES` in `shared/beyond.ts`). The
  headland's shoulder stops just short of the sun at second ten, and a test fails when it does
  not. Move the sun's place at second ten (`OPENING`, `NORTH`) or `hero`, and retune it by
  printing the skyline from `hero` bearing by bearing, as the test does.

- **The mirror draws the world twice** (`water/mirror.ts`): everything over the water again
  from under it, at half the picture's size (a third on a phone). Tufts, barley, stooks and
  the mill's boards are kept out of it (`keepOutOfMirror`), the wood and every wall's stones
  on a phone. Something new that is many and small should be too. It draws even when little
  water is on screen.
- **Every shader is TSL** (`.claude/skills/threejs-scenes/references/tsl.md`): node
  materials, three's `WebGPURenderer` forced onto WebGL 2 so a visitor gets what the gate
  judged. Native WebGPU is one flag in `main.ts`, the owner's to turn: untried here.
- `main.ts` reaches into three's backend to keep instance matrices out of uniform arrays:
  look at it again when three is bumped.
- The sea is still a flat plane: the swell tilts its light and the reflection, it does not move
  the surface, so the boat heaves on water that does not. The surf is a thin line from `hero`:
  the shelf there is steep. The land beyond still has no surf.
- What stands in the sea is told to it at build (`world.wash.stand`): the boulders, the
  landing's stones, the head-dyke's foot. Something new that stands in the water must say so,
  and `water` must stay last in `index.ts` to hear it. The boat is three uniforms, set each step.

- **The hefts are typed in to fit `hero`** (`HEFTS` in `shared/flock.ts`): the brae, the
  inbye, the dooryard, the fold, and two on the far side for `cove`. Which ground a sheep
  stands on is a rule; a test walks every sheep's round against it. Boulders are known only
  once `rocks` has built (`world.clutter`), so the test's flock does not know them. Move a
  view, and look again.
- A sheep's round is a loop of two to four places, walked in straight lines; it never meets
  another sheep, so two can walk through each other. Nothing but the boulders and the walls
  turn them: an exploring visitor walks through a sheep, and the tour's legs ignore them.
- The flock keeps its own clock (`at` in `shared/flock.ts`): it stops when the sun is under a
  degree and a half, so every sheep lies down where it stood, and runs again from sunrise.
- The trods are worn only where the path's picture reaches (`terrain/wear.ts`, its second
  channel): the brae and the inbye. The far hefts have sheep and no trods; a picture of the
  whole island would cost the path its texels. The sheep do not walk on their trods.

- **The skerry is typed in to fit `hero`** (`REEF` in `shared/skerry.ts`): bottom right, in
  the one patch of water `shelter`, `wood`, `infield`, `boat` and their legs leave free. A
  test holds it in the frame, off every camera and under the tour. Move a view, look again.
- Its rocks are not land: `ground` does not know them, a visitor walks through, no shallows
  gather round them. At second ten the hill's shadow is on the reef: a dark shape, pale seals.

- **The heather is a rule, not a map** (`shared/moor.ts`): above a fifth of the relief, off
  slopes over 0.3, in noise patches. The land's colour and the bushes read it; the grass
  tufts, the flock and the wood do not (sheep stand in it, a lone birch may). The bushes are
  in the tufts' material to share its program, so they sway by the grass's `BLADE`.
- The bushes are kept out of the mirror and cast no shadow: from far off the moor is its
  ground colour. On a phone, at its coarser grid, the bloom is thinner.
- **The high cloud lies on the dome** (`shared/cirrus.ts`): it never parallaxes, casts no
  shadow, and the low clouds' shadow map does not know it. Its layer moves 700 units in a
  day, so a visitor sees the same sky at the same bearing each round. `COVER` and `OPACITY`
  were tuned on `hero` at second ten; the night thins it (`NIGHT_THINS` in `sky.ts`, 0.75 since
  `starlings`: it was busy over the moon from `seaward`).

- **The starlings are typed in to fit `hero`** (`OVER`, `LIE`, `ROOST_AT` in `shared/starlings.ts`):
  the cloud wheels over the summit's western shoulder and lies broadside to `hero` at second
  ten; a test fails when a bird is out of that frame then. Its round is its own (`LAP`), not the
  day's, so the next loop finds it elsewhere on it. Times are the sun's height (`COME`, `ROOST`,
  `LEAVE`). They roost in the head-dyke under the brae; the walls do not know they are in them.
- The birds fly through anything in their way but the land: the smoke, the clouds, the tour's
  camera on the `flock` to `hero` legs. A wing is two triangles, under a pixel from `hero`:
  the cloud is what reads.

- **Every surface has a texture** (`shared/surface.ts`): noise worked out a fragment, no
  image. `finish(surface)` on a lit material gives it colour and relief. Still things read
  `inWorld`, moving ones `inItself`. The land decides sand, turf, heather and rock a fragment
  from `aLand` (`terrain/land.ts`). Each kind of finish is a program (29 of 40): make a new
  material like an old one and it costs none. A grain fades out once a pixel spans half a
  cycle (`kept`); the brae is in shadow at second ten.
- **Displacement is only the crags**: the land's vertices are pushed where it is rock
  (`aLand.w`), never where anything stands, nor near the burn. Relief elsewhere is light, not
  shape: real displacement wants a finer land near the camera, and triangles the budget lacks.
- Not textured: sea, clouds, smoke, barley, tufts, pennant, starlings, the lamp.
- **The burn's course is the land's** (`shared/burn.ts`): it falls from `SPRING` (typed in to
  fit `hero`) and turns aside from the path and the landing's slip (`SHY`, `NEAR`), so below
  the dyke it runs across a slope of 0.5 to 0.9, not down it: nothing can be built there. Its
  water lies on the land, which is not cut for it. It is not in the sun's shadow map, and no
  rain swells it. The pool is a slow reach, not level water. From `hero`, lower than the
  pool, only water that falls toward the camera shows.
- **The mill is typed in to fit `hero`** (`ABOVE_POOL`, `MILL_RACE` in `shared/mill.ts`):
  astride the burn on the one gentle shelf, under the cairn, 3.3 from the path and 2 from the
  fold. It hides the white falls under the spring from `hero`; from `mill` they show over its
  roof. The walls start where the hill is; the burn lies on the land under the floor and is
  only called white below it (`CHURN` in `features/burn`); the wheel turns at one pace. Its
  door is shut and nothing is inside. A visitor walks through it. Tests hold its site, the
  way to its door over the bridge, the water-gate and the tour off its walls.
- The water-gate is found, not typed (`mill.gate`: where the burn meets a wall). `dyke.ts`
  leaves out the stones within it after their draws are taken; its poles are in the mill's
  one mesh of boards. Stones, courses and turf roofs are shared now (`shared/masonry.ts`,
  `shared/roof.ts`): a third building is a plan and a list of openings.
- **The harvest is a rule** (`CUT` in `infield/rigs.ts`): the first two rigs of each plot of
  barley are stubble, with stooks down their crowns. The stooks wear the stone's material to
  share its program, so their grain is stone's. Nothing has been carried: no stack, no sheaf
  at the mill.
- The sheep's rule is passed the burn and the mill now (the feature had left the burn out):
  the brae's flock stands a little differently.
- **The grass is not planted** (`features/grass`): the same blades are gathered ahead of the
  camera (`PATCH`), so `hero`, out on the water, draws almost none and still pays for them.
  Where it grows is one picture (`sward.ts`): move a wall or the path and it follows. Blades
  cast no shadow and stand through a sheep's feet. Tufts are still planted, as before.
- Triangles: desktop 77%, mobile 79%. The dykes' and the mill's stones are 20 facets on every
  tier, the waymarks' on a phone. To pay for the mill a phone leaves the house's stones out
  of the mirror and the mill's out of the shadow pass (the dark block inside throws it).

## Ideas

Parts for a chapter, never a day by themselves.

- A second colour of dawn: the stops are by the sun's height alone, so morning and evening
  are the same sky. A cooler, pinker east would need the hour as well as the height.
- Whitecaps far out under a gust. Terns over the stacks. Weed on the reef below the tide.
- A peat stack, a scythe left on the dyke. A kailyard against the gable.
- Leaves torn off the wood by a gust. A few birches turned yellow.
- The boat's sail furled on its yard; a creel or a net on the beach.
- Parallax in the land's relief; wet stone beside the burn; ripples where a seal dives.
