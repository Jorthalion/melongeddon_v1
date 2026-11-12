# Image prompts for missing art

Every image here is optional: the game already draws a stand-in for each one. Send the finished files back and they'll be wired in.

**Paste this style line at the start of every prompt:**

> Painterly hand-painted game asset, dark gothic library fantasy, rich dark walnut wood, polished antique brass and gold trim, deep crimson cloth with gold embroidery, warm candlelight, soft rim light, crisp readable silhouette, highly detailed, no text, no watermark.

**Format:** PNG with a transparent background unless the prompt says otherwise. Square canvas, at least 1024 px, object centered and filling about 85% of the frame. Sprites are shrunk to about 60 px on screen, so a bold, simple silhouette beats fine detail.

---

## 1. Keeper signature towers (done: in the game as `public/sprites/sig-*.webp`)

These six are the only towers still drawn with simple code shapes. Match the existing towers (Still, Hive, Compost, Bell): a single standalone object, **3/4 top-down view** (camera about 45° above, looking slightly down), sitting on a small round base, transparent background.

| File name | Prompt (after the style line) |
|---|---|
| `sig-catalogue.png` | A tall antique library **card-catalogue cabinet** of small drawers with brass label plates and ring pulls, a long brass index rod mounted on top like a telescope or cannon barrel, a few paper index cards fanning out, crimson ribbon bookmark, on a round dark-wood base with brass rivets. 3/4 top-down view, transparent background. |
| `sig-cauldron.png` | A squat black iron **witch's cauldron on three clawed legs**, bubbling glowing green potion with rising bubbles and green steam, brass rim with small alchemical runes, a ladle resting inside, glass vials tied to the side with crimson cord. 3/4 top-down view, transparent background. |
| `sig-trebuchet.png` | A compact wooden **trebuchet siege engine** with brass fittings and iron bolts, a fat orange **pumpkin loaded in the sling**, crimson pennant with gold trim on top, coiled rope at the base, on a round wooden platform. 3/4 top-down view, transparent background. |
| `sig-scales.png` | Ornate golden **scales of justice** on a tall dark marble column, two brass pans on chains, a **glowing green gem** set in the column, crimson velvet drape with gold tassels, small stack of law books at the foot. 3/4 top-down view, transparent background. |
| `sig-mimic.png` | A **mimic treasure chest**, dark wood with brass bands, lid half open showing **rows of sharp teeth and a lolling pink tongue**, **one big glowing blue eye** peeking from the gap, a few gold coins spilling out, playful rather than scary. 3/4 top-down view, transparent background. |
| `sig-lectern.png` | A carved wooden **reading lectern** holding a **large open book with softly glowing pages**, golden dust motes floating up, a small brass candle holder and a quill in an inkwell, crimson ribbon bookmarks hanging down. 3/4 top-down view, transparent background. |

---

## 1b. Trick towers (new)

Same style as the signature towers: one standalone object, 3/4 top-down view, small round base, transparent background. The thrown objects are separate small sprites, seen **straight from above** so they can spin or turn in flight.

| File name | Prompt (after the style line) |
|---|---|
| `trick-boomerang.png` | A **bookend-throwing sling** on a round dark-wood base: a carved wooden arm with brass fittings, holding a curved **boomerang made from a wooden bookend** with gold inlay, crimson ribbon tied to the arm. 3/4 top-down view, transparent background. |
| `trick-orrery.png` | A small antique **brass orrery** (planetarium model) on a round dark-wood base: thin brass rings, a glowing gold sun in the middle, crimson velvet trim. Leave the planets off (the game draws them orbiting). 3/4 top-down view, transparent background. |
| `trick-plane.png` | A **paper-plane launcher**: a small wooden ramp with a brass spring catapult on a round base, a folded **paper plane made of an old book page** (faint printed text) sitting ready. 3/4 top-down view, transparent background. |
| `fly-boomerang.png` | A single curved **wooden bookend boomerang** with gold inlay, seen **straight from above**, centered, transparent background, 256 × 256. |
| `fly-plane.png` | A single **paper plane folded from an old book page**, seen **straight from above**, nose pointing **right**, transparent background, 256 × 256. |

## 2. Overflow floor tile

The Overflow uses the plain library floor. A wet floor would sell the flood.

| File name | Prompt (after the style line) |
|---|---|
| `tile-floor-overflow.png` | **Seamless tileable texture**, straight top-down view, dark wooden floorboards **soaked with shallow standing water**, thin puddles reflecting candlelight, a few floating paper scraps and leaves, subtle ripples. Even lighting, no vignette, edges must tile. 1024 × 1024, no transparency. |

---

## 3. Map art (only if you want painted maps back)

The setup and intro screens now draw each map from the real board, so these are cosmetic. The old paintings were replaced because their carpet routes didn't match play, and image generators don't follow a route described in words. **Attach the layout guide as an image reference** (an image-to-image, structure or "use this layout" option) and keep the red route exactly where it is.

Each guide in `docs/art/layouts/` is a 16 × 10 grid. Red is the carpet, IN is where fruit enter, DOOR is where they leave. **Output 1600 × 1000 (16:10), straight top-down view, no transparency.** The returned art will be checked against the board before it goes in.

**Shared prompt** (after the style line):

> Straight top-down view of a library floor, a **winding red damask carpet runner with thin gold edging** that follows the reference layout exactly (same turns, same width, same entry on the left and exit at the door), dark wooden floorboards, bookshelves, reading tables and candles placed only on the floor beside the carpet, never on it. Keep the carpet unobstructed. 16:10.

Then add the line for that map:

| Map | Layout guide | Extra line |
|---|---|---|
| The Stacks | `layouts/stacks.png` | Warm, cosy main hall; tall bookshelves in rows, a grand arched wooden door at the right end of the carpet. |
| The Annex | `layouts/annex.png` | Cramped side wing, low shelves and stacked crates, a round brass porthole door at the right end. |
| The Mezzanine | `layouts/mezzanine.png` | A balcony level: the top carpet runs along a brass railing, a short staircase on the right links the two levels, the carpet ends at a small door on the lower left. |
| Rare Books | `layouts/rarebooks.png` | Glass display cases of ancient books; the carpet spirals inward to a gilded door in the middle of the room. |
| The Archive | `layouts/archive.png` | Lights out: very dark, cold blue shadows, rows of metal filing cabinets, only faint candle glow; a lit doorway at the right end. |
| The Overflow | `layouts/overflow.png` | Flooded basement, shallow water over the floorboards, floating paper, pipes along the walls; the carpet ends at a metal **returns chute** hatch on the right. |
