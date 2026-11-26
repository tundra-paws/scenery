---
title: The light at the pier's head, and the merry dancers
summary: A round stone tower stands on the pier's head with a lantern that is lit at sunset; its road lies broken on the water all night, the boat shows a riding light, and the aurora hangs in the north.
kind: feature
model: claude
---

The roadmap's next chapter was "a night worth staying up for", which by itself never shows in
`hero` at second ten. So the night got something to see by day as well: the light that is
lit for it. In `hero` a tower now stands on the pier's head in the bottom left, a third of the
frame's height, its lantern over the beach; at night it burns, and the night has more in it.

**The tower.** `pier/tower.ts`: a round tower of the pier's own stone on its head, eight
courses laid round and narrowing as they rise, each begun half a stone over the last, the
doorway left in the first four on the side that looks back along the pier. Corbels and
slabs make a gallery, with an iron rail; on it a plinth, eight panes of glass between bars,
a roof of eight and a ball to let the smoke out. The stones go into the pier's own mesh and
the ironwork into its gear, so the tower adds no draw call of its own. The creels moved
back from the head to make room (`CREELS`); a test holds the tower off them, the posts and
the ladder.

**The lamp.** `pier/beacon.ts`: lit when the sun goes under a degree above the sea and turned
up over a degree and a half (`shared/lamps.ts`), out again at sunrise. The glazing goes the
lamp's amber, drawn with the shelter's flame program; a second point light warms the tower's
head, the deck and the small boat. The sea lays the lamp's road toward whoever looks
(`roadOn` in `water/shader.ts`): a column, wider as it nears, broken across into dashes
that move with the ripples, brightest round the place the level sea would show the lamp,
so from the boat it runs from the tower's foot to the bow and from the air it is a short
glimmer, not a beam. The wash tells the sea where the lamp is (`wash.shine`).

**The riding light.** `boat/riding-light.ts`: a small lantern under the masthead, forward of
the mast, hoisted with the pier's lamp and riding with her.

**The merry dancers.** `features/aurora`: a pale green curtain low in the north, between
the end of the mountain coast and the holm, drawn round the camera like the stars. Its foot
is sharp and rises and falls in two slow waves that travel opposite ways; it is combed into
rays that drift along it, flares in surges, and fades up into a faint rose. It comes out on
the darkest of the night, waxes and wanes every 83 seconds, and the sea gives it back. From
`summit` and `island` it fills the northern sky; from `hero` at night it stands behind the
house. A new palette colour, `aurora`, the one light that is nobody's.

**Room.** Mobile draws were 82 of 100, over the 80% line. The stars are now left undrawn
when the night is too thin for any to show (all day), in the sky and in the sea's mirror;
the phone's sea leaves out the shelter's smoke and the waymarks, as it already left out the
kiln's smoke and every wall. Nothing lit only at night costs `hero` anything at second ten.

**The tour.** `pier` moved out and to the lee (66.5, 101.5) to frame the light on its head
with the small boat, the nets and the cairn over them; `boat`, `landing` and `mirror` pass
the tower, and every stop from `landing` round to `ridge` now has the lamp lit.

**Cost** (gate, `hero` at second ten, against yesterday's ledger line): desktop 113 → 111
draws, 597k → 600k triangles; mobile 82 → 78 draws, 239.3k → 238.7k triangles; programs
31 of 40 (the lamps share the shelter's flame program). At night the aurora, the two lit
lanterns and their mirror images add six draws while the stars come back.

**Next.** The insides, and what a shower leaves. The night's leftovers: the window's light on
the grass, a meteor now and then. The tower is a shell; nothing climbs it.
