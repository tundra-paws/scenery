---
title: The starlings
summary: Every evening a cloud of starlings comes in over the sea, wheels over the brae through the gold, and pours down into the head-dyke at sunset. At first light it rises out of the stones and goes.
kind: feature
model: claude-opus-5-5
---

**What changed.** The island has a second thing that comes and goes of its own accord. A
murmuration of starlings (2400 birds on desktop, 1200 on a phone) wheels over the summit's
western shoulder through the evening: one cloud that folds, stretches, breathes and darkens in
bands where the birds bunch, with every bird going round inside it, beating and gliding and
banking as it turns. In `hero` it lies broadside across the gold sky between the sun and the
cairn: a dark, ragged ribbon that was not there yesterday, at a glance.

It keeps to the hour, by the sun's height alone (`shared/starlings.ts`). The birds come in
after noon from over the sea toward the land beyond, a few at a time, and gather. As the sun
touches the sea the cloud draws itself in over the brae and pours down in a coiling stream
into the head-dyke, a bird to a chink, until none is left in the air. At first light they rise
out of the stones and stream away west over the water. By day and by night there is nothing.

- `features/starlings`: one instanced mesh, two instances a bird (its wings, a triangle faced
  both ways, mirrored for the right). Lit like the sheep and the rocks, in their `face` near
  black, so it links no new program, and the sea's reflection none either. Hidden while no bird
  is up. Kept out of a phone's reflection, as the sheep are.
- `shared/starlings.ts`: where every bird is at any second, DOM-free; a test holds them in
  the walls by night, away by day, every one in the `hero` frame at second ten, high over the
  land, and never into it but for the chink each goes into.
- A new postcard, `starlings`: low on the water under the brae, looking up at the cloud over
  the head-dyke it will roost in, the sun low on the left. The tour stops there between
  `flock` and `hero`; the day grew by eight seconds to 297.5 and kept second ten.
- Supporting: the high cloud thins more under the moon (`NIGHT_THINS` 0.45 to 0.75). From
  `seaward` the night sky and its picture in the sea were streaked all over; now the stars
  and the moon have it.

**Why this.** No requests are open, and the roadmap's two chapters (inside the shelter, the
night) do not show in `hero`, which is taken at second ten in the gold. The owner asked for
days that change the thumbnail plainly; the sky over the brae was the largest quiet space in
it, and the evening is when this kind of island is most alive. The story holds: the walls that
were built for the sheep are where the birds sleep.

**What it cost** (gate, `hero`): desktop 59 to 61 draws of 160, 601,136 to 620,336 triangles
of 800,000 (78%); mobile 53 to 54 draws of 100, 216,122 to 220,922 triangles of 300,000 (74%).
Live programs 31 of 40, unchanged.

**Next.** Inside the shelter, or the night. The starlings could be heard by nobody but
could be seen better: a phone gets half of them, and from `hero` each bird is under a pixel,
so the cloud reads by its mass, not its birds.
