# Melongeddon balance report

12800 simulated runs (10 seeds per combination): the full run in `sim-results/deep10`, with Dr. Samodovol, Quackarot and Asser rerun at their new stacks (12, 12, 20) in `probe-a`/`probe-b`/`probe-c`, merged with `--from`. Overall win rate: **58%**.

Bots place towers where they cover the most carpet, pick upgrades at random, and build between and during waves. They are not smart players: treat these as relative numbers, not absolute difficulty.

**Strategies:** `melon` = only melon cannons. `mixed` = rotates melon, mortar, freeze, fire, still. `mixed+mods` = mixed, and buys back-room mods when they are cheaper than a new tower. `lean` = a cautious player: mixed, at most 2 new towers per wave, only between waves.

## Win rates

### Hero × difficulty

| | easy | normal | hard | overdue | all |
|---|---|---|---|---|---|
| **mynxi** | 94% | 80% | 60% | 32% | 66% |
| **michael** | 95% | 80% | 61% | 35% | 68% |
| **vael** | 97% | 69% | 31% | 18% | 54% |
| **elf** | 93% | 75% | 40% | 22% | 57% |
| **ooze** | 95% | 75% | 50% | 24% | 61% |
| **scholar** | 91% | 62% | 26% | 9% | 47% |
| **quack** | 91% | 67% | 37% | 11% | 51% |
| **asser** | 95% | 80% | 41% | 17% | 58% |

### Strategy × difficulty

| | easy | normal | hard | overdue | all |
|---|---|---|---|---|---|
| **melon** | 80% | 44% | 21% | 5% | 38% |
| **mixed** | 99% | 86% | 56% | 29% | 68% |
| **mixed+mods** | 100% | 91% | 62% | 34% | 72% |
| **lean** | 96% | 72% | 34% | 15% | 54% |

### Map × difficulty

| | easy | normal | hard | overdue | all |
|---|---|---|---|---|---|
| **stacks** | 90% | 76% | 41% | 20% | 57% |
| **annex** | 93% | 84% | 62% | 43% | 70% |
| **mezzanine** | 93% | 75% | 50% | 23% | 60% |
| **rarebooks** | 96% | 84% | 52% | 23% | 64% |
| **archive** | 91% | 73% | 40% | 17% | 55% |
| **sorting** | 97% | 74% | 40% | 18% | 57% |
| **greenhouse** | 96% | 60% | 45% | 23% | 56% |
| **belltower** | 96% | 79% | 44% | 19% | 59% |
| **overflow** | 93% | 68% | 33% | 11% | 51% |
| **siege** | 93% | 61% | 24% | 10% | 47% |

### Hero × difficulty: the Overflow

| | easy | normal | hard | overdue | all |
|---|---|---|---|---|---|
| **mynxi** | 93% | 78% | 38% | 15% | 56% |
| **michael** | 90% | 65% | 50% | 25% | 57% |
| **vael** | 100% | 73% | 25% | 5% | 51% |
| **elf** | 85% | 68% | 38% | 10% | 50% |
| **ooze** | 98% | 80% | 48% | 18% | 61% |
| **scholar** | 90% | 50% | 5% | 3% | 37% |
| **quack** | 90% | 68% | 30% | 10% | 49% |
| **asser** | 98% | 63% | 30% | 3% | 48% |

### Hero × difficulty: the Siege

| | easy | normal | hard | overdue | all |
|---|---|---|---|---|---|
| **mynxi** | 90% | 75% | 43% | 23% | 57% |
| **michael** | 93% | 65% | 45% | 30% | 58% |
| **vael** | 93% | 48% | 5% | 0% | 36% |
| **elf** | 98% | 73% | 13% | 5% | 47% |
| **ooze** | 100% | 68% | 38% | 5% | 53% |
| **scholar** | 93% | 38% | 3% | 0% | 33% |
| **quack** | 83% | 43% | 3% | 3% | 33% |
| **asser** | 93% | 78% | 48% | 13% | 57% |

### Towers on the board at the end (average)

| strategy | easy | normal | hard | overdue |
|---|---|---|---|---|
| melon | 48.8 | 37.8 | 28.0 | 18.8 |
| mixed | 51.3 | 49.0 | 36.9 | 23.9 |
| mixed+mods | 45.1 | 43.6 | 33.5 | 21.5 |
| lean | 33.7 | 29.6 | 19.4 | 13.1 |

## Where runs end

Wave each losing run died on (all difficulties).

| wave | losses |
|---|---|
| 1 | 0 |
| 2 | 214 |
| 3 | 494 |
| 4 | 450 |
| 5 | 689 |
| 6 | 855 |
| 7 | 301 |
| 8 | 267 |
| 9 | 128 |
| 10 | 120 |
| 11 | 496 |
| 12 | 81 |
| 13 | 93 |
| 14 | 397 |
| 15 | 603 |
| 16 | 21 |
| 17 | 67 |
| 18 | 2 |
| 19 | 19 |
| 20 | 29 |
| 21 | 80 |

## Leaks per wave (Normal difficulty)

Average stacks lost on each wave, counting only runs that reached it.

| wave | melon | mixed | mixed+mods | lean |
|---|---|---|---|---|
| 1 | 0.13 | 0.49 | 0.49 | 0.59 |
| 2 | 0.02 | 0.22 | 0.22 | 0.73 |
| 3 | 0.01 | 0.13 | 0.13 | 0.24 |
| 4 | 0.14 | 0.05 | 0.07 | 0.17 |
| 5 | 2.04 | 0.24 | 0.29 | 0.62 |
| 6 | 2.03 | 0.41 | 0.35 | 0.98 |
| 7 | 0.56 | 0.18 | 0.17 | 0.43 |
| 8 | 0.59 | 0.37 | 0.29 | 0.49 |
| 9 | 0.33 | 0.05 | 0.03 | 0.09 |
| 10 | 0.37 | 0.28 | 0.24 | 0.30 |
| 11 | 0.98 | 0.85 | 0.49 | 0.98 |
| 12 | 0.23 | 0.04 | 0.03 | 0.06 |
| 13 | 0.37 | 0.12 | 0.12 | 0.23 |
| 14 | 1.50 | 0.77 | 0.61 | 1.00 |
| 15 | 2.14 | 0.82 | 0.51 | 1.07 |
| 16 | 0.00 | 0.00 | 0.00 | 0.14 |
| 17 | 0.16 | 0.02 | 0.00 | 0.13 |
| 18 | 0.00 | 0.00 | 0.00 | 0.00 |
| 19 | 0.01 | 0.00 | 0.00 | 0.07 |
| 20 | 0.12 | 0.00 | 0.00 | 0.10 |
| 21 | 1.35 | 0.18 | 0.01 | 0.38 |

## Winning runs: how close was it?

Average stacks left at victory, as a share of starting stacks.

| hero | easy | normal | hard | overdue |
|---|---|---|---|---|
| mynxi | 97% | 92% | 87% | 77% |
| michael | 97% | 94% | 89% | 84% |
| vael | 95% | 81% | 76% | 66% |
| elf | 95% | 92% | 87% | 85% |
| ooze | 95% | 87% | 74% | 70% |
| scholar | 94% | 82% | 76% | 75% |
| quack | 92% | 84% | 79% | 64% |
| asser | 95% | 91% | 83% | 80% |
