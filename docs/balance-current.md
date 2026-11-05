# Melongeddon balance report

972 simulated runs (3 seeds per combination) in 108.2s. Overall win rate: **71%**.

Bots place towers where they cover the most carpet, pick upgrades at random, and build between and during waves. They are not smart players: treat these as relative numbers, not absolute difficulty.

**Strategies:** `melon` = only melon cannons. `mixed` = rotates melon, mortar, freeze, fire, still. `mixed+mods` = mixed, and buys back-room mods when they are cheaper than a new tower. `lean` = a cautious player: mixed, at most 2 new towers per wave, only between waves.

## Win rates

### Hero × difficulty

| | easy | normal | hard | all |
|---|---|---|---|---|
| **mynxi** | 96% | 83% | 56% | 79% |
| **michael** | 94% | 77% | 26% | 65% |
| **vael** | 97% | 64% | 48% | 70% |

### Strategy × difficulty

| | easy | normal | hard | all |
|---|---|---|---|---|
| **melon** | 96% | 64% | 51% | 70% |
| **mixed** | 99% | 90% | 44% | 78% |
| **mixed+mods** | 99% | 80% | 42% | 74% |
| **lean** | 89% | 64% | 37% | 63% |

### Map / knight choice × difficulty

| | easy | normal | hard | all |
|---|---|---|---|---|
| **stacks / accept** | 81% | 58% | 28% | 56% |
| **stacks / betray** | 100% | 92% | 67% | 86% |
| **stacks / reject** | 92% | 78% | 28% | 66% |
| **annex / accept** | 94% | 53% | 39% | 62% |
| **annex / betray** | 100% | 86% | 67% | 84% |
| **annex / reject** | 97% | 58% | 42% | 66% |
| **overflow / accept** | 100% | 75% | 42% | 72% |
| **overflow / betray** | 100% | 81% | 39% | 73% |
| **overflow / reject** | 97% | 92% | 42% | 77% |

### Towers on the board at the end (average)

| strategy | easy | normal | hard |
|---|---|---|---|
| melon | 25.6 | 22.1 | 19.8 |
| mixed | 24.6 | 23.0 | 17.9 |
| mixed+mods | 20.5 | 20.5 | 16.5 |
| lean | 15.1 | 13.8 | 11.6 |

## Where runs end

Wave each losing run died on (all difficulties).

| wave | losses |
|---|---|
| 1 | 0 |
| 2 | 0 |
| 3 | 12 |
| 4 | 11 |
| 5 | 35 |
| 6 | 88 |
| 7 | 13 |
| 8 | 24 |
| 9 | 50 |
| 10 | 46 |

## Leaks per wave (Normal difficulty)

Average stacks lost on each wave, counting only runs that reached it.

| wave | melon | mixed | mixed+mods | lean |
|---|---|---|---|---|
| 1 | 0.00 | 0.44 | 0.48 | 0.74 |
| 2 | 0.00 | 0.00 | 0.15 | 0.00 |
| 3 | 0.00 | 0.00 | 0.00 | 0.00 |
| 4 | 0.44 | 0.11 | 0.00 | 0.00 |
| 5 | 1.30 | 0.31 | 0.52 | 1.02 |
| 6 | 1.04 | 0.36 | 0.52 | 1.44 |
| 7 | 0.02 | 0.03 | 0.13 | 0.03 |
| 8 | 0.38 | 0.16 | 0.30 | 0.11 |
| 9 | 0.94 | 1.18 | 1.31 | 1.73 |
| 10 | 2.24 | 0.66 | 1.21 | 2.25 |

## Winning runs: how close was it?

Average stacks left at victory, as a share of starting stacks.

| hero | easy | normal | hard |
|---|---|---|---|
| mynxi | 88% | 83% | 72% |
| michael | 85% | 70% | 64% |
| vael | 88% | 65% | 66% |
