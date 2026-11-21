/**
 * The sums behind sim-scenario.ts: the same games played two ways, compared game by game.
 * Kept apart from the runner so tests can check them without running the simulator.
 */

/** One finished game, reduced to what a scenario compares. */
export interface Game {
  /** Keeper, difficulty, night, map, seed and armour: the same key means the same game played another way. */
  key: string;
  won: boolean;
  /** Wave the game ended on (the night's length on a win), and the night's length. */
  wave: number;
  waves: number;
  livesLeft: number;
  maxLives: number;
}

/**
 * How far a game got, 0 to 2: the share of the night survived on a loss (0 = lost on wave 1),
 * 1 plus the share of stacks kept on a win. One number that still ranks a close win above a scrape.
 */
export const progress = (g: Game) => (g.won ? 1 + g.livesLeft / Math.max(1, g.maxLives) : (g.wave - 1) / Math.max(1, g.waves));

/** Mean and the half-width of a 95% interval (normal approximation), for paired differences. */
export function meanCI(xs: number[]) {
  const n = xs.length;
  if (!n) return { mean: 0, ci: 0 };
  const mean = xs.reduce((a, b) => a + b, 0) / n;
  if (n < 2) return { mean, ci: Infinity };
  const sd = Math.sqrt(xs.reduce((a, x) => a + (x - mean) ** 2, 0) / (n - 1));
  return { mean, ci: (1.96 * sd) / Math.sqrt(n) };
}

export interface Comparison {
  /** Games found in both (only those are compared). */
  paired: number;
  winA: number;
  winB: number;
  /** Games only B won, and games only A won. */
  onlyB: number;
  onlyA: number;
  /** B's win rate minus A's, in points, with its 95% half-width. */
  winDiff: number;
  winCI: number;
  /** B's progress minus A's (see `progress`), with its 95% half-width. */
  progressDiff: number;
  progressCI: number;
  verdict: string;
}

/** Compares variant B with baseline A, game by game. */
export function compare(a: Game[], b: Game[], nameA = "A", nameB = "B"): Comparison {
  const byKey = new Map(a.map((g) => [g.key, g]));
  const pairs = b.filter((g) => byKey.has(g.key)).map((g) => [byKey.get(g.key)!, g] as const);
  const wins = meanCI(pairs.map(([x, y]) => Number(y.won) - Number(x.won)));
  const prog = meanCI(pairs.map(([x, y]) => progress(y) - progress(x)));
  const n = pairs.length;
  const winA = pairs.filter(([x]) => x.won).length;
  const winB = pairs.filter(([, y]) => y.won).length;
  const pts = (v: number) => `${Math.round(v * 100)}`;
  let verdict: string;
  if (!n) verdict = "No games to compare: the two variants share no keeper, map, difficulty and seed.";
  else if (wins.mean !== 0 && Math.abs(wins.mean) > wins.ci)
    verdict = `${wins.mean > 0 ? nameB : nameA} wins more: ${pts(Math.abs(wins.mean))} points (give or take ${pts(wins.ci)}).`;
  else if (prog.mean !== 0 && Math.abs(prog.mean) > prog.ci)
    verdict = `About the same win rate, but ${prog.mean > 0 ? nameB : nameA} does better within the games: it gets further when it loses, or keeps more stacks when it wins.`;
  else verdict = `No clear difference at ${n} games: anything from ${pts(wins.mean - wins.ci)} to +${pts(wins.mean + wins.ci)} points. More seeds would narrow it.`;
  return {
    paired: n,
    winA,
    winB,
    onlyB: pairs.filter(([x, y]) => y.won && !x.won).length,
    onlyA: pairs.filter(([x, y]) => x.won && !y.won).length,
    winDiff: wins.mean,
    winCI: wins.ci,
    progressDiff: prog.mean,
    progressCI: prog.ci,
    verdict,
  };
}

/** Splits scenario flags written as one string ("--heroes mynxi --seeds 20") or already as a list. */
export function flagsOf(v: string | string[] | undefined): string[] {
  if (!v) return [];
  return Array.isArray(v) ? v : v.split(/\s+/).filter(Boolean);
}
