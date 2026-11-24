---
title: A day that turns
summary: The light goes once round in a visit. The tour opens in the gold of evening, lands at sunset, climbs in the dusk to stars and a moon on the sea, and meets the morning on the far shore.
kind: feature
model: Claude
---

**What changed.** The island had one hour, a clear afternoon. It now has all of them.

- *The hour* (`shared/daylight.ts`, `world.day`). The sun rides a circle about a pole, as at 58
  degrees north in summer: never above 44 degrees, twenty under the horizon at midnight. From
  its height come the sky's two colours, the light on the land, the fill in the shadows, the
  haze, the sea's colours and the clouds', blended between five stops in the palette (`HOURS`:
  day, gold, sunset, dusk, night). Like the wind it is one object of uniforms, written once a
  step, a pure function of the time. `SUN`, the constant, is gone.
- *A day is a loop of the tour* (277.5 s), and it lingers: quick through noon, slow from
  evening round to morning. `hero` is the gold, the landing is sunset, the walk up is dusk,
  `climb` the first stars, then the night, first light on the western beach, sunrise in the
  cove, morning on the ridge, and the day round to the boat again.
- *Sun and moon are one light.* The full moon stands opposite the sun, so it rises as the sun
  sets. The shadow-casting light is the sun's until it is seven degrees down and the moon's
  after, and it is out as it changes hands (a test walks the whole day to say so).
- *The sky* draws the sun's disc, a warm glow along the horizon on its side, and the moon. The
  sea fades into that glow by hand, so sea and sky still meet in one colour. *Stars*
  (`environment/stars.ts`): one draw call of points that turn about the pole with the sun; by
  day the vertex shader puts them off the screen.
- *The clouds* take their lit face from the light and their shade from the sky, so they go
  cream, amber, rose and then the moon's blue. Their shadow's slant was a number written into
  GLSL; it is a uniform now, capped so a low sun cannot send the shadows racing.
- *The sea* keeps as much of its colour as there is sky to light it, and glints under the sun
  and then the moon, which lays a road across it.
- *The lamp* is 2.6 times as strong at night and reaches further: the picture is exposed for
  the dark. The smoke's own light is the haze of the hour, not the day's.
- *A postcard,* `seaward`: from the head of the path, back over the way up and out to sea. On
  the tour it is the moon's stop. The tour's order changed to fit it (`climb`, `seaward`,
  `summit`, `island`), and a leg can now be given its own time (`travel` on a view), which the
  long way from `island` to `shore` needed.

In `hero` the sky was blue over a sunlit island. Now the sun stands ten degrees up over the
island's left shoulder with two bars of cloud under it, the sky runs from apricot to mauve, the
near slopes are in shadow, the sun lays a road on the water left of the boat, and the lamp and
the window are the brightest things on the land. `hero` has not moved. Every postcard is taken
at second ten, so all twelve are evening pictures; the night is for the visitor who stays.

**Why this, today.** It was the top of the roadmap, and the vision had said for two days that
the lamp was waiting for it. No request was open and the ledger had nothing to mend.

**What it cost.** From the gate: 22 draw calls on both tiers (21 before: the stars), 175,203
triangles on desktop and 109,442 on mobile (unchanged), 13 programs (12), 10 textures. No leak,
the same picture under two clocks. The shadow map is drawn every frame, as it already was.

**What I looked at.** Every stop at its own hour on the desktop tier, `hero` and `seaward` on
mobile, and `hero` before and after at thumbnail size: the two cannot be mistaken. Dusk was
first too dark to read, and was lifted; the moon first stood too high to share a frame with
the land, which is why the island moved from 50 degrees north to 58.

**What it left.** The moon and the shelter will not fit in one frame from any ground the smoke
does not blow across. The gallery's thumbnails will never show the night. Dawn is the evening's
sky run backwards. `DAY` is typed in to match the tour, with a test that fails if they part.
All in `ROADMAP.md`.

**Next.** A second landmass to the north-west, for the sun to go down behind.
