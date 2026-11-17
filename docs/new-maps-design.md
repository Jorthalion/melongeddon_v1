# New maps: the Sorting Room, the Greenhouse and the Bell Tower

**Status:** playable with drawn stand-in art, for review. Art is listed in [art/MAP_PROMPTS.md](art/MAP_PROMPTS.md).

## Goal

Harder maps, and the first ones outside the library's reading rooms, each built around one new **floor** rule you can read on the carpet:

| Map | New rule | What it asks of you |
|---|---|---|
| The Sorting Room | **Belts** speed fruit up | Slow and stop the fruit before or on the belts; there's little time per fruit |
| The Greenhouse | **Growth beds** heal fruit | Kill before the beds, or keep fruit burning through them; fire is weaker here, so it's a trade |
| The Bell Tower | **Stairs** (slow up, fast down) and **the bell** (all towers stop) | Build heavy at the slow climb; leave margin for the moments when nothing fires |

## The floor system (shared)

A board can now list `floors`: straight runs of carpet tiles marked as `belt`, `up` or `down` stairs, or `bed`. The run's `from`/`to` order is the carpet's direction.

- **Speed:** a fruit's step is multiplied by the tile's pace. Walking the carpet's way: belt ×1.6, stairs up ×0.7, stairs down ×1.4. Walking **toward the entrance** (a chute walker, or a fruit pushed back by the Reverse Driver) takes the inverse: a belt holds it back to ×0.625.
- **Slows still work as before:** pace multiplies speed, so a frozen fruit on a belt stays frozen, and a chilled one is chilled on top of the belt.
- **Beds** heal 5% of max health per second, **not while burning**. They don't change pace.
- **Readable:** every floor tile is drawn on the carpet.
  - Belts: dark rubber with amber chevrons that scroll the carpet's way.
  - Stairs: treads with an arrow, blue going up (slow), orange coming down (fast).
  - Beds: soil with swaying shoots and a soft green pulse; healing fruit puff green sparks.
- **Everything else is unchanged:** Pamphlet straights, the Copycat, wet carpet and the Driver all work as before.

## The maps

**Update:** all three are now big boards (22 × 14, like the Great Hall) with carpets of 42, 50 and 51 tiles, and their fruit health was re-tuned with the simulator to Sorting Room 0.8, Greenhouse 0.95 and Bell Tower 1.05, then lowered to 0.85 and 0.95 once each room got its own fruit, and the Bell Tower to 0.9 when its carpet got its diagonals. The layouts and numbers below describe the first, 16 × 10 version.

### The Sorting Room

- **Carpet:** 24 tiles, five straights. Half of it is belt (three belts of 4 tiles), so a fruit crosses it in the time of about 19.5 plain tiles. That's the shortest effective carpet in the game; the Stacks is 23.
- **Health:** normal (no `hp` bonus). The speed is the difficulty.
- **Room:** grey concrete, strip light, a mustard runner. Sorting cages stand on the blocked tiles.

### The Greenhouse

- **Carpet:** 30 tiles. Three 2-tile beds: one on the first long straight, one on the bottom run, and one just before the door.
- **Damp:** burning does 45% less, the same as the Overflow. Fire is the counter to the beds (burning fruit don't heal) but weaker here, which is the intended tension.
- **Health:** fruit have 10% more.
- **Room:** green glass light and a terracotta path. Planters stand on the blocked tiles.

### The Bell Tower

- **Carpet:** 31 tiles. Up 7 stair tiles on the left, round the loft past the bell, then down 7 stair tiles on the right to the door.
- **The bell (2 × 2, in the middle):**
  - It strikes **24 s into every wave, then every 24 s**. The clock restarts each wave, so it's predictable.
  - "Strikes in 3, 2, 1" shows under it, then BONG, a screen ring and a shake.
  - **For 2.5 s no tower acts**, the Orrery and Pamphlet included. Shots already in flight still land, and slows already on fruit keep ticking.
- **Health:** fruit have 10% more.
- **Ledges:** many blocked tiles (beams and walls), so there are fewer good spots.

## Unlocks

Three new **Grand Catalogue rooms**, each opening its map:

| Room | Cost |
|---|---|
| The Sorting Room | 14 |
| The Greenhouse | 18 |
| The Bell Tower | 24 |

This takes the Catalogue from 8 to 11 rooms and from 96 to 152 fragments in total: about 15–18 more nights of play by the README's estimate.

**For review:** costs are a first guess. They could instead be one wing that unlocks together, or come with a reward each (a bookmark, a cosmetic).

## Balance (simulator)

Midnight win rates across all 8 keepers and 4 bot strategies, 2 seeds per cell (64 runs per cell). Rough numbers:

| Map | Story | Normal | Melongeddon | Overdue | All |
|---|---|---|---|---|---|
| The Stacks | 84% | 64% | 38% | 8% | 48% |
| Rare Books | 92% | 70% | 33% | 19% | 54% |
| The Archive | 80% | 56% | 9% | 13% | 39% |
| **The Sorting Room** | 86% | 47% | 13% | 0% | **36%** |
| **The Greenhouse** | 72% | 50% | 23% | 2% | **37%** |
| **The Bell Tower** | 77% | 58% | 6% | 6% | **37%** |

All three sit just below the Archive, the hardest existing map in the sim, so they read as "harder maps" without being walls on Story. The bots don't plan around the new rules (they don't stack slows at belts or fire at beds), so a real player should do better than this.

**Tuning knobs** (all in `FLOOR` and the boards in `rules.ts`):

| Knob | Now |
|---|---|
| `belt` | 1.6 |
| `up` / `down` | 0.7 / 1.4 |
| `bedHeal` | 0.05 |
| `bellEvery` / `bellQuiet` / `bellWarn` | 24 / 2.5 / 3 |
| `hp` per board | 1, 1.1, 1.1 |
| Floor runs | their length and placement |

## Open questions for review

1. **Overdue on the Sorting Room is 0% for the bots.** That's fine if Overdue is meant to be brutal; otherwise drop `belt` to 1.5.
2. **The bell stops *towers*.** The alternative is that it stuns *fruit*, which would make it a gift rather than a hazard. I went with the hazard because these are meant to be hard maps.
3. **Should the Greenhouse heal bosses (Karl) at the full 5%?** It does now, which makes Karl scary in the last bed.
4. **The "win every map" achievement** now includes the three new maps. Players who already earned it keep it.
5. **Phase two ideas (not built):**
   - A switch track in the Sorting Room that flips the route every few waves.
   - Fruit gaining a rind in the Greenhouse beds.
   - The rotating floor (Observatory), and the flooding tiles (Flooded Basement).

## Art needed

19 images, listed with ready-to-paste prompts in [art/MAP_PROMPTS.md](art/MAP_PROMPTS.md):

| Kind | Images |
|---|---|
| Carpet overlays | `tile-belt`, `tile-stairs`, `tile-bed` |
| The bell | `prop-bell` |
| Floors | `tile-floor-sorting`, `-greenhouse`, `-belltower` |
| Furniture and doors | `prop-sorting-cage`, `prop-sorting-door`, `prop-greenhouse-planter`, `prop-greenhouse-door`, `prop-belltower-beam`, `prop-belltower-door` |
| Catalogue paintings (restored and ruined) | `cat-room-sorting`, `cat-room-greenhouse`, `cat-room-belltower`, plus a `-ruined` version of each |

The first four matter most: they carry the new rules.

## Code map

| File | What's there |
|---|---|
| `rules.ts` | `FloorKind`, `FloorRun`, `FLOOR`, `floorTiles`, `floorPace`; board fields `floors`, `damp`, `bell`; the three boards |
| `engine.ts` | `world.floors`, `world.bell`, `floorAt`, `tickBell`, the pace in both movement steps, bed healing, the quiet tower loop, and the bell reset at wave start |
| `draw.ts` | `drawFloors`, `drawBell`, and `ROOM_LOOK` for the three rooms |
| `catalogue.ts` / `meta.ts` | The three rooms, `MAP_GOALS`, `PICKABLE_MAPS` |
| `RoomScreen.tsx` | Intro lines |
| `scripts/sim.ts` | The three maps added to the full sim |
| `tests/floors.test.ts` | 9 tests: tiles on the carpet, pace values, belt and stair speed in play, bed healing and burning, damp burn, bell timing and the quiet towers, unlocks |
