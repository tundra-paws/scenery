# Roadmap

The curator's own rolling plan. Each run removes what it did, adds what it learned, and keeps
this short: a plan nobody can read in a minute is not a plan.

## Next

Each item is one day: a whole chapter, built complete (both tiers, a postcard, the tour).
Neither shows in `hero` at second ten by itself: pair it with something that does.

1. **The other insides.** The mill and the light's tower are still shells: the stones, the
   hopper and a sack in the mill, its door open; a stair in the tower; and a rig that knows
   a wall from a door. `Interior` in `shared/hearth.ts` is how: unlit, its light its own.
2. **A bow.** A rainbow opposite a low sun wherever a shower stands there (the showers
   are `world.weather`). Never in `hero` (the sun is in it): wants a view looking east
   at second ten with rain in it. With it: the last rig cut, a sack at the mill's door.

Leftovers, for a day that has room. The night's: the window's light on the grass, a
meteor, the aurora's light on the far snow. The ebb's: waders at the edge, a broad strand
(the land reshaped under the sea), the small boat aground on it.

## Known problems

- **The tide is one level for the whole sea** (`shared/tide.ts`): `RANGE` 1.2 under high
  water at second ten (`LOW_AT`), twice in `DAY`: lengthen the day and the tide follows.
  Everything was placed against high water (`ground.waterLevel`); the sea only falls from
  it. `RANGE` is what the boat's berth allows (a test: twice her draught under her at
  low water); the small boat never grounds. The beach is steep, one in two and a half,
  so the strand is three units wide.
- **The foreshore is three rules from the same numbers** (`shared/shore.ts`): weed on
  every `stone()` below high water, by its height in the world, wherever it is; on the
  land's rock, in clumps on its sand, and a line cast up 0.42 over high water
  (`terrain/land.ts`); tangle under low water, in the land's colour and the sea's, dulling
  the mirror where it is awash (`water/shader.ts`). The strand's wet (`strand` in
  `terrain/wet.ts`) is laid over the rain's: at second ten the rain has wet everything, so
  the strand reads by its stain and its sheets of sky.
- What stands in the sea tells it twice, for high water and for low (`wash.stand`): the
  map has a channel for each. The pier is laid to low water (`TIDAL`); the landing's
  outer stones are covered at the flood. The tender's ropes are a mesh of their own, out
  of the mirror. The views' heights and the tour's are still over high water: at second
  ten every camera on the sea is 1.2 higher over it. A visitor's floor is the tide's
  (`RigEnv.sea`). The far lands' shores, the seals, the gulls and the nets keep no tide.

- **The wood is typed in to fit `hero`** (`HEART`, `REACH` in `shared/wood.ts`): right of the
  house, clear of the cairn's hill. Which trees stand is a rule. Reshape the land or move the
  shelter and look at `hero`, `wood`, `shelter` and `east` (mostly wood now) again.
- **The infield is typed in to fit `hero`** (`FIELD`, `HEAD`, `FOLD` in `shared/infield.ts`).
  Tests keep its walls off the path, the house, every tree and every low camera. The walls
  are solid only to the eye: the walk goes through.
- **The afternoon's legs are as short as they go** (`skerry`'s turns 33 degrees a second of
  the 35 allowed). A stop after `ridge` takes time of its own, as `fall` did: add it to
  `DAY`. One before `ridge` moves the morning: retune `NIGHT` and `TURNED`.
- Nothing knows a tree is there but the boulders: a visitor walks through a trunk. The
  crowns are lit as if half turned to the sky (`SKYWARD` in `wood/timber.ts`), a little
  bright under the moon, and throw no dappled shade.

- The land's slope is read from `world.grid`, coarser on the smaller tiers.
- `bun run diff`, the gate's policy check and setup's reference build trust the local
  `origin/main`, which a fresh checkout may hold days stale: `git fetch origin main` first.
- The tour's flown legs keep five units over the ground but do not know what stands on it:
  a new view near a tall thing needs a look at the legs into and out of it. A leg between
  views that face opposite ways fails a test (35 degrees a second): give it time.
- Two views do not follow the path: `landing` and `climb` are typed in at its foot and 68
  units up it. Reshape the land or move `LANDING_BEARING` (`shared/path.ts`) and move them.
- The shelter's site (`shared/shelter.ts`) and its postcard are typed in; how it sits is read
  from the land. The lamp casts no shadow.
- **The room is the house's** (`features/hearth`; `ROOM_*` in `shared/shelter.ts`): one
  unlit mesh with the kiln's fire, its light worked out a corner (`Interior`). Nothing
  inside throws a shadow; the fire lights nothing past the door. The land is left out
  under the floor (`openTheFloor`). Rain and leaves fall through the roof; a visitor walks
  through the walls. `hearth` is typed in at the door (a test holds the fire in the
  doorway); its legs are slow.
- **The geese are typed in to fit `hero`** (`SKEINS` in `shared/geese.ts`): the first
  comes at the camera at second ten (a test). They never land, keep no hours, fly through
  cloud, 1.3 times life (`DRAWN`), 8 over the tour's highest point.
- The boat's place is a rule (`boat/mooring.ts`). Move `HEADING` in `shared/wind.ts` or the
  landing and look at `hero`, `boat`, `landing` and `pier` again. No wake.
- **The sail is up, always** (`boat/sail.ts`): a flag in the boat's frame from the gust
  and her sheer. No shadow on the sea. The camera never asks where it is: `infield` moved
  inshore of it, and the leg in from `boat` turns 34 degrees a second of 35.
- **Cloth lets light through** (`letThrough` in `shared/lit.ts`): the sail and the washing,
  not the pennant or the nets. Tuned on `boat` at second ten.
- **The washing line is typed in to fit `hero`** (`GREEN` in `shared/washing.ts`), on the
  contour between the house and the field. The flock is told (`clutter`); a visitor is not.
- **The pier is typed in to fit `hero`** (`JETTY`, `NETS`, `RACK`, `TENDER` in
  `shared/pier.ts`): between the landing's east row and the field's corner, short of the
  boat's swing. The boat moved for it (`ASIDE`), as near the skerry as that test lets it.
  Tests hold it off the tour and every camera. Its stones are not land: a visitor walks
  through it. The sea breaks round a row of discs: no shadow, no lee.
- The nets are opaque folds, moved on the CPU. The gulls go round over water only, clear
  of every camera (a test); the stream `'gulls:b'` was picked for `hero`.
- A phone's gate, stooks, sheep's heads and small boat throw no shadow; its sea gives back
  no boulder, pennant, smoke or waymark.
- **The light's tower is the pier's** (`pier/tower.ts`, `pier/plan.ts`): its stones are in
  the pier's mesh, its lantern in the gear. The lamp is a second point light
  (`pier/beacon.ts`), out by day; every lit material pays for it. Its road on the water
  (`roadOn`) is a column with dashes, not a reflection. The door is a dark gap. The
  lamps' hours are `shared/lamps.ts`.
- **The aurora is drawn round the camera like the stars** (`features/aurora`): a curtain
  north of the holm, bright on the darkest of the night (`DARK`). It lights nothing.
- The clouds' shadow and the sun's shadow map do not know each other. The clouds' is laid
  as if the light never stood under 24 degrees (`REACH`).
- `HEAD_START` in `shared/wind.ts` was picked by looking at second ten of this layout of
  clouds: the low sun stands clear in `hero`. Change the clouds, the wind or the sun's place
  at second ten and pick it again, and the first shower's `OPENING` with it.

- **The day is typed in to fit the tour.** `DAY` in `shared/daylight.ts` is the loop's length
  (358 s). `NIGHT` and `TURNED` (the slow part's seconds, and how far the sky turns in
  them) hold the stops from `landing` to `ridge` at their hours, and `TEN` holds second ten's
  sun; `EDGE`, `SLOW`, `NOON` and `OPENING` follow. `ridge` is half a degree after sunrise.
- Every postcard, and so every thumbnail, is taken at second ten: the gallery will never
  show the night. A second picture of an iteration (`seaward` at second 90) needs
  `budgets.json` and the site's scripts: a framework day.
- At the handover (sun seven degrees down) nothing casts a shadow for a few seconds.
- The haze on the island is one colour, the horizon's. The sea and the land beyond fade into
  the glow on the sun's side (`features/beyond` does it by hand); the island's own far slopes
  still grey toward a sunset. Doing it for every lit material is `shown` in `shared/lit.ts`.

- **The land beyond is typed in to fit `hero`** (`REACHES` in `shared/beyond.ts`). The
  headland's shoulder stops just short of the sun at second ten: a test holds it. Move the
  sun's place then (`OPENING`, `NORTH`) or `hero`, and retune it by printing the skyline
  from `hero` bearing by bearing, as the test does.

- **The mirror draws the world twice** (`water/mirror.ts`), at half the picture's size (a
  third on a phone). What is many and small is kept out (`keepOutOfMirror`), more on a
  phone. It draws even when little water is on screen.
- `main.ts` reaches into three's backend to keep instance matrices out of uniform arrays:
  look at it again when three is bumped.
- The sea is a flat plane: the swell tilts its light and the reflection, not the surface.
  The land beyond has no surf.
- What stands in the sea is told at build (`world.wash.stand`): `water` stays last in
  `index.ts` to hear it. The boat is three uniforms a step; the small boat is not told.

- **The hefts are typed in to fit `hero`** (`HEFTS` in `shared/flock.ts`). Which ground a
  sheep stands on is a rule; a test walks every round against it. Boulders are known only
  once `rocks` has built (`world.clutter`): the test's flock does not know them.
- The flock lies down where it stood when the sun is under 1.5 degrees (`at` in `flock.ts`).
- The trods are worn on the brae and the inbye only; the sheep do not walk them.

- **The skerry is typed in to fit `hero`** (`REEF` in `shared/skerry.ts`): bottom right, in
  the one patch of water `shelter`, `wood`, `infield`, `boat` and their legs leave free. A
  test holds it in the frame, off every camera and under the tour. Its rocks are not land:
  a visitor walks through, and no shallows gather round them.

- **The heather is a rule, not a map** (`shared/moor.ts`): above a fifth of the relief, off
  slopes over 0.3, in noise patches. The land's colour and the bushes read it; the tufts,
  the flock and the wood do not. The bushes are in the tufts' material: they sway by the
  grass's `BLADE`.
- **The high cloud lies on the dome** (`shared/cirrus.ts`): it never parallaxes, casts no
  shadow, and the low clouds' shadow map does not know it. `COVER` and `OPACITY` were tuned
  on `hero` at second ten; the night thins it (`NIGHT_THINS` in `sky.ts`).

- **The starlings are typed in to fit `hero`** (`OVER`, `LIE`, `ROOST_AT` in
  `shared/starlings.ts`): broadside to it at second ten (a test). Its round is its own
  (`LAP`); its times are the sun's height.

- **Every surface has a texture** (`shared/surface.ts`): noise worked out a fragment, no
  image. `finish(surface)` on a lit material gives it colour and relief. Still things read
  `inWorld`, moving ones `inItself`. The land decides sand, turf, heather and rock a fragment
  from `aLand` (`terrain/land.ts`). Each kind of finish is a program (33 of 40): make a new
  material like an old one and it costs none. A grain fades
  out once a pixel spans half a cycle (`kept`).
- **Displacement is only the crags**: the land's vertices are pushed where it is rock
  (`aLand.w`), never where anything stands, nor near the burn.
- Not textured: sea, clouds, smoke, barley, tufts, pennant, starlings, the lamp.
- **The burn's course is the land's** (`shared/burn.ts`): it falls from `SPRING` (typed in to
  fit `hero`) and turns aside from the path and the landing's slip (`SHY`, `NEAR`), so below
  the dyke it runs across a slope of 0.5 to 0.9, not down it: nothing can be built there. Its
  water lies on the land, which is not cut for it, out to low water. It is not in the sun's
  shadow map. The pool is a slow reach, not level water.
- **The mill is typed in to fit `hero`** (`ABOVE_POOL`, `MILL_RACE` in `shared/mill.ts`):
  astride the burn on the one gentle shelf. The burn lies on the land under the floor; the
  wheel turns at one pace; the door is shut and nothing is inside. Tests hold its site, the
  way to its door, the water-gate (found, not typed) and the tour off its walls.
- **The harvest is a rule** (`CARRIED`, `STANDING` in `infield/rigs.ts`): of a plot of barley
  the first two rigs are bare stubble, the last still stands, the rest are in stooks. The
  field has one such plot. The stooks wear the stone's material to share its program.
- **The yard is typed in to fit `hero`** (`KILN`, `STACKS` in `shared/yard.ts`): four
  stacks before the door, no room for a fifth. Its fire is `hearth/kiln.ts`. A phone's
  stacks have no ropes. Tests hold it off everything else and the tour.
- **The back end of the year is three rules.** The turn (`TURNED` in `wood/birch.ts`): a
  lump is gold by where it is and its tree's lean. The bracken (`shared/bracken.ts`): beds
  between the turf and the moor, sharing `aLand.z` with the heather. The litter
  (`wood.litterAt`, `aLitter`): under each tree, carried downwind. The falling leaves
  (`wood/fall.ts`) are 720 matrices set on the CPU: no shadow, no mirror.
- **The grass is not planted** (`features/grass`): the same blades are gathered ahead of the
  camera (`PATCH`). Where none grows in the patch (`sward.growsNear`) none is drawn. Where
  it grows is one picture (`sward.ts`): move a wall or the path and it follows. Blades
  cast no shadow and stand through a sheep's feet. Tufts are still planted.
- **The wet is one number for the whole island** (`shared/weather.ts`): a shower over any
  of it wets all of it, and it dries in some four minutes (`DRY`). `PASSED` in
  `clouds/showers.ts` is typed in to fit `hero` (a test): it crossed the island just before
  second ten. Nothing under a roof keeps dry. A wet face gives back the dome's colours
  (`skyGivenBack` in `lit.ts`), never a cloud or the land. Puddles and the strand's sheets
  are the noise's hollows, not the land's low places.
- **The run-off faces `hero`** (`TOWARD` in `shared/runoff.ts`): rills rise on steep high
  faces looking at its camera, in the burn's material, out of the mirror, and lie on the
  land through walls, tufts and sheep. A phone has 16, the desktop 22 (all that fit).
- **The showers are clouds** (`clouds/showers.ts`, `rain.ts`): five, from a stream of
  their own. The first is typed to stand off the headland in `hero` at second ten, left of
  the sun (`OPENING`): a test holds it. They come round every 285 s on another line.
  Rain is opaque streaks a pixel wide, and falls through roofs.
- Triangles: desktop 77%, mobile 82.4% (the tide gave a little back: less sea floor is built); a phone's draws 80 of 100. Its clouds are 27k, twice (the mirror): the next room is there. What is
  only lit at night (the aurora, the lamps' panes, the stars) is not drawn by day. Crowns
  are 36 facets on desktop (20 on a phone), drawn three times; walls' stones 20 on every
  tier. On a phone no building's stones throw a shadow (the dark block inside does), nor
  the dykes' cope, and none is in the mirror.

## Ideas

Parts for a chapter, never a day by themselves.

- A second colour of dawn: morning and evening are the same sky, by the sun's height alone.
- Whitecaps far out under a gust. Terns over the stacks. Fronds of tangle that sway.
- A peat stack at the gable, a scythe on the dyke, a kailyard. Geese down on the stubble.
- Parallax in the land's relief; ripples where a seal dives.
- A wake when a boat moves. The sail lowered at dusk; its shadow on the sea.
