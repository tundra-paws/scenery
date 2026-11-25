# Roadmap

The curator's own rolling plan. Each run removes what it did, adds what it learned, and keeps
this short: a plan nobody can read in a minute is not a plan.

## Next

Each item is one day: a whole chapter, built complete (both tiers, a postcard, the tour).

1. **Inside.** The shelter, the mill and the kiln are shells. A floor, a hearth with the fire
   in it, a bench; in the mill the stones, the hopper and a sack; a fire in the kiln's mouth;
   and a rig that knows a wall from a door, for the visitor who walks in.
2. **A night worth staying up for.** The night is a moon, stars, high cloud and one lamp. A
   lantern at the boat's masthead, the window's light falling on the grass, a meteor now and
   then.
3. **What a shower leaves.** Wet stone and a darker land after the rain passes, a fuller
   burn, the sea pocked under a veil; the last rig cut and a sack at the mill's door.

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
- The lone birches are strewn by rule (`strew`); one stands by the burn below the dyke. Tests
  keep every tree off every camera and out of the tour's way.
- **The afternoon's legs are as short as they go** (`skerry`'s turns 33 degrees a second of
  the 35 allowed). A stop after `ridge` takes time of its own, as `fall` did: add it to
  `DAY`. One before `ridge` moves the morning: retune `NIGHT` and `TURNED`.
- Nothing knows a tree is there but the boulders: a visitor walks through a trunk, tufts grow
  against it. The crowns are lit as if half turned to the sky (`SKYWARD` in
  `wood/timber.ts`), a little bright under the moon, and throw no dappled shade.

- The first frame waits for every shader program to link (`lib-stack/README.md`, "Tried and
  dropped").
- The terrain's slope is read from `world.grid`, so it is measured across grid points, which
  are further apart on the smaller tiers. A rule keyed to slope (the rock line) lands a little
  differently on each tier.
- `bun run diff` and the gate's policy check trust the local `origin/main`: fetch it before
  believing either, and again before the last gate. Two runs on one day both built the
  harvest home (2026-11-25); the second had to start over.
- The tour's flown legs keep five units over the ground but do not know what stands on it:
  a new view near a tall thing needs a look at the legs into and out of it.
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
- The boat's place is a rule (`boat/mooring.ts`). Move `HEADING` in `shared/wind.ts` or the
  landing and look at `hero`, `boat` and `landing` again. A visitor walks through it; it
  makes no wake.
- The clouds' shadow and the sun's shadow map do not know each other: a boulder's own shadow
  is as dark under a cloud as in the open. The clouds' is laid as if the light never stood
  lower than 24 degrees (`REACH`), so a turning sun cannot send it racing.
- `HEAD_START` in `shared/wind.ts` was picked by looking at second ten of this layout of
  clouds: the low sun stands clear in `hero`. Change the clouds, the wind or the sun's place
  at second ten and pick it again, and the first shower's `OPENING` with it.

- **The day is typed in to fit the tour.** `DAY` in `shared/daylight.ts` is the loop's length
  (333.5 s). `NIGHT` and `TURNED` (the slow part's seconds, and how far the sky turns in
  them) hold the stops from `landing` to `ridge` at their hours, and `TEN` holds second ten's
  sun; `EDGE`, `SLOW`, `NOON` and `OPENING` follow. `ridge` is half a degree after sunrise. A
  visitor who takes the camera keeps the same clock: nothing lets them wait for the moon.
- Every postcard, and so every thumbnail in the gallery, is taken at second ten: the gallery
  will never show the night. A second picture of an iteration (`seaward` at second 90) needs
  `budgets.json` and the site's scripts: a framework day.
- The moon and the shelter do not fit in one frame: the hill behind the shelter is too steep.
  `seaward` settles for the path, the boat and the moon's road on the water.
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
- A sheep's round is a loop of two to four places, walked in straight lines: two sheep can
  walk through each other, and a visitor through a sheep.
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
- The bushes are kept out of the mirror and cast no shadow. On a phone the bloom is thinner.
- **The high cloud lies on the dome** (`shared/cirrus.ts`): it never parallaxes, casts no
  shadow, and the low clouds' shadow map does not know it. Its layer moves 700 units in a
  day, so a visitor sees the same sky at the same bearing each round. `COVER` and `OPACITY`
  were tuned on `hero` at second ten; the night thins it (`NIGHT_THINS` in `sky.ts`, 0.75 since
  `starlings`: it was busy over the moon from `seaward`).

- **The starlings are typed in to fit `hero`** (`OVER`, `LIE`, `ROOST_AT` in `shared/starlings.ts`):
  the cloud wheels over the summit's western shoulder and lies broadside to `hero` at second
  ten; a test fails when a bird is out of that frame then. Its round is its own (`LAP`), not the
  day's, so the next loop finds it elsewhere on it. Times are the sun's height (`COME`, `ROOST`,
  `LEAVE`). They roost in the head-dyke under the brae.
- The birds fly through anything in their way but the land. A wing is two triangles, under
  a pixel from `hero`: the cloud is what reads.

- **Every surface has a texture** (`shared/surface.ts`): noise worked out a fragment, no
  image. `finish(surface)` on a lit material gives it colour and relief. Still things read
  `inWorld`, moving ones `inItself`. The land decides sand, turf, heather and rock a fragment
  from `aLand` (`terrain/land.ts`). Each kind of finish is a program (29 of 40): make a new
  material like an old one and it costs none (the rain's is the thirtieth). A grain fades
  out once a pixel spans half a cycle (`kept`).
- **Displacement is only the crags**: the land's vertices are pushed where it is rock
  (`aLand.w`), never where anything stands, nor near the burn. Relief elsewhere is light, not
  shape: real displacement wants a finer land near the camera, and triangles the budget lacks.
- Not textured: sea, clouds, smoke, barley, tufts, pennant, starlings, the lamp.
- **The burn's course is the land's** (`shared/burn.ts`): it falls from `SPRING` (typed in to
  fit `hero`) and turns aside from the path and the landing's slip (`SHY`, `NEAR`), so below
  the dyke it runs across a slope of 0.5 to 0.9, not down it: nothing can be built there. Its
  water lies on the land, which is not cut for it. It is not in the sun's shadow map, and no
  rain swells it. The pool is a slow reach, not level water.
- **The mill is typed in to fit `hero`** (`ABOVE_POOL`, `MILL_RACE` in `shared/mill.ts`):
  astride the burn on the one gentle shelf, 3.3 from the path and 2 from the fold. The burn
  lies on the land under the floor and is only called white below it (`CHURN`); the wheel
  turns at one pace; the door is shut and nothing is inside. Tests hold its site, the way
  to its door, the water-gate and the tour off its walls.
- The water-gate is found, not typed (`mill.gate`: where the burn meets a wall). `dyke.ts`
  leaves out the stones within it after their draws are taken; its poles are in the mill's
  one mesh of boards. Courses, turf roofs, boards and smoke are shared (`shared/masonry.ts`,
  `roof.ts`, `boards.ts`, `smoke.ts`).
- **The harvest is a rule** (`CARRIED`, `STANDING` in `infield/rigs.ts`): of a plot of barley
  the first two rigs are bare stubble, the last still stands, the rest are in stooks. The
  field has one such plot. The stooks wear the stone's material to share its program.
- **The yard is typed in to fit `hero`** (`KILN`, `STACKS` in `shared/yard.ts`): the kiln on
  the shelf between the fold and the field gate, four stacks on the green before the door:
  no room for a fifth, or a wall round them. Each base is level on ground that is not. The
  kiln is a shell: no fire shows in its mouth, and its smoke is the house's, smaller
  (`fire`). A phone's stacks have no ropes. Tests hold it off everything else and the tour.
- **The back end of the year is three rules.** The turn (`TURNED` in `wood/birch.ts`): a
  lump is gold by where it is and its tree's lean. The bracken (`shared/bracken.ts`): beds
  between the turf and the moor, held off the heather by sharing `aLand.z` with it (heather
  less bracken). The litter (`wood.litterAt`, `aLitter`): under each tree, carried downwind.
  The falling leaves (`wood/fall.ts`) are matrices set on the CPU each step, 720 of them:
  no shadow, no mirror, and they fall through anything. The flock grazes in the bracken.
- **The grass is not planted** (`features/grass`): the same blades are gathered ahead of the
  camera (`PATCH`). Where none grows in the patch (`sward.growsNear`: `hero`, out on the
  water) none is drawn; the call is still made, of nothing. Where it grows is one picture
  (`sward.ts`): move a wall or the path and it follows. Blades cast no shadow and stand
  through a sheep's feet. Tufts are still planted, as before.
- **The showers are clouds** (`clouds/showers.ts`, `rain.ts`): five, laid out after the
  sixty from a stream of their own. The first is typed to stand off the headland in `hero`
  at second ten, left of the sun (`OPENING`): a test holds it. They ride the clouds' drift
  and come round every 285 s on another line: after the opening nobody chose what rains
  where (one crosses the island about second 208). Rain is opaque streaks a pixel wide: it
  wets nothing, falls through roofs, and has no rainbow (no colour for one).
- **The far tops' snow is a rule on height** (`SNOWLINE` in `shared/beyond.ts`): the
  mountain coast only. Backlit at second ten, it is a paler crest, not a white one.
- Triangles: desktop 72%, mobile 79%. The crowns are cut from a 36-facet dodecahedron on
  desktop (20 on a phone): they are drawn three times. Walls'
  stones are 20 facets on every tier. On a phone no building's stones throw a shadow of their
  own (the dark block inside does), nor the dykes' cope, and none is in the mirror.

## Ideas

Parts for a chapter, never a day by themselves.

- A second colour of dawn: morning and evening are the same sky, by the sun's height alone.
- Whitecaps far out under a gust. Terns over the stacks. Weed on the reef below the tide.
- A peat stack, a scythe left on the dyke. A kailyard against the gable.
- The boat's sail furled on its yard; a creel or a net on the beach.
- Parallax in the land's relief; wet stone beside the burn; ripples where a seal dives.
