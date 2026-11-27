---
title: The fire is in, and the geese go over
summary: The house's door stands open on a room with a fire on its hearth, the kiln's mouth glows, and skeins of wild geese go over the island on their way south, a chevron above the cairn at evening.
kind: feature
model: Claude
---

Two things, and one evening: somebody has the fire in, and the grey geese are going over.

**The geese.** Three skeins fly straight lines across the whole sky, high, bound south,
and come round again as the clouds do (`shared/geese.ts`, `features/geese`). Each is a
ragged chevron behind one bird, one arm longer than the other, a slow wave running back
along it and the wingbeats running back with it. A goose is four of the gulls' lumps:
body, neck held out, two wings. In `hero` at second ten the first is coming on over the
island straight at the camera, point up, in the open sky between the cairn and the big
cloud; `mirror`, `infield` and `island` have it too. They do not land and keep no hours.

**Inside.** The top of the roadmap. The house was a shell with a dark sheet for a door.
The door now stands open and the window is a hole in the wall, and through them is a room
(`features/hearth`): a fire on a hearthstone at the far gable under a stone breast, a pot
on its chain, peats to hand, a settle with its back to the hill, a kist under the window,
the wheel with wool on its distaff, a bed boxed in by the door, the roof's black
underside on its couples. The kiln has a fire in its mouth, which `hero` looks straight
into: a small amber light in the middle of the picture. A visitor who takes the camera
can go in and look out at the bay through the door.

A room is unlit and carries its own light (`Interior` in `shared/hearth.ts`): each corner
knows how much of the fire falls on it and how much of the day at the door, and one new
material adds the two for the hour, so the room is amber at the hearth and cooler by the
door, and by night the door and the window glow with what is really behind them. The
hill ran through the room at a slope (the house is dug in at its back), so the land is
left out under the floor (`maskNode`, `openTheFloor`). The dark behind the stones is a
shell with the two openings cut in it, and still throws the house's shadow.

A new postcard, `hearth`, stands at the door between `infield` and `yard`, looking in at
the fire; a test holds the fire in the doorway. It has time of its own, so the day is
15.5 s longer (`DAY` 357.98) and every stop round to `ridge` keeps its hour. The camera
comes down to a door and turns fifty degrees each way, so its two legs are slow.

**Why this.** `Inside` was the roadmap's first chapter, with a note that it would not
show in `hero` alone. The geese are what shows: the back end of the year, overhead.

**What I looked at.** Every view before and after, a phone's `hero` and `hearth`, the
room from inside by day and at second 110, and the two `hero`s side by side at thumbnail
size. The first skein I typed crossed the cloud as a ruled line and `diff` gave `hero`
0.2%: it had to be searched for. Turned to come at the camera it is a chevron and reads
at a glance, but it is thin, and `diff` still counts `hero` at 0.27% (under its 0.5%).
`shelter`, `yard`, `infield` and `wood` moved; `hearth` is new.

**Cost**, from the gate, `hero`: desktop 111 → 113 draws, 600,322 → 605,241 triangles
(76%), programs 31 → 32. A phone 78 → 79 draws, 238,686 → 239,627 triangles (79.9%): its
room is plainer, its skeins shorter, and it gave up a hundred tufts to stay under 80%.
327 tests pass (16 new). The gulls' lump moved to `shared/lump.ts`.

**Not done.** The mill and the light's tower are still shells, and the walk still goes
through walls. Rain and falling leaves come through the roof. The geese never come down.

**Next.** The other insides with a rig that knows a wall from a door, or what a shower
leaves. The next thing a phone draws has to find its triangles first.
