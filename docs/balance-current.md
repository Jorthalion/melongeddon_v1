# Melongeddon balance report

1296 simulated runs (2 seeds per combination) in 478.9s. Overall win rate: **74%**.

Bots place towers where they cover the most carpet, pick upgrades at random, and build between and during waves. They are not smart players: treat these as relative numbers, not absolute difficulty.

**Strategies:** `melon` = only melon cannons. `mixed` = rotates melon, mortar, freeze, fire, still. `mixed+mods` = mixed, and buys back-room mods when they are cheaper than a new tower. `lean` = a cautious player: mixed, at most 2 new towers per wave, only between waves.

## Win rates

### Hero × difficulty

| | easy | normal | hard | all |
|---|---|---|---|---|
| **mynxi** | 96% | 81% | 70% | 82% |
| **michael** | 100% | 89% | 44% | 78% |
| **vael** | 94% | 60% | 33% | 63% |

### Strategy × difficulty

| | easy | normal | hard | all |
|---|---|---|---|---|
| **melon** | 94% | 61% | 52% | 69% |
| **mixed** | 100% | 95% | 56% | 84% |
| **mixed+mods** | 100% | 79% | 53% | 77% |
| **lean** | 94% | 71% | 36% | 67% |

### Map / knight choice × difficulty

| | easy | normal | hard | all |
|---|---|---|---|---|
| **stacks / accept** | 92% | 75% | 33% | 67% |
| **stacks / betray** | 100% | 79% | 54% | 78% |
| **stacks / reject** | 92% | 71% | 38% | 67% |
| **annex / accept** | 100% | 71% | 46% | 72% |
| **annex / betray** | 100% | 83% | 83% | 89% |
| **annex / reject** | 100% | 67% | 46% | 71% |
| **mezzanine / accept** | 92% | 71% | 33% | 65% |
| **mezzanine / betray** | 96% | 83% | 58% | 79% |
| **mezzanine / reject** | 96% | 71% | 50% | 72% |
| **rarebooks / accept** | 96% | 67% | 29% | 64% |
| **rarebooks / betray** | 100% | 88% | 50% | 79% |
| **rarebooks / reject** | 92% | 83% | 58% | 78% |
| **archive / accept** | 96% | 58% | 25% | 60% |
| **archive / betray** | 100% | 83% | 38% | 74% |
| **archive / reject** | 96% | 67% | 29% | 64% |
| **overflow / accept** | 100% | 83% | 67% | 83% |
| **overflow / betray** | 100% | 92% | 79% | 90% |
| **overflow / reject** | 96% | 88% | 67% | 83% |

### Towers on the board at the end (average)

| strategy | easy | normal | hard |
|---|---|---|---|
| melon | 39.7 | 35.8 | 30.7 |
| mixed | 39.1 | 38.6 | 27.2 |
| mixed+mods | 34.7 | 32.7 | 27.0 |
| lean | 25.0 | 22.1 | 16.1 |

## Where runs end

Wave each losing run died on (all difficulties).

| wave | losses |
|---|---|
| 1 | 0 |
| 2 | 6 |
| 3 | 18 |
| 4 | 19 |
| 5 | 30 |
| 6 | 87 |
| 7 | 7 |
| 8 | 11 |
| 9 | 11 |
| 10 | 2 |
| 11 | 32 |
| 12 | 19 |
| 13 | 35 |
| 14 | 26 |
| 15 | 32 |

## Leaks per wave (Normal difficulty)

Average stacks lost on each wave, counting only runs that reached it.

| wave | melon | mixed | mixed+mods | lean |
|---|---|---|---|---|
| 1 | 0.00 | 0.22 | 0.19 | 0.87 |
| 2 | 0.00 | 0.00 | 0.03 | 0.00 |
| 3 | 0.00 | 0.00 | 0.06 | 0.00 |
| 4 | 0.33 | 0.00 | 0.36 | 0.33 |
| 5 | 1.06 | 0.04 | 0.46 | 0.44 |
| 6 | 1.00 | 0.35 | 0.74 | 1.23 |
| 7 | 0.06 | 0.01 | 0.08 | 0.00 |
| 8 | 0.10 | 0.02 | 0.10 | 0.06 |
| 9 | 0.38 | 0.00 | 0.15 | 0.22 |
| 10 | 0.08 | 0.01 | 0.09 | 0.00 |
| 11 | 0.47 | 0.26 | 0.34 | 0.24 |
| 12 | 0.80 | 0.15 | 0.21 | 0.39 |
| 13 | 0.87 | 0.25 | 0.49 | 0.81 |
| 14 | 0.54 | 0.42 | 0.18 | 0.41 |
| 15 | 0.85 | 0.13 | 0.33 | 0.72 |

## Winning runs: how close was it?

Average stacks left at victory, as a share of starting stacks.

| hero | easy | normal | hard |
|---|---|---|---|
| mynxi | 91% | 90% | 78% |
| michael | 98% | 90% | 81% |
| vael | 97% | 82% | 62% |
