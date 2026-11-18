# Melongeddon balance report

6400 simulated runs, read from `sim-results/final-on/runs.json`, `sim-results/gh-steam/runs.json`. Overall win rate: **58%**.

Bots place towers where they cover the most carpet, pick upgrades at random, and build between and during waves. They are not smart players: treat these as relative numbers, not absolute difficulty.

**Strategies:** `melon` = only melon cannons. `mixed` = rotates melon, mortar, freeze, fire, still. `mixed+mods` = mixed, and buys back-room mods when they are cheaper than a new tower. `lean` = a cautious player: mixed, at most 2 new towers per wave, only between waves.

## Win rates

### Hero × difficulty

| | easy | normal | hard | overdue | all |
|---|---|---|---|---|---|
| **mynxi** | 94% | 83% | 62% | 31% | 67% |
| **michael** | 95% | 84% | 62% | 33% | 68% |
| **vael** | 98% | 69% | 32% | 21% | 55% |
| **elf** | 91% | 78% | 42% | 25% | 59% |
| **ooze** | 96% | 76% | 51% | 23% | 61% |
| **scholar** | 88% | 59% | 23% | 7% | 44% |
| **quack** | 90% | 65% | 37% | 11% | 50% |
| **asser** | 97% | 83% | 45% | 23% | 62% |

### Strategy × difficulty

| | easy | normal | hard | overdue | all |
|---|---|---|---|---|---|
| **melon** | 79% | 48% | 26% | 5% | 39% |
| **mixed** | 99% | 86% | 56% | 31% | 68% |
| **mixed+mods** | 100% | 91% | 62% | 34% | 72% |
| **lean** | 96% | 73% | 33% | 16% | 54% |

### Map × difficulty

| | easy | normal | hard | overdue | all |
|---|---|---|---|---|---|
| **stacks** | 91% | 78% | 43% | 20% | 58% |
| **annex** | 94% | 83% | 64% | 46% | 72% |
| **mezzanine** | 94% | 78% | 54% | 24% | 62% |
| **rarebooks** | 96% | 84% | 54% | 26% | 65% |
| **archive** | 91% | 73% | 34% | 15% | 53% |
| **sorting** | 95% | 73% | 41% | 19% | 57% |
| **greenhouse** | 96% | 61% | 43% | 23% | 56% |
| **belltower** | 94% | 81% | 43% | 20% | 60% |
| **overflow** | 93% | 72% | 40% | 14% | 55% |
| **siege** | 90% | 61% | 24% | 8% | 46% |

### Hero × difficulty: the Overflow

| | easy | normal | hard | overdue | all |
|---|---|---|---|---|---|
| **mynxi** | 90% | 75% | 45% | 10% | 55% |
| **michael** | 100% | 75% | 60% | 30% | 66% |
| **vael** | 100% | 75% | 35% | 10% | 55% |
| **elf** | 85% | 75% | 45% | 15% | 55% |
| **ooze** | 100% | 75% | 55% | 15% | 61% |
| **scholar** | 90% | 60% | 10% | 0% | 40% |
| **quack** | 85% | 65% | 30% | 15% | 49% |
| **asser** | 95% | 75% | 40% | 15% | 56% |

### Hero × difficulty: the Siege

| | easy | normal | hard | overdue | all |
|---|---|---|---|---|---|
| **mynxi** | 85% | 90% | 50% | 25% | 63% |
| **michael** | 90% | 70% | 45% | 20% | 56% |
| **vael** | 95% | 50% | 5% | 0% | 38% |
| **elf** | 95% | 70% | 15% | 0% | 45% |
| **ooze** | 100% | 70% | 40% | 0% | 53% |
| **scholar** | 80% | 40% | 0% | 0% | 30% |
| **quack** | 85% | 15% | 5% | 0% | 26% |
| **asser** | 90% | 80% | 35% | 20% | 56% |

### Towers on the board at the end (average)

| strategy | easy | normal | hard | overdue |
|---|---|---|---|---|
| melon | 48.1 | 39.1 | 29.1 | 18.1 |
| mixed | 51.7 | 48.9 | 36.7 | 24.1 |
| mixed+mods | 45.5 | 43.4 | 33.0 | 21.4 |
| lean | 33.6 | 29.6 | 19.0 | 13.5 |

## Where runs end

Wave each losing run died on (all difficulties).

| wave | losses |
|---|---|
| 1 | 0 |
| 2 | 120 |
| 3 | 265 |
| 4 | 187 |
| 5 | 368 |
| 6 | 430 |
| 7 | 151 |
| 8 | 136 |
| 9 | 57 |
| 10 | 50 |
| 11 | 222 |
| 12 | 36 |
| 13 | 44 |
| 14 | 191 |
| 15 | 296 |
| 16 | 9 |
| 17 | 33 |
| 18 | 0 |
| 19 | 11 |
| 20 | 12 |
| 21 | 49 |

## Leaks per wave (Normal difficulty)

Average stacks lost on each wave, counting only runs that reached it.

| wave | melon | mixed | mixed+mods | lean |
|---|---|---|---|---|
| 1 | 0.13 | 0.49 | 0.49 | 0.59 |
| 2 | 0.02 | 0.21 | 0.21 | 0.74 |
| 3 | 0.01 | 0.13 | 0.13 | 0.24 |
| 4 | 0.14 | 0.05 | 0.06 | 0.16 |
| 5 | 1.87 | 0.22 | 0.31 | 0.70 |
| 6 | 1.85 | 0.42 | 0.33 | 0.96 |
| 7 | 0.58 | 0.12 | 0.12 | 0.38 |
| 8 | 0.53 | 0.36 | 0.26 | 0.53 |
| 9 | 0.27 | 0.04 | 0.03 | 0.10 |
| 10 | 0.38 | 0.28 | 0.24 | 0.28 |
| 11 | 0.90 | 0.83 | 0.52 | 0.86 |
| 12 | 0.20 | 0.03 | 0.03 | 0.06 |
| 13 | 0.41 | 0.15 | 0.12 | 0.23 |
| 14 | 1.44 | 0.72 | 0.64 | 1.00 |
| 15 | 1.88 | 0.81 | 0.43 | 1.14 |
| 16 | 0.00 | 0.00 | 0.00 | 0.14 |
| 17 | 0.11 | 0.02 | 0.00 | 0.10 |
| 18 | 0.00 | 0.00 | 0.00 | 0.00 |
| 19 | 0.01 | 0.01 | 0.00 | 0.06 |
| 20 | 0.09 | 0.01 | 0.00 | 0.10 |
| 21 | 1.23 | 0.20 | 0.00 | 0.36 |

## Winning runs: how close was it?

Average stacks left at victory, as a share of starting stacks.

| hero | easy | normal | hard | overdue |
|---|---|---|---|---|
| mynxi | 97% | 92% | 88% | 78% |
| michael | 97% | 94% | 88% | 84% |
| vael | 94% | 82% | 74% | 68% |
| elf | 94% | 93% | 87% | 87% |
| ooze | 95% | 88% | 73% | 69% |
| scholar | 94% | 81% | 75% | 81% |
| quack | 94% | 86% | 79% | 64% |
| asser | 94% | 91% | 81% | 77% |
