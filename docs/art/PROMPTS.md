# Image prompts for missing art

Every image here is optional: the game already draws a stand-in for each one. Send the finished files back and they'll be wired in.

**Paste this style line at the start of every prompt:**

> Painterly hand-painted game asset, dark gothic library fantasy, rich dark walnut wood, polished antique brass and gold trim, deep crimson cloth with gold embroidery, warm candlelight, soft rim light, crisp readable silhouette, highly detailed, no text, no watermark.

**Paintings move:** after adding or replacing a tower that doesn't turn to aim, or a fruit's sprite, add it to `GROUPS` in `scripts/animate-sprites.py` if it's new and run `npm run animate -- <name>` (needs Blender), so its idle sway, shot and build, or its walk, flinch and pop, match the new painting.

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

#### Honeyed Heel, the Legal Elf's (in the game: `sig-honey.webp`, `honey-print.webp`)

His third keeper tower and the second foot. Match the **Foot of the Law** art (`sig-stomp.webp`): the same bare, slightly veiny foot and the same emerald-green velvet cuff with the gold scales-of-justice emblem. Both are in the game; the code-drawn pot and footprint remain only as a fallback.

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

#### Quack-Liber, Quackarot's (done: `public/sprites/sig-quackliber.webp` and `fly-quack.webp`)

In the game; the code-drawn turret is only a fallback while it loads. Match **Quackarot's portrait** (`public/sprites/portrait-quack.webp`; attach it with the prompt): his **orange hoodie with black drawstrings** and the **black crowned-duck emblem** on the chest. It fires small rockets that burst and slow, from two barrels side by side. Like the other keeper towers, the sprite is one still image (the turret won't turn to aim), so point the barrels **up and slightly forward**, not off to one side. Leave the space above the barrels clear: rockets launch from there.

| File name | Prompt (after the style line) |
|---|---|
| `sig-quackliber.png` | A compact **twin-barrel rocket launcher turret** built on a squat **padded backpack-style base in Quackarot's colours**: **bright orange canvas** like a hoodie, with **black straps, black drawstring cords** and brass buckles, and a **black crowned-duck emblem** stitched on the front. On top, a small round **brass turret** holding **two short, stubby black rocket tubes side by side**, rims painted orange, angled up and slightly forward, with **two little orange-and-cream rockets** peeking out of the muzzles, each with a tiny duck-bill nose cone. A **rubber-duck figurine** in a tiny gold crown rides on the turret beside the tubes like a hood ornament, and a short **crimson pennant with gold trim** flies from a thin antenna at the back. The base sits on a small round **dark walnut platform with brass rivets**. Playful and a bit cocky, but well made. 3/4 top-down view, transparent background. |
| `fly-quack.png` (optional) | One of its rockets in flight: a **small orange-and-cream rocket with a little duck-bill nose cone**, two stubby black fins and an orange stripe, a short puff of flame and grey smoke behind it. **Side view, nose pointing right.** Transparent background, no shadow. |

#### Sir Michael's old pumpkin towers (retired: `sig-gourdgate.webp` and `sig-bombard.webp` no longer show; `fly-portcullis.webp` still does)

Kept for the record. He is the **Dragon Knight** now: see the next section for the art that replaces these.

Two big siege towers to sit beside his **Pumpkin Trebuchet**. **Attach `public/sprites/sig-trebuchet.webp`** with every prompt so they read as the same knight's kit: dark walnut, **crimson cloth with gold fleur-de-lis**, gold trim, **orange pumpkins**, candles at the base. Paste the style line above first, unchanged (his colours are the crimson in it). They cost 300 and 400, so make them look **bigger and grander than the trebuchet**, but keep the same round walnut base and 3/4 view so they sit on one tile.

| File name | Prompt (after the style line) |
|---|---|
| `sig-gourdgate.png` | **The Gourd Gate**, a small fortified **gatehouse carved out of a giant hollowed pumpkin**, standing on a round dark walnut base with a gold band and gold studs. The pumpkin's ribs are its stone-like walls, bound with **riveted gold iron bands**; its stalk is a little **crenellated turret** on top flying a **crimson pennant with a gold fleur-de-lis**. Its front is a gothic arched gateway with a heavy **iron-and-gold portcullis half raised**, the spikes along its bottom edge showing, and a coiled **chain on a brass winch** beside it. Two **arrow slits glowing warm orange** from inside, like jack-o'-lantern eyes. A crimson drape with gold embroidery and a pumpkin emblem hangs down the front of the base, with **two lit candles** at its foot, matching the attached trebuchet. Solid, defensive, a little whimsical. 3/4 top-down view, transparent background. |
| `fly-portcullis.png` | Just the **portcullis**: a square **iron grille with gold-capped spikes along the bottom edge**, two crossbars riveted in gold, a short length of chain at the top. **Seen from straight above**, flat, as if it has just slammed down across a carpet. Transparent background, no shadow. |
| `sig-bombard.png` | **The Harvest Bombard**, a colossal **bronze siege bombard cannon** whose barrel is **cast in the shape of a giant pumpkin's ribs**, mouth angled up toward the sky, a **huge orange pumpkin loaded in the muzzle** with its curly green stalk sticking out. The barrel rests on a heavy **carved walnut gun carriage with iron-rimmed wheels**, gold fleur-de-lis medallions on its sides, and a **lit slow-match fuse** smoking at the touch-hole. Beside it, a little pyramid of **three spare pumpkins** and a **crimson powder sack with a gold pumpkin emblem**. A crimson banner with gold trim flies from a tall pole at the back. All on a round dark walnut base with a gold band, gold studs and **two lit candles**, matching the attached trebuchet. It should look like the biggest gun in the library. 3/4 top-down view, transparent background. |
| `fly-bombard.png` | The Bombard's shot in flight: **a huge glowing orange pumpkin wrapped in flame**, a trail of fire and sparks behind it, a few green leaves torn loose. **Side view, flying to the right.** Transparent background, no shadow. |

#### Sir Michael the Dragon Knight (to do; code-drawn versions ship meanwhile)

Sir Michael is a **Dragon Knight** now: **deep azure-blue armour, gold trim, blue dragonfire**. His old crimson-and-pumpkin look is retired. His blue is a **deep royal azure with gold**, darker and warmer than Asser's pale blue-and-white, so the two never read as the same keeper. **Don't paste the crimson style line**; use this one instead:

> Painterly hand-painted game asset, dark gothic library fantasy, rich dark walnut wood, polished antique gold trim, deep royal azure-blue steel and cloth, glowing blue dragonfire, warm candlelight, soft rim light, crisp readable silhouette, highly detailed, no text, no watermark.

The game looks for these files in `public/sprites/` (as `.webp`). Until each exists, a code drawing shows. Tower sprites are **3/4 top-down on a round dark walnut base**, transparent background, like every other tower.

| File name | Prompt (after the line above) |
|---|---|
| `portrait-michael.png` (replaces the crimson one) | Bust portrait of **Sir Michael the Dragon Knight**: a young man with **dark, slightly messy hair** and a calm, confident look, in **ornate deep-blue plate armour with gold edging** and a **dragon's-head pauldron**, **blue flames curling up around his shoulders**. Square, the same framing and painted style as the other keeper portraits (attach one, e.g. `portrait-elf.webp`). |
| `sig-dragongate.png` | **The Dragon Gate**: a small fortified **grey-stone gatehouse** whose arch is carved as a **dragon's open jaws**, gold horns over the top, **blue banners** either side, a heavy **iron-and-gold portcullis half raised**, two arrow slits glowing **blue**. On the walnut base, two lit candles. Grand and defensive; bigger-looking than the trebuchet but on one tile. |
| `sig-roost-egg.png` | **The Dragon's Roost, egg**: a big **nest of dark twigs on a low stone**, holding one **glowing blue speckled dragon egg** with fine gold veins, a faint blue glow around it. |
| `sig-roost-whelp.png` | The same nest, the egg **cracked open**, a **small blue baby dragon** sitting up in it, head raised, a tiny wisp of blue flame at its mouth. Cute but fierce. |
| `sig-roost-drake.png` | The same nest, now holding a **young blue dragon** about twice the whelp's size, **wings folded**, gold horns, looking down the carpet, blue fire flickering in its jaws. |
| `sig-roost-dragon.png` | The **Great Dragon**: a **large royal-blue dragon with gold horns and belly scales**, **wings spread wide**, rearing over the nest, blue fire in its jaws and a blue glow around it. It should look like the biggest thing in the library while still sitting on one round base. |
| `fly-dragonfire.png` | The Roost's breath in flight: **a ball of blue-white dragonfire** with a short trail of flame and sparks. **Side view, flying to the right.** Transparent background, no shadow. |

The **Dragonfire Trebuchet** keeps the old `sig-trebuchet.webp` for now (crimson cloth, orange pumpkin). A blue-and-gold repaint is wanted: the same trebuchet with **blue cloth instead of crimson** and its pumpkin **wrapped in blue flame**.

#### Asser Mälkki, the Author-Knight (done: `public/sprites/portrait-asser.webp` and `sig-lionblade.webp`)

Two images, each in the style of what's already in the game. Send them in **separate chats**: the portrait and the tower are different styles.

**His colours are blue and white**, not crimson. No pumpkins, no orange, no crimson anywhere: those are Sir Michael's.

##### `portrait-asser.png`: his keeper card

**Attach three images:** his character sheet (`docs/art/asser-reference.jpg`) for his face and clothes, and two portraits already in the game for the style: `public/sprites/portrait-elf.webp` and `public/sprites/portrait-michael.webp`. **Don't paste the style line** above; this prompt carries its own.

> Make a character portrait in **exactly the same art style as the two attached portraits** (the green-haired elf and the pumpkin knight): polished semi-realistic **anime / manhwa illustration**, clean confident linework, soft cel shading with painterly texture, dramatic low warm light, rich dark tones. The character is **Asser Mälkki** from the attached character sheet; match his face and outfit to the sheet exactly.
>
> **Him:** a very tall, broad-shouldered Finnish man in his mid-thirties. **Rectangular dark-framed glasses**, **short dark-brown beard**, messy short dark-brown hair, and a **thin healed scar on the left side of his face** (his left, the viewer's right), from the temple down across the cheekbone. A calm, patient look with the faintest dry smile, eyes on the viewer, head tilted very slightly.
>
> **Outfit:** chainmail at the neck under a **royal-blue tabard with a white Nordic cross**, a thick **white fur collar** on a blue cape, fastened with a **round silver clasp engraved with a cross**, a steel pauldron edging into frame on one shoulder.
>
> **Framing:** head and shoulders, chest-up, face centred in the upper half, like the attached portraits. **Square, 1:1.**
>
> **Background:** like the elf's portrait: dark wooden library shelves of old leather books, softly out of focus, with **two or three lit candles** glowing warm gold on one side, and a faint cool blue rim light on his other side picking out the fur and the glasses.
>
> No text, no watermark, no border, no frame.

##### `sig-lionblade.png`: his tower

**Attach:** `public/sprites/sig-scales.webp` and `public/sprites/sig-quackliber.webp` (two keeper towers already in the game) for the style, plus his character sheet for the sword and the lion. **Paste the style line first**, but change "deep crimson cloth with gold embroidery" to **"royal blue and white cloth with gold embroidery"**.

> A game tower in **exactly the same style as the two attached tower images**: a single ornate standalone object, 3/4 top-down view (camera about 45° above), sitting on a **round dark walnut base with a gold band and gold studs**, crisp readable silhouette, transparent background.
>
> **The Lion Blade:** a great **longsword driven point-down into a weathered grey stone**, like a sword in the stone, standing upright on the walnut base. The sword matches the attached character sheet: a plain, practical steel blade with a fuller, a **cross-shaped crossguard trimmed in gold**, a **brown leather-wrapped grip** and a round pommel with a small cross. A faint **blue-white gleam** runs down the blade's edge.
>
> Draped over the stone and down the front of the base, a **royal-blue velvet banner with gold-embroidered edges and gold tassels**, showing a **white rampant lion**. A short **blue-and-white Nordic-cross pennant** is tied just below the crossguard, fluttering to one side.
>
> At the foot, like the books and candle at the foot of the scales: **a small stack of leather-bound books** (one blue, one brown), an **open manuscript page with a quill pen and an inkwell** (he's an author), and **one lit candle** in a brass holder.
>
> Dignified and steady, a little heroic. 3/4 top-down view, transparent background, no text, no letters, no watermark.

#### The Post and Instant Quackmission, Quackarot's third and fourth (done: `public/sprites/sig-pamphlet.webp` and `sig-driver.webp`; the file names keep the old ids)

Attach **Quackarot's portrait** (`portrait-quack.webp`) and the **Quack-Liber art** (`sig-quackliber.webp`) with each prompt so the colours match: **orange canvas hoodie fabric, black drawstrings and straps, the black crowned-duck emblem**, brass and dark walnut. Painterly like the other towers, **not** bold comic ink outlines.

| File name | Prompt (after the style line) |
|---|---|
| `sig-pamphlet.png` | A **stubby orange megaphone-shaped launcher** lying at a low angle on a **small round dark walnut base with brass rivets**, its wide mouth facing forward. The body is wrapped in **orange canvas with black drawstring cords** and a stitched **black crowned-duck emblem**. A **rolled-up paper pamphlet tied with string** sticks out of the mouth, ready to burst out. A **short twisted fuse** on top with a tiny glowing orange spark. Small brass fittings and a brass sight on the side. Playful and a bit absurd, but well made. 3/4 top-down view, transparent background, no text. |
| `sig-driver.png` | A **chunky hand-held tool**, an original design (not a copy of any film or TV prop): a fat **orange-and-black grip with black rubber bands** and a stitched **black crowned-duck emblem**, a short **brushed-steel shaft**, and a **glowing green-white crystal tip** with a soft halo, standing **upright in a little dark walnut stand** with brass clips on a **small round base**. A few faint green-white sparks around the tip, as if it just buzzed. Neat and clever-looking, a field strategist's gadget. 3/4 top-down view, transparent background, no text. |

#### Quackarot as an anime-hero duck (to do; code-drawn versions ship meanwhile)

He's a duck with **spiky, gravity-defying anime-hero hair** who posts first and plans later. Keep it an original design: puns and the general shape of a shouting, powering-up anime hero only, **no real anime characters, logos, symbols or costumes**. Attach his portrait (`portrait-quack.webp`) and the Quack-Liber art so the colours match: **orange hoodie, black drawstrings, black crowned-duck emblem**.

| File name | Prompt (after the style line) |
|---|---|
| `portrait-quack-golden.png` | The same duck as `portrait-quack.webp`, **powered up**: his spiky hair now **glowing gold and standing even taller**, eyes fierce, a **flickering golden aura** of flame-like light around his whole body, a few small sparks rising. Same framing and crop as the normal portrait. No text. |
| `fly-ki.png` | A **ki blast in flight**: a round, glowing **orange-gold energy ball**, white-hot at the centre, with a short **tapering trail** of orange light behind it. Side view, flying to the right. Transparent background, no text. |
| `sig-post.png` | The Post as a tower: a **tall wooden signpost** on a small round walnut base with brass rivets, holding up a big **blank speech-bubble sign** of cream card with a dark outline, a little **orange-and-black hoodie scarf** tied round the post, and a **stubby phone-shaped loudspeaker** clipped to the top. **No letters, no logos.** |

#### Anti-Geese Protocol, Quackarot's second (done: `public/sprites/sig-geese.webp`)

A one-use tower: when it goes off, every fruit near it is thrown back down the carpet and the tower is gone. Match the **Quack-Liber art** (`sig-quackliber.webp`; attach it with the prompt) and Quackarot's colours: **orange canvas, black straps, the black crowned-duck emblem**, brass and dark walnut. Painterly like the other towers, **not** bold comic ink outlines.

| File name | Prompt (after the style line) |
|---|---|
| `sig-geese.png` | A squat, **round stone watchtower** like a small chess rook, grey weathered blocks with brass bands, on a round dark walnut base with brass rivets. Wrapped around its middle, a **bright orange canvas banner with black straps and brass buckles**, the **black crowned-duck emblem** stitched on the front. On top, behind a crenellated rim, a big **brass siren horn** pointing up and a **brass targeting sight with a glowing orange crosshair** on a little post. A painted **warning sign** on a stake beside it shows a **goose silhouette in a red "no" circle** (a picture, no words). A few loose **white goose feathers** stuck in the stonework. It should look **armed and about to go off**: a red lever or big brass push-button on the side. Playful and a bit absurd, but well made. 3/4 top-down view, transparent background, no text. |

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

## 2. Floor tiles (done: in the game as `public/sprites/tile-floor-*.webp`)

Rare Books, the Archive and the Overflow (`tile-floor-overflow.webp`, in the game) have floors of their own. The two big maps have theirs too (`tile-floor-greathall.webp`, `tile-floor-readingroom.webp`). Each of these is a **seamless tileable texture** the game repeats under the whole board, so: straight top-down view, even lighting, no vignette, no single object in the middle, and **edges that tile**. 1024 × 1024, no transparency. Keep them fairly dark and low-contrast, so cannons and fruit stay readable on top.

| File name | Prompt (after the style line) |
|---|---|
| `tile-floor-overflow.png` | Dark wooden floorboards **soaked with shallow standing water**, thin puddles reflecting candlelight, a few floating paper scraps and leaves, subtle ripples. |
| `tile-floor-greathall.png` | A grand hall floor of **large dark marble flagstones** in deep red-brown and black, worn smooth, thin brass inlay lines between the stones, a faint warm sheen from distant chandeliers. |
| `tile-floor-readingroom.png` | **Dark herringbone parquet** of polished walnut, a few worn patches near where chairs would stand, faint scattered dust and one or two loose pages. Hushed and cosy. |

### 2a. The Courtyard (the Siege's map; done: `tile-floor-courtyard.webp`, `prop-hedge.webp`, `prop-statue.webp`, `prop-fountain.webp`)

The Siege's map is the library's back courtyard at night: flagstones, a hedge maze edge, statues and a dry fountain, with the library's carpet runner laid across it. All four are in the game; the code-drawn versions in `drawSiege.ts` stay as fallbacks while they load. The floor follows the rules above (seamless, top-down, dark, 1024 × 1024, no transparency); the three props are PNGs with transparent backgrounds, seen from slightly above like the other room furniture, and must fit their cells (one tile each; the fountain covers a 2 × 2 block). Moonlight, not candlelight, for these four: swap "warm candlelight" in the style line for "cold blue moonlight".

| File name | Prompt (after the style line) |
|---|---|
| `tile-floor-courtyard.png` | **Old grey courtyard flagstones** of uneven size in a loose running bond, worn smooth, dark mortar lines with **a little moss and a few weeds** between the stones, one or two fallen leaves, **cold blue moonlight**, damp sheen. Seamless, tileable, no single object in the middle. |
| `prop-hedge.png` | A **square block of clipped box hedge**, dense dark green leaves with lighter tips, trimmed flat on top, seen from slightly above, a soft shadow at its base, a few leaves catching moonlight. It must tile beside copies of itself along a wall, so keep the sides straight. Transparent background, 512 × 512. |
| `prop-statue.png` | A **small weathered stone statue on a square plinth**: a robed scholar reading an open book, lichen on the shoulders, a chipped nose, seen from slightly above. Grey stone, moonlit. Transparent background, 512 × 512. |
| `prop-fountain.png` | A **round dry stone fountain** seen from above at a slight angle: a wide basin with a carved rim, **dry inside with dead leaves and a few coins**, a central pedestal with a smaller upper bowl, cracks and moss, no water. It covers a 2 × 2 block of tiles, so fill a square frame. Transparent background, 1024 × 1024. |

### 2a2. The Rotunda (not yet painted; drawn by code in `drawDoors` until then)

The round reading room with doors on every side. The floor follows the rules above; the props are PNGs with transparent backgrounds, seen from slightly above, sized to their cells. Warm candlelight as usual. The game adds the lamp's glow when a door is next, so draw the lamp unlit.

| File name | Prompt (after the style line) |
|---|---|
| `tile-floor-rotunda.png` | **Warm honey-coloured parquet laid in a radial fan pattern**, as under a domed reading room, polished but scuffed, a faint brass inlay line now and then, warm light from above. Seamless, tileable, no single object in the middle. |
| `prop-rotunda-desk.png` | A **small round librarian's desk** seen from above at a slight angle: dark polished wood with a gold-leaf rim, an open ledger, an inkwell and a short candle on it, a brass bell. One tile; it sits on the carpet where the carpets meet. Transparent background, 512 × 512. |
| `prop-door-lamp.png` | A **small brass wall lamp on a short bracket** with a round frosted glass globe, unlit, seen from slightly above. Tiny on the board: keep the shape bold and simple. Transparent background, 256 × 256. |
| `prop-boarded-stairs.png` | A **doorway to narrow back stairs, boarded across with two rough planks** nailed in an X, a rolled-up red carpet runner leaning beside it, dust on the steps. One tile. Transparent background, 512 × 512. |
| `cat-room-rotunda.png` / `cat-room-rotunda-ruined.png` | The Grand Catalogue's room painting, wide (3:1): **a round domed reading room with doors on every side** and a desk in the middle where carpets meet. Restored: candlelit, polished, books in order. Ruined: dust sheets, doors hanging open, scattered returns, one carpet half rolled up. |

### 2b. The Overflow's returns chute (not yet drawn)


**Done:** the Overflow now shows a painted returns chute (`prop-returns-chute.webp`) beside the door, glowing blue on chute waves; the code-drawn "CHUTE" plate is only a fallback. The game adds the glow when the chute is active, so draw it unlit.

| File name | Prompt (after the style line) |
|---|---|
| `prop-chute.png` | A square **iron-and-brass book-returns chute hatch set into the floor**, seen from straight above at a slight angle, its hinged lid propped half open with darkness and a little water inside, a brass plate on the lid with a **downward arrow** (no readable text), rivets around the frame, a few wet returned books stacked beside it. Transparent background, 512 × 512. |

### 2c. Status effects (optional; drawn by code)

The game draws every status look in code (`src/game/drawStatus.ts`), and these would only replace two of them. Both are overlays laid over any fruit, so they must be centred, symmetrical and read at about 40 px. Transparent background, no fruit inside.

| File name | Prompt (after the style line) |
|---|---|
| `fx-ice-block.png` | A **translucent block of clear blue ice**, roughly cube-shaped with rounded edges, seen from the front at a slight angle from above, a bright white highlight along the top-left edge, **two small icicles** hanging from the bottom edge, faint frosted swirls inside, **empty and see-through in the middle** so a fruit can show through it. Transparent background, 512 × 512. |
| `fx-flame-tongues.png` | **Three small cartoon flame tongues** in a row, orange outside and yellow inside, leaning slightly as if in a breeze, flat at the bottom so they sit on top of something, a few sparks above. No smoke, no fuel. Transparent background, 512 × 256. |

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
