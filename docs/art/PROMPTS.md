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

### 1a. Second keeper towers

#### Foot of the Law, the Legal Elf's (done: `public/sprites/sig-stomp.webp` and `fly-stomp.webp`)

Both images are in the game. The prompts below describe the art as delivered, so a redo or a variant matches it. The code-drawn shoe in `drawFootShape` is only a fallback while the images load.

| File name | Prompt (after the style line) |
|---|---|
| `sig-stomp.png` | A **giant bare human foot**, realistic and slightly veiny, standing toes-forward on top of a **round carved walnut pedestal** like a courtroom monument. Around the ankle, a flared **emerald-green velvet cuff** embroidered in gold with a **scales-of-justice emblem** and gold scrollwork, tied with a **braided crimson cord** ending in two **gold tassels**. The pedestal has a gold band, a blank **brass nameplate** framed by gold laurel sprigs, and brass studs around its wooden base. At its foot: a small stack of law books (green and red leather, one with a gold scales emblem), a **wooden gavel**, and a **crimson velvet drape with gold embroidered edging** spilling over the base. Comic and absurd, but dignified. 3/4 top-down view, transparent background. |
| `fly-stomp.png` | The same **giant bare foot** with the **emerald-green velvet cuff** (gold scales emblem and scrollwork) and the **braided crimson cord with two gold tassels**, seen **from the side, mid-stamp, toes pointing right**, the sole slamming down onto **wooden floorboards that splinter and crack** under it. **Puffs of pale dust** burst out on both sides, **wood splinters fly** up and away, and a few **curved gold motion streaks** above the toes show the speed. Only the foot and the bottom of the cuff, cut off cleanly at the top. Transparent background, no cast shadow (the game draws its own). |

#### Honeyed Heel, the Legal Elf's (not yet drawn)

His third keeper tower and the second foot. Match the **Foot of the Law** art (`sig-stomp.webp`): the same bare, slightly veiny foot and the same emerald-green velvet cuff with the gold scales-of-justice emblem. Until these arrive, the game draws a honey pot with a foot in code, and an amber footprint on the carpet.

| File name | Prompt (after the style line) |
|---|---|
| `sig-honey.png` | A **giant bare human foot**, realistic and slightly veiny, wearing a flared **emerald-green velvet cuff** embroidered in gold with a **scales-of-justice emblem**, its heel dipped into a big round **earthenware honey pot** with a carved wooden honey dipper resting on the rim. **Thick golden honey drips** off the heel and toes and runs down the side of the pot. The pot sits on a small round **walnut pedestal** with a brass band, a couple of fat bees buzzing near the toes, a little honeycomb on the pedestal. Comic and absurd, but dignified, like a courtroom monument. 3/4 top-down view, transparent background. |
| `honey-print.png` | A single **bare-foot footprint made of glossy golden honey**, seen from **directly above**, toes pointing **right**: a rounded heel, the arch narrower, five toe prints, thick sticky drips and a few tiny bubbles, a warm highlight on the honey. Only the footprint, lying flat. Transparent background, no shadow, 512 × 512. |

#### Unstoppered, Vaelithra's (done: `public/sprites/sig-flask.webp` and `spill-flask.webp`)

Both in the game; the code-drawn flask and puddle are only fallbacks while they load. The first is the tower on its own tile; the second is laid on each extra tile it spills onto, so it must read as **flat on the floor** and tile neatly beside the first.

| File name | Prompt (after the style line) |
|---|---|
| `sig-flask.png` | A large **round-bottomed alchemist's glass flask lying tipped over on its side**, its **cork stopper popped out** and lying beside it, glowing **emerald-green potion** pouring from the long neck into a spreading puddle on a small patch of dark wood floor. Brass collar on the neck, a crimson cord and a small parchment label tied around it (no readable text), faint green vapour curling up, a couple of bubbles in the glass. Elegant potion-maker's glassware, a little mischievous. 3/4 top-down view, transparent background. |
| `spill-flask.png` | A **flat puddle of glowing emerald-green potion** seen from above at the same 3/4 angle, irregular rounded edges, a few small **broken glass shards** and bubbles in it, a soft green glow on its surface. Only the puddle, lying flat, filling most of a square tile. No flask, no wood, no shadow. Transparent background. |

#### The Mimic, Ooze Clues' (done: `public/sprites/sig-copycat.webp`)

One image, for when The Mimic is **blank** (nothing beside it). Once it copies a cannon, the game draws that cannon in its place with a small blue eye badge, so this image only needs to say "a shapeshifter waiting for something to copy". The code-drawn chest with one eye is only a fallback while it loads.

| File name | Prompt (after the style line) |
|---|---|
| `sig-copycat.png` | A small **ornate brass-and-walnut pedestal holding a blob of glossy, shimmering liquid silver**, like quicksilver caught mid-shape, half-formed into the **rough outline of a cannon barrel** that hasn't decided what it is yet. **One big round glowing pale-blue eye** blinks out of the silver, curious and a bit mischievous. Faint reflections of brass and candlelight ripple across its surface; a few silver droplets hover just above it. Playful rather than scary. 3/4 top-down view, transparent background. |

#### Reserve Desk, Mynxi's (done: `public/sprites/sig-desk.webp`)

In the game. The code-drawn desk is only a fallback while it loads. The amount banked is drawn by the game on a gold tag above the desk, so leave the space above it clear and put **no numbers or text** on the art.

| File name | Prompt (after the style line) |
|---|---|
| `sig-desk.png` | A small antique **library reserve desk** of dark carved walnut with brass corner fittings, on short turned legs. On top: an open **ledger book** with ruled pages and a crimson ribbon bookmark, a **brass cash box** with its lid slightly open and a few gold coins showing, a small brass **"reserved" bell**, and a brass **desk lamp** with a green glass shade casting a warm glow. A short stack of books tied with string, each with a paper **reserve slip** sticking out, sits at one end. A tidy, careful librarian's desk, slightly cosy. 3/4 top-down view, transparent background, no readable text or numbers anywhere. |

---|---|
| `sig-stomp.png` | A **giant disembodied foot in a buckled brown leather shoe with a long, slightly curled elfin toe** and an emerald-green stocking, rising out of a carved dark-wood **judge's gavel block** like a statue on a plinth. The heel is lifted, as if about to stamp down. A brass plaque on the block, a crimson velvet cord tied around the ankle with gold tassels, a small stack of law books beside it. Comic and a little absurd, but dignified, like a courtroom monument. 3/4 top-down view, transparent background. |
| `fly-stomp.png` | The same **giant buckled brown shoe with an emerald-green stocking**, seen **from the side, sole facing down, mid-stamp**, toe pointing right. A few motion lines above it and a puff of dust and a crack of wood at the sole. Only the shoe and the bottom of the stocking, cut off cleanly at the top. Transparent background, no shadow under it (the game draws its own). |


---

## 1c. Heavy cannons (done: `public/sprites/heavy-press.webp`, `heavy-organ.webp`, `heavy-scope.webp` and `fly-sheet.webp`)

The three expensive cannons on the Heavy tab (`Y`), all in the game. The code-drawn versions are only fallbacks while the images load. Same rules as the other towers: paste the style line first; a single standalone object on a small round base, **3/4 top-down view**, transparent background. They cost three times a melon cannon, so make them look **grand**: bigger, more brass, more carving, but still a bold silhouette that reads at about 60 px.

| File name | Prompt (after the style line) |
|---|---|
| `heavy-press.png` | An ornate antique **iron-and-brass printing press**: two carved iron columns, a heavy platen, and a **big brass screw with a spoked wheel** on top. A **freshly printed sheet** with rows of dark ink lines is half-pulled from the bed, a tray of lead type and an ink roller beside it, a crimson cloth with gold embroidery over the base. Industrious and heavy, with a faint gleam of wet ink. 3/4 top-down view, transparent background, no readable text. |
| `heavy-organ.png` | A compact gothic **pipe organ** on a carved dark-walnut case: a fan of **polished brass pipes**, tallest in the middle, gothic arches and gold filigree on the case, a small keyboard with ivory keys, a red velvet bench cushion, and a couple of lit candles in brass holders. A few **faint golden musical notes** drift up from the pipes. 3/4 top-down view, transparent background. |
| `heavy-scope.png` | A long **brass astronomer's telescope** on a sturdy carved wooden **tripod**, the tube banded with gold rings and engraved stars, a big glinting front lens with a faint blue sheen, a small brass sighting scope on top and a crimson leather eyepiece cap hanging on a cord. Precise, expensive and a little menacing, pointed off to the side. 3/4 top-down view, transparent background. |
| `fly-sheet.png` | A single **sheet of cream paper freshly off a printing press**, slightly curled at one corner, with rows of **dark wet ink lines** (no readable letters) and a small ink smudge, seen **from directly above**, lying flat. Transparent background, no shadow. |

## 1b. Trick cannons

Moved to [TRICK_PROMPTS.md](TRICK_PROMPTS.md): ready-to-paste ChatGPT prompts for all five trick cannons (Boomerang Bookend, Orrery, Paper Plane, Serpent Quill, Rolling Globe) and the things they throw.

## 2. Floor tiles (not yet drawn)

Rare Books and the Archive have floors of their own. The Overflow and the two big maps still use the plain library floor. Each of these is a **seamless tileable texture** the game repeats under the whole board, so: straight top-down view, even lighting, no vignette, no single object in the middle, and **edges that tile**. 1024 × 1024, no transparency. Keep them fairly dark and low-contrast, so cannons and fruit stay readable on top.

| File name | Prompt (after the style line) |
|---|---|
| `tile-floor-overflow.png` | Dark wooden floorboards **soaked with shallow standing water**, thin puddles reflecting candlelight, a few floating paper scraps and leaves, subtle ripples. |
| `tile-floor-greathall.png` | A grand hall floor of **large dark marble flagstones** in deep red-brown and black, worn smooth, thin brass inlay lines between the stones, a faint warm sheen from distant chandeliers. |
| `tile-floor-readingroom.png` | **Dark herringbone parquet** of polished walnut, a few worn patches near where chairs would stand, faint scattered dust and one or two loose pages. Hushed and cosy. |

### 2b. The Overflow's returns chute (not yet drawn)

The Overflow marks the end of its carpet, where fruit come back up the chute, with a small code-drawn "CHUTE" plate. A painted hatch would look better there. The game adds the glow when the chute is active, so draw it unlit.

| File name | Prompt (after the style line) |
|---|---|
| `prop-chute.png` | A square **iron-and-brass book-returns chute hatch set into the floor**, seen from straight above at a slight angle, its hinged lid propped half open with darkness and a little water inside, a brass plate on the lid with a **downward arrow** (no readable text), rivets around the frame, a few wet returned books stacked beside it. Transparent background, 512 × 512. |

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
