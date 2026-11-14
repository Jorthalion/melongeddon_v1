# ChatGPT image prompts: Trick cannons

**Status:** all in the game (`public/sprites/trick-*.webp` and `fly-*.webp`) except **`fly-globe.png`** (prompt 10), which is still drawn in code.

Ten images: the five trick cannons, and the five things they throw. Each prompt below is complete, so paste one per message into ChatGPT. It works best if you start with the **Setup message**, then send the prompts one at a time in the same chat so the style stays consistent.

When an image is right, download it as PNG and name it exactly as shown. Send them back and they'll be wired in. Until then the game draws its own stand-ins.

---

## Setup message (send first)

> I'm making 2D game sprites for a tower defense game set in a gothic midnight library. Every image I ask for should be: a painterly, hand-painted game asset; rich dark walnut wood, polished antique brass and gold trim, deep crimson cloth with gold embroidery; warm candlelight with a soft rim light; a crisp, readable silhouette that still reads when shrunk to 60 pixels; highly detailed but not busy. **Transparent background (PNG with alpha), no floor, no scenery, no text, no watermark, no border.** One object, centered, filling about 85% of a square 1024 × 1024 canvas. Reply "ready" and I'll send the first one.

---

## The five cannons

These sit on the board, so they use the same angle as the existing towers: **3/4 top-down view** (camera about 45° above, looking slightly down), standing on a small round dark-wood base with brass rivets.

### 1. `trick-boomerang.png`: Boomerang Bookend (opens at keeper level 2)

> A bookend-throwing sling on a small round dark-wood base with brass rivets: a short carved wooden throwing arm on a brass pivot, holding a curved **boomerang made from a wooden library bookend** with gold inlay along its edge, a crimson ribbon tied to the arm. 3/4 top-down view, camera about 45° above. Painterly gothic-library style, dark walnut, antique brass, warm candlelight, rim light. Transparent background, single object centered, no text.

### 2. `trick-orrery.png`: Orrery (opens at level 3)

> A small antique **brass orrery** (clockwork planetarium) on a small round dark-wood base with brass rivets: thin interlocking brass rings and arms, a **glowing golden sun** sphere at the centre, crimson velvet trim around the base. **No planets on the arms** (the game draws its three planets orbiting the tower). 3/4 top-down view, camera about 45° above. Painterly gothic-library style, warm candlelight, rim light. Transparent background, single object centered, no text.

### 3. `trick-plane.png`: Paper Plane (opens at level 5)

> A **paper-plane launcher** on a small round dark-wood base with brass rivets: a short wooden ramp with a brass spring catapult, and a crisp **paper plane folded from an old yellowed book page** (faint printed text lines) sitting ready on the ramp, nose pointing forward. 3/4 top-down view, camera about 45° above. Painterly gothic-library style, warm candlelight, rim light. Transparent background, single object centered, no text.

### 4. `trick-quill.png`: Serpent Quill (opens at level 7)

> An enchanted **writing quill launcher** on a small round dark-wood base with brass rivets: a squat cut-glass **inkwell full of glowing deep-blue ink** in a brass collar, with a long cream **feather quill** standing in it at an angle, its inked nib catching the light. A faint **wavy ribbon of blue ink** curls up from the nib like a snake. 3/4 top-down view, camera about 45° above. Painterly gothic-library style, warm candlelight, rim light. Transparent background, single object centered, no text.

### 5. `trick-globe.png`: Rolling Globe (opens at level 9)

> A **library globe on a heavy catapult stand**, on a small round dark-wood base with brass rivets: an antique **terrestrial globe** (pale blue seas, muted green and ochre continents, faint latitude lines) cradled in a curved brass meridian ring, mounted on a short wooden throwing arm with a brass spring, ready to lob. 3/4 top-down view, camera about 45° above. Painterly gothic-library style, warm candlelight, rim light. Transparent background, single object centered, no text.

---

## The five things they throw

These fly around the board and spin or turn in flight, so they're seen **straight from above**, small and simple. Ask for **512 × 512**.

### 6. `fly-boomerang.png`

> A single curved **wooden bookend boomerang** with a gold inlay stripe along its edge, seen **straight from above** (flat top-down, no perspective), centered, simple bold shape. Painterly game-asset style, warm light. Transparent background, 512 × 512, no text.

### 7. `fly-planet-gold.png`, `fly-planet-blue.png`, `fly-planet-red.png`

> Three separate images, one per message: a single small **planet sphere** for a brass orrery, seen straight on, centered, with a thin brass ring band around it. One **gold** (warm sun-yellow), one **pale blue** (ice), one **rust red**. Painterly, softly shaded, glossy highlight top-left. Transparent background, 512 × 512, no text.

### 8. `fly-plane.png`

> A single **paper plane folded from an old yellowed book page** (faint printed text lines visible), seen **straight from above** (flat top-down), **nose pointing right**, centered. Painterly game-asset style, warm light. Transparent background, 512 × 512, no text.

### 9. `fly-quill.png`

> A single **cream feather quill** with a dark-blue inked nib, seen **straight from above** (flat top-down), lying horizontally with the **nib pointing right**, a few droplets of blue ink trailing off the nib. Painterly game-asset style, warm light. Transparent background, 512 × 512, no text.

### 10. `fly-globe.png`

> A single **antique terrestrial globe sphere** with no stand: pale blue seas, muted green and ochre continents, faint latitude and longitude lines, a thin brass band around its equator, seen straight on, centered, softly shaded with a highlight top-left. Painterly game-asset style. Transparent background, 512 × 512, no text.

---

## If ChatGPT gets it wrong

- **Background isn't transparent:** reply "Same image, but with a fully transparent background (PNG alpha), no floor or shadow."
- **Wrong angle on a cannon:** "Same object, but viewed 3/4 from above, camera about 45 degrees up, like an isometric game tower."
- **Too busy at small size:** "Simplify it: fewer small details, a bolder silhouette, stronger contrast between wood and brass."
- **It added text or a label:** "Remove all text, letters and numbers."
