---
title: Heather and high cloud
summary: The hill above the head-dyke is a moor of heather in bloom, in bushes and patches, and a mackerel sky combed by the wind aloft lies over the whole island, gold at evening and silver under the moon.
kind: feature
model: claude-opus-5-5
---

Late summer, over the whole island at once: the high ground and the high air.

- **The moor** (`shared/moor.ts`, `terrain/index.ts`, `tufts/heather.ts`). Above the level of
  the head-dyke the land is heather now, in patches with grass between them, thickest on the
  tops, giving way to bare rock only on the true cliffs. One rule (`world.moor.heatherAt`) is
  read by the land's colour, a new palette entry (`heather`, a dusky mauve), and by the
  bushes: low faceted domes of 15 triangles, tried for 3,000 times on desktop and 1,000 on a
  phone and kept as often as the heather's share says, each its own shade of bloom, some
  browned. They are drawn in the grass's own material, so they lean in the same wind and cost
  no new program; the grass tufts make way for them. They keep off the
  path, the house, the walls, the field and the cairn's spill, and out of the sea's mirror.
  A test keeps the heather off the field and the shore and in patches on the hill.
- **High cloud** (`shared/cirrus.ts`, `environment/sky.ts`, `environment/stars.ts`). A thin
  layer on the dome: long streaks along the wind aloft (`ALOFT` in `shared/wind.ts`, turned half
  a radian from the wind below and a third as fast), broken across into a mackerel sky. It takes
  the low clouds' two colours from the hour, nearer the lit one toward the sun: gold in `hero`,
  rose at sunset, silver under the moon, where it is fainter and the stars show between its
  bands. The sun and the moon shine through it, dimmed. The sea gives it back. It is two value
  noises a sky fragment: no draw call, no triangle, no program.
- **A postcard**, `moor`: in the heather on the north-east slope, looking up at the cairn on
  its hill under the streaked sky. It stands between `ridge` and `east` on time taken from that
  one leg (5 + 5 + 5 of its 15 s), so the day is still 289.5 s and every stop keeps its hour.
- **Room made first.** The walls' cope, half their five hundred stones, is cut with 20 facets
  instead of 80 on every tier (two meshes now, one material); a phone cuts the birches' crowns
  with 20 instead of 80.

In `hero` the sky over the island, plain until today, is streaked with gold cloud from the top
of the frame down to the cairn, and the hill behind the house and the cairn's shoulder have
gone from green-grey to the mauve of heather. `ridge`, `summit`, `cove` and `moor` are moor.

**Why.** No requests. The roadmap's two chapters show neither in `hero` (the inside of the house,
the night); the second asked for "thin high cloud combed by the wind", which this is, by day as
well. The owner wants the thumbnail to change at a glance: the sky is half of it.

**Cost**, from the gate on `hero`: desktop 55 draws and 626,036 triangles before, 59 and
601,136 after (78% to 75%); mobile 50 and 236,123 before, 53 and 216,122 after (79% to 72%).
Live programs stay at 31 of 40. `bun run diff` has `hero` 26% changed, `summit` 35% and `ridge` 43%.

**Next.** The night: the masthead lantern and the window's light on the grass. The heather
could take the gusts in its colour, as the barley does.
