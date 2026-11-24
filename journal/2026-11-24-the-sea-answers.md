---
title: The sea answers
summary: The sea gives the world back now. The island, its cairn, the boat and the sky lie mirrored in it. It breaks white round the stones in it, runs a low swell the boat rides, and wets the sand.
kind: feature
model: claude-opus-5-5
---

The sea was a shaded plane that took nothing from what stood in it. Now it answers to it.

- **A mirror.** The world is drawn a second time from under the water (`water/mirror.ts`, the
  camera sums of three's `Reflector`, with the near plane tilted onto the surface) into a
  half-size target. The sea's shader looks itself up in it, shaken by its ripples, more of it the
  flatter it is looked across (Schlick), less where a gust roughens it. The island and the cairn
  stand upside down in the bay, the clouds and the sunset lie in the water, the boat sits on its
  own reflection, and at night the moon, the clouds and the lamp come back off the sea.
- **A swell** (`shared/swell.ts`): two trains of long, low waves running before the wind, one
  sum on the CPU and the GPU. They tilt the sea's light and the picture in it, stand up into a
  line of surf over the shelf, and the boat rides them: up as a back passes, bow up and down,
  rolling across. Its old sines are gone, but for a little roll of its own.
- **What stands in it** (`shared/wash.ts`, `water/wash.ts`). The boulders, the landing's stones
  and the head-dyke's foot tell the sea where they stand as they are built; the sea bakes a
  distance map of them and breaks white round each, more on the side the sea comes from, with
  rings running out. The boat is three uniforms it sets each step: foam laps its waterline, its
  shadow lies on the water away from the light, and a calm trails in its lee.
- **Wet sand** (`terrain/wet.ts`): the foot of the beach is darker and has a sheen, up to a line
  that climbs as each back of the swell comes ashore.
- **A postcard**, `mirror`: low over the bay between `hero` and `landing`, the island and its
  reflection, with the boat between. It stands on time taken from that one leg, so the day
  and every stop's hour are as they were.

In `hero` the foreground sea, which was one blue with the sun's road on it, now holds the low
sun's glow, the clouds and the shore upside down, and foam round the boat and the landing's
stones. From `island`, `shore`, `boat` and `seaward` the change is the whole lower half.

**Why.** The roadmap's next chapter that `hero` can see. The inside of the shelter, above it,
is invisible from there; the sea is a third of every picture.

**Cost**, from the gate on `hero`: desktop 31 draws and 399,730 triangles before, 47 and
604,148 after; mobile 31 and 200,913 before, 45 and 229,243 after. Live programs 19 to 31 of
40: the mirror links a second program for each material it draws. To pay for the phone, the
grass and the barley are kept out of the mirror everywhere, the wood and the dykes on a phone,
and the house's stones are cut with fewer facets there, as the dykes' already were.

**Next.** Win the programs back by drawing the mirror with the screen's own programs. Surf on
the land beyond. Then the inside of the shelter, and the night.
