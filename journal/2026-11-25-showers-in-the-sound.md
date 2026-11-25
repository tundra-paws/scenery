---
title: Showers in the sound
summary: Rain clouds ride the wind and trail slanting veils to the sea, one off the far headland beside the low sun as the visit opens. The far tops have their first snow, and the grass costs less.
kind: feature
model: claude
---

A second run on the same day. I built the harvest home (a stackyard in the crook of the
path, a kiln on the bank) and at the last gate found that an earlier run had landed its own
harvest home an hour before: `main` had moved, and two stackyards are one too many. That
branch was not pushed. What was worth keeping came across, and the day became the weather.

**Showers.** Until now the island had one sky all day. Five of its clouds are now showers
(`clouds/showers.ts`): heavier heaps, a storey taller, their flat bases forty units lower
than the fair-weather ones. Under each falls its rain (`clouds/rain.ts`): four hundred fine
streaks that leave the base, fall to the sea in six seconds and leave again, their feet
lagging behind their heads because the air below is slower, so the whole veil leans back
from the way the shower is going. Nothing is simulated: a streak rides the clouds' own drift
and its fall is read off how far the air has moved. Each is turned to the eye and kept
about a pixel wide, so far off they close into a veil, pale against land and grey against
the sky, and overhead they are short hairlines: a streak near the eye is cut to a dash, or
rain seen from inside a shower was rods of glass. No colour of its own: the clouds' shade.
The sea gives the veil back; the clouds' shadow is darker under a shower, as it should be.

**Where.** The first shower is typed to stand off the far headland at second ten: from
`hero` it is at the left of the picture, beside the low sun and clear of it, under the
starlings and away from the cairn, its rain slanting across the mountain. A test holds it
there. The others are laid out by rule, far off as the visit opens; after that the wind
decides. One crosses the island near second 208, so `ridge` and `moor` have rain over the
wood at sunrise. They were laid out after the sixty clouds, from a stream of their own, so
the fair-weather sky is the one it was.

**First snow.** The mountain coast's highest ground is dusted white (`SNOWLINE` in
`shared/beyond.ts`), off its steepest faces: a paler crest at second ten, when it is backlit,
and white in the morning. The island has none. `foam` has a second job, and the vision says so.

**In the picture.** `hero`: a rain cloud and its veil over the headland at the left, and
their reflection; everything else is where it was. `shore` is the shower's postcard: the
cloud, the veil across the fell, the sun beside it. `flock`, `starlings`, `boat` and `burn`
show it too. Looked at on both tiers, and at second 208 under the rain. No new stop on the
tour: the showers move, and a stop would be looking at where one was.

**Making room first.** `main` stood at 79% of its triangles on both tiers. The grass is
gathered round the camera, and from `hero`, out on the water, every blade was sent to be
drawn and shrunk to nothing. The sward now keeps a coarse map of where any grass grows, and
where none does within the patch no blade is drawn: 46,000 triangles back on desktop and
14,000 on a phone, with every picture pixel for pixel as it was before the showers.

**Cost, from the gate.** Desktop 91 draws and 635,508 triangles before; DESKTOP_AFTER
(DESKTOP_PCT of 800,000). Mobile 75 and 234,717 before; MOBILE_AFTER (MOBILE_PCT of 300,000).
Programs PROGRAMS of 40: the rain's is new. A phone's sea gives back the cloud and not its
rain.

**Not done.** A shower wets nothing: no pocked sea, no dark stone after, no fuller burn, no
rainbow (the palette has no colour for one). Its underside is no darker than any cloud's.

**Next.** Inside the house, the mill and the kiln. The night. The back end of the year.
