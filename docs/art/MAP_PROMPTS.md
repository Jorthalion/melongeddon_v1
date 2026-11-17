# Image prompts: the Sorting Room, the Greenhouse and the Bell Tower

These three maps already play with drawn stand-ins (plain library floor, bookshelves on the blocked tiles, code-drawn belts, beds, stairs and bell). Each image below replaces one stand-in. Send them back in any order and they'll be wired in. See [the design doc](../new-maps-design.md) for what each map does.

**In the game:** all 19 images.

**Paste this style line at the start of every prompt:**

> Painterly hand-painted game asset, dark gothic library fantasy, rich dark walnut wood, polished antique brass and gold trim, deep crimson cloth with gold embroidery, warm candlelight, soft rim light, crisp readable silhouette, highly detailed, no text, no watermark.

**Formats** (same as the existing art):

- **Floors:** seamless tileable texture, straight top-down, even lighting, no vignette, no single object in the middle, edges that tile. 1024 × 1024, no transparency. Fairly dark and low-contrast so fruit and cannons stay readable.
- **Props** (furniture on blocked tiles, doors): transparent background, square, at least 1024 px, object centered and filling about 85%, 3/4 top-down view. Shown at about 46 px, so a bold silhouette.
- **Carpet overlays** (belt, stairs, bed): straight top-down, square, 512 × 512, transparent background, **direction of travel pointing right** (the game rotates them). They lie on top of the carpet, so they should fill the tile edge to edge.
- **Catalogue paintings:** same size and framing as the existing `cat-room-*.webp` paintings, one restored and one ruined per room.

---

## 1. The Sorting Room (the library's post room)

Grey, industrial, after hours: return belts, mail sacks, wire sorting cages, strip lights.

| File name | Prompt (after the style line) |
|---|---|
| `tile-floor-sorting.png` | **Worn grey concrete floor** with faint painted yellow safety lines, scuffs, a few rubber skid marks and a stray rubber band, cool strip-light sheen. Seamless, tileable. |
| `prop-sorting-cage.png` | A **wire-mesh sorting cage on castors** stuffed with bundled returned books tied with string, a canvas mail sack slumped against it, a brass label holder on the front (no text). 3/4 top-down view, transparent background. |
| `prop-sorting-door.png` | A pair of **swinging double doors with round porthole windows**, dark wood with brass kick plates, a warm glow through the portholes, an old "RETURNS" style plate shown as a blank brass plate (no text). 3/4 top-down view, transparent background. |
| `tile-belt.png` | **One tile of a conveyor belt**, straight top-down: dark ribbed black rubber running left to right between two thin steel side rails with rivets, two or three faint worn amber chevrons on the rubber **pointing right**. Must tile seamlessly left to right. 512 × 512, transparent outside the belt. |

## 2. The Greenhouse (where the fruit come from)

Green glass light, iron frames, terracotta, misting sprinklers: damp and alive.

| File name | Prompt (after the style line) |
|---|---|
| `tile-floor-greenhouse.png` | **Damp terracotta tiles and mossy flagstones**, little puddles, scattered soil and a few fallen leaves, faint green light from above. Seamless, tileable. |
| `prop-greenhouse-planter.png` | A **long wooden potting bench / raised planter** full of dark soil and leafy seedlings, a small melon vine curling over the edge, a clay pot and a brass watering can beside it. 3/4 top-down view, transparent background. |
| `prop-greenhouse-door.png` | An **arched greenhouse door of white-painted iron and glass panes**, one pane fogged, a vine climbing the frame, warm light behind. 3/4 top-down view, transparent background. |
| `tile-bed.png` | **One tile of a sunken growth bed** seen straight from above: rich dark soil with a **thin glowing green rim**, rows of small bright green seedlings and one tiny melon sprout, a few water droplets. Fills the tile edge to edge. 512 × 512, transparent background. |

## 3. The Bell Tower

Cold stone, timber beams, a great bronze bell, moonlight through the louvres.

| File name | Prompt (after the style line) |
|---|---|
| `tile-floor-belltower.png` | **Old grey stone flags and rough timber planks**, pigeon feathers, a little straw, chalk tally marks, cold blue moonlight stripes from louvred windows. Seamless, tileable. |
| `prop-belltower-beam.png` | A **heavy oak support beam post** with iron straps and a coil of bell rope hanging from a hook, a stack of old hymn books at its foot. 3/4 top-down view, transparent background. |
| `prop-belltower-door.png` | A **low arched stone doorway with an iron-studded oak door**, a lantern hanging beside it, the top of a stone spiral stair visible inside. 3/4 top-down view, transparent background. |
| `prop-bell.png` | **A great bronze church bell hanging in a square oak frame**, seen 3/4 from above: thick timber cross-beam, iron bolts, the bell's lip catching gold candlelight, a thick rope dropping from it. **It fills a 2 × 2 tile block**, so square framing. Transparent background, 1024 × 1024. |
| `tile-stairs.png` | **One tile of stone stairs** seen straight from above: four or five worn stone treads **running left to right** (each tread a vertical band), the left edge in shadow and lower, the right edge higher and lit, a strip of the red carpet runner down the middle. The game tints them blue going up and orange coming down, so keep the stone neutral grey. 512 × 512, transparent background. |

## 4. Grand Catalogue paintings

Same style, size and framing as the existing room paintings. **Restored** = lit, tidy, working. **Ruined** = dark, dusty, broken, cobwebs, the same room before it was restored.

| File name | Prompt (after the style line) |
|---|---|
| `cat-room-sorting.png` | The library's **sorting room at night**: return conveyor belts winding between wire cages of bundled books, canvas mail sacks, hanging strip lights glowing, everything running. |
| `cat-room-sorting-ruined.png` | The same sorting room **broken down**: belts torn and stopped, cages tipped over, mail sacks spilled, one strip light hanging by a wire, dust and cobwebs. |
| `cat-room-greenhouse.png` | A **Victorian glasshouse on the library roof** at night: iron-framed glass panes, moonlight, rows of growth beds with glowing seedlings and fat melons and pumpkins ripening, misting sprinklers. |
| `cat-room-greenhouse-ruined.png` | The same glasshouse **overgrown and abandoned**: cracked panes, dead vines, dry beds, toppled pots, one sprinkler dripping. |
| `cat-room-belltower.png` | A **bell tower loft** at night: a great bronze bell in an oak frame, stone stairs spiralling up and down, moonlight through louvred windows, the clock mechanism ticking. |
| `cat-room-belltower-ruined.png` | The same loft **silent and broken**: the bell cracked and fallen in its frame, the clock gears stopped and rusted, pigeons, straw, cobwebs, a snapped rope. |
