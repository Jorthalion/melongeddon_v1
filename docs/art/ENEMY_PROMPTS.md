# ChatGPT image prompts: act three fruit

**Status:** prompts only. None of these fruit are in the game yet.

Three sprites: the Pit, the Gall and the Borrower. Start with the **Setup message**, then send one prompt per message in the same chat so the style stays consistent. To keep the look matched to the fruit already in the game, attach `public/sprites/melon.webp` and `pumpkin.webp` with the setup message.

When an image is right, download it as PNG and name it exactly as shown.

---

## Setup message (send first)

> I'm making enemy sprites for a tower defense game set in a gothic midnight library, where living fruit march down a red carpet. Match the two attached sprites exactly: **bold dark ink outlines, cel-painted comic style with painterly texture, saturated colour, a front-facing three-quarter view, short stubby legs, small glowing yellow eyes with an angry brow.** Every image: **transparent background (PNG with alpha), no floor, no shadow, no scenery, no text, no watermark, no border.** One creature, centered, filling about 85% of a square 1024 × 1024 canvas, with a silhouette that still reads when shrunk to 40 pixels. Reply "ready" and I'll send the first one.

---

### 1. `pit.png`: The Pit

A stone melon. Splash, fire and puddles barely touch it; only a direct shot works.

> **The Pit**: a melon that has turned to **stone**. Same round body and stubby legs as the attached watermelon, but the rind is **grey-brown weathered granite** with faint ghost-stripes where the green used to be, chipped edges, small cracks, a little moss in the seams. Through one cracked opening the inside is a **dark, dense stone core** with a few seeds fossilised in it, not red flesh. Small glowing yellow eyes deep in the crack, a heavy, patient scowl. It should look **too heavy to splash** — compact, low and solid, like a garden statue that decided to walk. Bold ink outlines, cel-painted, transparent background, no text.

### 2. `gall.png`: The Gall

A small thing riding a pumpkin and healing it. The game draws it **on its own**, a step behind the pumpkin it rides, so it must be a separate small creature, not a pumpkin.

> **The Gall**: a tiny **parasite gall creature**, about the size of a fist next to the attached pumpkin, drawn **alone** (no pumpkin in the image). A lumpy, **bulbous knot of pale green and sickly yellow plant tissue**, like an oak gall or a swollen bud, with a few **thin root-tendrils** trailing from its underside (where it grips the pumpkin) and **two tiny leaf-wing nubs**. A **soft green healing glow** pulses from small pores on its skin, with two or three little glowing green motes drifting off it. One small glowing yellow eye, smug and fragile. It should look **obviously weak — thin skin, easy to pop** — but obviously important. Bold ink outlines, cel-painted, transparent background, no text.

### 3. `borrower.png`: The Borrower

Fast and frail. It doesn't cost a stack: if it reaches the door it takes a cut of your seeds.

> **The Borrower**: a **lanky, sprinting pea pod** thief. A thin green pod body split open down the front, with **peas peeking out like a row of teeth**, long skinny legs mid-stride and **leaning hard forward** like it's running for the door. Over one shoulder it carries a **small cloth sack bulging with melon seeds**, a few seeds spilling out behind it, and it wears a **tiny overdue library slip** tucked into the sack's drawstring like a stolen ticket. Narrow glowing yellow eyes, a sly grin. It should read as **fast and frail** — thin limbs, light body, motion lines optional but no background. Bold ink outlines, cel-painted, transparent background, no text.

---

## The rooms' own fruit

Six more sprites, two for each of the three newest rooms, plus one carpet tile. They're in the game already with drawn stand-ins; each image below replaces one. Use the same **Setup message** and attach `corn.webp` and `pumpkin.webp` as well, since four of them are built on corn or a pumpkin. Save them with exactly these names (the game loads them as `.webp` from `public/sprites/`).

### 4. `enemy-express.png`: Express Corn (the Sorting Room)

Can't be slowed or stopped while it rides a belt, and the belt carries it at double speed.

> **Express Corn**: a corn cob in a hurry, the same shape and stubby legs as the attached corn, **leaning forward mid-stride**. Across its husk is a big **red rubber-stamp mark**: a tilted rectangle of smudged red ink with two thick bars inside it, like a postal stamp, **with no letters or words in it**. A torn **brown parcel label** tied on with string flaps behind it, and a couple of speed streaks trail off its back. Narrow glowing yellow eyes, a determined scowl. Bold ink outlines, cel-painted, transparent background, no text.

### 5. `enemy-parcel.png`: Parcel (the Sorting Room)

A pumpkin wrapped in brown paper: direct shots do half until splash or fire tears the paper off. When it pops, three corn walk out.

> **The Parcel**: a pumpkin the size of the attached one, **completely wrapped in creased brown paper** and tied with **white string in a cross with a bow on top**, like a parcel in the post. Only the **stubby legs** stick out underneath and the **green stem** pokes through a tear at the top. Through one small rip in the paper, two **glowing yellow eyes** glare out, and a little orange pumpkin skin shows. A wax seal or a blank brass tag on the string (**no writing**). Bold ink outlines, cel-painted, transparent background, no text.

### 6. `enemy-sprout.png`: Sprout (the Greenhouse)

Small. If it stands in the growth beds for two seconds it grows into a full melon.

> **The Sprout**: a **tiny baby watermelon**, about half the size of the attached melon, round and striped light and dark green, with a **single fresh green shoot and two little leaves** growing from the top like a sprouting seed. Clumps of **dark soil** still stuck to its feet and lower half. Big round glowing yellow eyes, small and eager, a cheeky grin. It should look **small and harmless, but clearly about to grow**. Bold ink outlines, cel-painted, transparent background, no text.

### 7. `enemy-squash.png`: Creeping Squash (the Greenhouse)

A pumpkin trailing vines: the carpet behind it turns into a bed that heals fruit for a few seconds.

> **The Creeping Squash**: a squat, warty **dark green and orange squash**, the size of the attached pumpkin, with **long curling green vines and tendrils trailing behind it** and spreading out low on either side, little leaves and **one or two small yellow squash flowers** on the vines. A few **glowing green motes** drift up from the vines. Heavy-lidded glowing yellow eyes, a slow, satisfied smirk. Bold ink outlines, cel-painted, transparent background, no text.

### 8. `enemy-chimer.png`: Chimer (the Bell Tower)

Frail, but every one still walking makes the clock strike sooner.

> **The Chimer**: a corn cob like the attached corn, with a **small polished brass hand bell tied to its top with red ribbon**, the bell **swinging mid-ring** with two or three little curved sound lines beside it. Its husk leaves flare out like a little cape. Wide glowing yellow eyes, an excited, mischievous grin, as if it's about to ring the bell on purpose. Bold ink outlines, cel-painted, transparent background, no text.

### 9. `enemy-gargoyle.png`: Gargoyle Gourd (the Bell Tower)

Stone skin between strikes; it wakes up and runs three times as fast while the towers are silent.

> **The Gargoyle Gourd**: a **squash carved from grey weathered stone**, the size of the attached pumpkin, ribbed like a pumpkin but **cracked and mossy**, with **two stubby stone bat wings** on its back and a little **gargoyle snout with tiny fangs**. Its stubby legs are clawed stone feet. Its eyes are **glowing pale blue-white**, and a **faint pale glow** seeps from the cracks, as if it's just waking up. Bold ink outlines, cel-painted, transparent background, no text.

### 10. `tile-vine.png`: a Creeping Squash vine on the carpet

A carpet tile, not a fruit: it lies **on top of the red carpet** for six seconds and heals fruit standing on it. Don't use the setup message's creature rules for this one.

> One square tile seen **straight from above**, 512 × 512, **transparent background**: a **tangle of green squash vines and leaves** spread across the square edge to edge, a couple of curling tendrils, **one small yellow flower**, with a few faint **glowing green motes** over it. Leave plenty of gaps between the vines so the red carpet underneath shows through. Painterly, bold ink outlines, no text, no border.
