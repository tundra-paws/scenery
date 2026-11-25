---
title: The pier at the landing
summary: A stone pier runs out beside the landing, a small boat in its lee and creels on its head; nets dry on poles along the beach, fish on a rack, and gulls go round over the bay.
kind: feature
model: claude
---

The island had a croft and no fishing: one boat at anchor, and nothing on the shore to say
what it was for. Today the shore is worked. The roadmap's own next chapters (the insides,
the night) still cannot be seen from `hero` at second ten; this one is in its foreground.

**The pier.** `shared/pier.ts` places a jetty in the landing's own frame: out of the beach
between the landing's east row of stones and the corner of the field, 13.4 long and 3.6
wide, its deck three courses over the water and its head in four units of it. It is the
house's stone laid dry (`shared/masonry.ts`): five courses battered from under the water,
corners locked, a deck of flat stones, a step at the root, a dark block behind them. The
sea is told where it stands (`wash.stand`) and breaks white along both faces. On it: three
mooring posts, a ladder, creels stacked on the head, a barrel, a fish box, a coiled rope.

**The small boat.** The anchored boat's own hull at six tenths, no mast, oars shipped,
made fast fore and aft in the pier's lee and riding the same swell (`pier/tender.ts`).
`createHullGeometry` now takes what a boat carries; the big one has its sail furled on its
yard. To give the pier its length the boat lies two and a half further along the shore
(`ASIDE`), as near the skerry as the skerry's test allows.

**The nets, the rack.** Five poles along the top of the beach under the field's dyke, a
rope sagging between them with cork floats, and the nets hung from it in folds: the
pennant's material in a bark-steeped brown, a hundred vertices moved on the CPU, leaning
from the wind and stirring as it gusts. West of the landing, in the one gap between its
stones and the burn, a rack of split fish. A worn way leaves the path for the pier's root.

**The gulls.** Seven (five on a phone), four faceted lumps each in the foam's white with a
grey back (`shared/gulls.ts`): five ride the wind in rounds over the bay, two only stand,
on a post and a pole. As the sun goes each comes down to a perch of its own, wings folded,
head to wind, and is away again after sunrise. A test keeps them over water, above the
mast, and three units from the camera all the first day.

**A postcard.** `pier`, low off the pier's head on the way back out: the pier, the small
boat, the nets, the boat's bow, the cairn over all. It stands between `starlings` and
`hero`, looking the way they do; the day is nine seconds longer (`DAY` 342.5) and no other
stop moved. The boat's postcard gained the most: pier, nets and gulls behind the hull.

**In `hero`.** Left of the boat, where there was water: the pier, the small boat against
it, creels on its head. Behind the boat's mast a dark band of nets with pale floats; the
rack by the landing; three gulls across the sun's glow. `diff`: 12 of 23 old views moved,
`hero` by 6.0%, the other 11 by not one pixel (boulders, tufts and grass keep off the
pier after their draws are taken).

**Making room.** A phone began the day at 78 of 100 draws and 79% of its triangles, and the
pier first put it at 86 and 83%. A census of its scene found the passes nobody sees there:
its gate, stooks and sheep's heads now throw no shadow of their own, the small boat throws
none, and its sea gives back no boulder, pennant or kiln smoke (`shore` and `mirror`
looked the same before and after); the pier's stones are out of its mirror like every wall.

**Cost** (the gate, `hero`): desktop 108 draws of 160 (95 before) and 595,810 triangles
of 800,000 (574k before); mobile 79 of 100 (78) and 238,884 of 300,000 (238k). Programs 31
of 40, as before: every material was made like one the island had (the nets take no shadow,
as the pennant does not, or theirs would have been the thirty-second). Textures 10.

**Not done.** The nets are cloth, not net. Nothing is inside the buildings yet, and the
night has only gained gulls on the posts. Next: the insides, with a rig that knows a wall.
