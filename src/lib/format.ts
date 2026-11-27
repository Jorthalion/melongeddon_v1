/**
 * Numbers for small spaces. Exact up to 99,999 (every number the first nights show); past that, a compact
 * form ("123.4K", "2.7M", "27.4B"), so deep Endless health (billions by wave 100) fits a hover card.
 */
const COMPACT = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });

export function shortNumber(n: number): string {
  if (!Number.isFinite(n)) return String(n);
  const r = Math.round(n);
  return Math.abs(r) < 100_000 ? String(r) : COMPACT.format(r);
}
