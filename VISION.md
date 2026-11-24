# Vision

What this world is for, and where it is going. Two voices: the owner's constraints, which hold
whatever the direction becomes, and the direction itself, which the curator writes and keeps.

## Constraints (the owner's)

The curator works within these and does not rewrite this section.

- **One place, growing.** Each day adds to or deepens the world that is already there. Nothing is
  thrown away for novelty; what stops working is reshaped, not replaced.
- **Made from code.** Shapes, colours, textures and motion are generated. A binary asset is the
  rare exception, small, and argued for in the journal.
- **It runs on a phone.** The mobile tier gets the same world, with fewer of things. A change
  that only looks right on a desktop is not finished.
- **It needs nothing but itself.** No network, no account, no storage a visitor would miss.
- **Quiet by default.** A visitor who touches nothing gets a slow tour of somewhere worth
  looking at. Taking the camera is an invitation, not a requirement.
- **A place anyone can visit.** Nothing violent, sexual or hateful. No real people, brands or
  logos.

## Direction (the curator's)

**What this place is.** A small northern island that someone walked before you. Nobody is ever
seen on it, only what they left: stones stacked on the summit, later a path, a shelter, a light.
A stranger should know it as "the island with the cairn", and now there is a house under it
with the lamp lit and the fire in, a boat at anchor off the landing, and still nobody. It lies
off a mountain coast: a high fell and a long range in the haze to the north-west, which nobody
goes to, and which the sun goes down behind.

**Mood and light.** One summer's day in the north, turning once in the time the tour takes, so
every stop has its hour. The visit opens on the last of a clear, cool afternoon: a low sun over
the western shoulder, the land in long shadow under an apricot sky. It sets as the tour comes in
to the landing; the walk up is dusk, and the lamp and the window come into their own; the cairn
stands under the first stars; a full moon, never high, lays its path on the sea; then first
light, a rose sunrise, the morning, and round by a short bright noon to the gold again. The
air is moving but gentle: things sway, nothing thrashes. Calm, a little lonely, never bleak:
the night is blue, not black, and there is always a light to see by.

**Palette.** A handful, all in `src/world/shared/palette.ts`. Cool sky blues and a pale horizon
for distance. Moss and dry-straw greens for the living ground. Warm sand at the edge. Grey stone:
darker for what lies where it fell (`rock`), paler for what a hand has placed (`cairn`). One cold
white (`foam`), only where the sea runs out on the land. Bare earth (`path`), sand's duller kin,
only where feet have worn the grass away. Two warm notes, both reserved for light itself: the
sun's cream, and the deeper amber of a flame someone lit (`lamp`), which only the shelter's
lamp and its window show. Clouds have no colour of their own: the sun's cream where they are
lit, the sky's blues where they are not. Smoke is the same. Weathered wood (`timber`) for what
came by sea and did not grow here: the boat, its oars, its mast; tarred near black where it
keeps the water out. And one dyed thing, a worn red (`pennant`): cloth made only to be seen
from the water, and never more than a scrap of it. A new colour needs a job none of these does.
The sky and its light are the exception that is not one: the same few roles (zenith, horizon,
light, fill, ground) at five hours, day, gold, sunset, dusk and night (`HOURS`), blended by how
high the sun stands. At night the light is the moon's cold blue-white, which the stars share.

**Motifs.**
- *Placed stone.* Cairns, markers, walls: the same boulder shape, stacked on purpose. A wall is
  laid in level courses with its corners locked; a roof is the hill's own turf.
- *Wind.* One shared signal that grass, water, clouds, smoke, a pennant and a boat at its
  anchor all read. Steady and gentle; what shows it is that everything answers to it together.
- *The hour.* The other shared signal (`world.day`): where the sun is, and from that the sky,
  the one light and its shadows, the fill, the haze, the sea's colours and the clouds'. Nothing
  keeps a colour of the sky for itself. Sun and moon are one light that is out as it changes
  hands; the lamp is the only light that is somebody's.
- *The line between.* Shore, ridge and horizon: edges are where the detail goes.
- *Distance.* What is far is seen through air: fainter, bluer, and fading into the sky's own
  colour on that side, glow and all. Layers (stacks, headland, range) say how far.
- *Low-poly, flat-shaded, few colours.* Facets are the style, not a shortcut to hide.

**What it is not.** Not a game: no score, no quest, no characters. Not tropical, not fantasy, no
ruins of anything grand, no magic glow. Not busy: every added thing must leave the picture as
quiet as it found it. Not photoreal: no texture maps chasing realism.

**The chapters ahead.** Each is one day's major update, not a week's. Done: the summit cairn, a
shoreline that reads as one, water with depth, wind (in the grass, on the sea, and in a sky of
clouds whose shadows cross the island), the way up (a landing, a worn and waymarked path to the
cairn, which the tour walks), the shelter with its lamp, its fire and its smoke, the boat at
anchor off the landing, the day itself (evening, night with a moon and stars, and morning,
once round in a visit), and the land beyond, which the sun goes down behind. Next: the inside
of the shelter, and a sea that answers to what stands in it.

## Where it starts

A small island in open water under a clear sky: grass, sand, bare rock on the steep faces, some
boulders, tufts of grass. Deliberately plain. It is a place to begin from, not a style to keep.
