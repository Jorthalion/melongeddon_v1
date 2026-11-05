# Melongeddon balance report

972 simulated runs (3 seeds per combination) in 111.9s. Overall win rate: **73%**.

Bots place towers where they cover the most carpet, pick upgrades at random, and build between and during waves. They are not smart players: treat these as relative numbers, not absolute difficulty.

**Strategies:** `melon` = only melon cannons. `mixed` = rotates melon, mortar, freeze, fire, still. `mixed+mods` = mixed, and buys back-room mods when they are cheaper than a new tower. `lean` = a cautious player: mixed, at most 2 new towers per wave, only between waves.

## Win rates

### Hero × difficulty

| | easy | normal | hard | all |
|---|---|---|---|---|
| **mynxi** | 95% | 76% | 50% | 74% |
| **michael** | 100% | 87% | 51% | 79% |
| **vael** | 97% | 59% | 45% | 67% |

### Strategy × difficulty

| | easy | normal | hard | all |
|---|---|---|---|---|
| **melon** | 96% | 64% | 56% | 72% |
| **mixed** | 100% | 86% | 51% | 79% |
| **mixed+mods** | 100% | 80% | 49% | 77% |
| **lean** | 94% | 65% | 40% | 66% |

### Map / knight choice × difficulty

| | easy | normal | hard | all |
|---|---|---|---|---|
| **stacks / accept** | 89% | 61% | 31% | 60% |
| **stacks / betray** | 97% | 64% | 44% | 69% |
| **stacks / reject** | 94% | 69% | 39% | 68% |
| **annex / accept** | 100% | 69% | 50% | 73% |
| **annex / betray** | 100% | 78% | 67% | 81% |
| **annex / reject** | 100% | 64% | 47% | 70% |
| **overflow / accept** | 100% | 78% | 50% | 76% |
| **overflow / betray** | 100% | 92% | 56% | 82% |
| **overflow / reject** | 97% | 92% | 56% | 81% |

### Towers on the board at the end (average)

| strategy | easy | normal | hard |
|---|---|---|---|
| melon | 25.5 | 22.0 | 21.5 |
| mixed | 24.8 | 23.2 | 19.8 |
| mixed+mods | 20.5 | 20.3 | 17.0 |
| lean | 15.4 | 14.0 | 12.4 |

## Where runs end

Wave each losing run died on (all difficulties).

| wave | losses |
|---|---|
| 1 | 0 |
| 2 | 0 |
| 3 | 12 |
| 4 | 11 |
| 5 | 14 |
| 6 | 69 |
| 7 | 4 |
| 8 | 25 |
| 9 | 45 |
| 10 | 78 |

## Leaks per wave (Normal difficulty)

Average stacks lost on each wave, counting only runs that reached it.

| wave | melon | mixed | mixed+mods | lean |
|---|---|---|---|---|
| 1 | 0.00 | 0.44 | 0.37 | 0.74 |
| 2 | 0.00 | 0.00 | 0.15 | 0.00 |
| 3 | 0.00 | 0.00 | 0.00 | 0.00 |
| 4 | 0.44 | 0.11 | 0.00 | 0.00 |
| 5 | 1.27 | 0.22 | 0.52 | 0.88 |
| 6 | 0.94 | 0.27 | 0.43 | 1.35 |
| 7 | 0.02 | 0.01 | 0.12 | 0.03 |
| 8 | 0.25 | 0.22 | 0.22 | 0.09 |
| 9 | 0.90 | 1.22 | 1.56 | 1.89 |
| 10 | 3.00 | 0.97 | 1.19 | 2.41 |

## Winning runs: how close was it?

Average stacks left at victory, as a share of starting stacks.

| hero | easy | normal | hard |
|---|---|---|---|
| mynxi | 83% | 77% | 62% |
| michael | 93% | 83% | 63% |
| vael | 85% | 61% | 60% |
