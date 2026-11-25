// Pure statistics for Tamisa. Runs in the server (first paint), in the Web Worker
// (live updates) and as a synchronous fallback. No DOM, no React.
//
// Contamination rate: kg that does not belong in a recycling or organics bin, over
// all kg found in those bins. Recovery rate: kg of paper, containers and food scraps
// that landed in the right bin, over all such kg found anywhere.
// Both are ratio estimators, combined across buildings (strata) with weights equal
// to each building's share of the campus bin stations.

import { BUILDINGS, CATEGORIES, STREAMS, type Bag, type Building, type CategoryId, type ContaminantId } from "./data";

export interface IntervalRow {
  id: string;
  label: string;
  point: number;
  lo: number;
  hi: number;
  /** Bags that fed this row. */
  n: number;
  /** Fewer than 2 bags: the interval is not meaningful yet. */
  thin: boolean;
}

export interface Estimate {
  point: number;
  lo: number;
  hi: number;
  halfWidth: number;
  rows: IntervalRow[];
}

export interface CampusEstimate {
  contamination: Estimate;
  recovery: Estimate;
  bagCount: number;
  iterations: number;
}

export interface BootstrapRequest {
  bags: Bag[];
  buildings: Building[];
  iterations: number;
  seed: number;
}

interface RatioItem {
  num: number;
  den: number;
}

const RECOVERABLE = new Set<CategoryId>(CATEGORIES.filter((c) => c.recoverable).map((c) => c.id));

function accepts(bag: Pick<Bag, "stream">): Set<CategoryId> {
  return new Set(STREAMS.find((s) => s.id === bag.stream)?.accepts ?? []);
}

export function bagTotalKg(bag: Pick<Bag, "weightsKg">): number {
  return Object.values(bag.weightsKg).reduce((a, b) => a + b, 0);
}

export function bagMisplacedKg(bag: Pick<Bag, "weightsKg" | "stream">): number {
  const ok = accepts(bag);
  return (Object.entries(bag.weightsKg) as [CategoryId, number][])
    .filter(([c]) => !ok.has(c))
    .reduce((a, [, kg]) => a + kg, 0);
}

/** Per-bag contamination in percent, or null for landfill bags (no contamination metric). */
export function bagContamination(bag: Pick<Bag, "weightsKg" | "stream">): number | null {
  if (bag.stream === "landfill") return null;
  const total = bagTotalKg(bag);
  return total > 0 ? (bagMisplacedKg(bag) / total) * 100 : null;
}

function contaminationItem(bag: Bag): RatioItem | null {
  if (bag.stream === "landfill") return null;
  const den = bagTotalKg(bag);
  return den > 0 ? { num: bagMisplacedKg(bag), den } : null;
}

function recoveryItem(bag: Bag): RatioItem | null {
  const ok = accepts(bag);
  let den = 0;
  let num = 0;
  for (const [c, kg] of Object.entries(bag.weightsKg) as [CategoryId, number][]) {
    if (!RECOVERABLE.has(c)) continue;
    den += kg;
    if (bag.stream !== "landfill" && ok.has(c)) num += kg;
  }
  return den > 0 ? { num, den } : null;
}

/** Deterministic PRNG so the same bags always give the same interval. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function quantile(sorted: Float64Array, q: number): number {
  if (sorted.length === 0) return 0;
  const pos = q * (sorted.length - 1);
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

function ratio(items: RatioItem[]): number {
  const den = items.reduce((a, i) => a + i.den, 0);
  return den > 0 ? (items.reduce((a, i) => a + i.num, 0) / den) * 100 : 0;
}

function stratifiedBootstrap(
  bags: Bag[],
  buildings: Building[],
  pick: (bag: Bag) => RatioItem | null,
  iterations: number,
  rng: () => number
): Estimate {
  const strata = buildings
    .map((b) => ({ b, items: bags.filter((g) => g.buildingId === b.id).map(pick).filter((x): x is RatioItem => x !== null) }))
    .filter((s) => s.items.length > 0);

  if (strata.length === 0) return { point: 0, lo: 0, hi: 0, halfWidth: 0, rows: [] };

  const totalW = strata.reduce((a, s) => a + s.b.binCount, 0);
  const weights = strata.map((s) => s.b.binCount / totalW);
  const points = strata.map((s) => ratio(s.items));
  const point = points.reduce((a, p, i) => a + p * weights[i], 0);

  const campus = new Float64Array(iterations);
  const perStratum = strata.map(() => new Float64Array(iterations));

  for (let it = 0; it < iterations; it++) {
    let acc = 0;
    strata.forEach((s, i) => {
      const n = s.items.length;
      let num = 0;
      let den = 0;
      for (let k = 0; k < n; k++) {
        const draw = s.items[Math.floor(rng() * n)];
        num += draw.num;
        den += draw.den;
      }
      const r = den > 0 ? (num / den) * 100 : 0;
      perStratum[i][it] = r;
      acc += r * weights[i];
    });
    campus[it] = acc;
  }

  campus.sort();
  const lo = quantile(campus, 0.025);
  const hi = quantile(campus, 0.975);

  const rows: IntervalRow[] = strata.map((s, i) => {
    const sorted = perStratum[i].sort();
    return {
      id: s.b.id,
      label: s.b.name,
      point: points[i],
      lo: quantile(sorted, 0.025),
      hi: quantile(sorted, 0.975),
      n: s.items.length,
      thin: s.items.length < 2,
    };
  });

  return { point, lo, hi, halfWidth: (hi - lo) / 2, rows };
}

/** 2000-draw stratified bootstrap of campus contamination and recovery rates. */
export function runBootstrap(req: BootstrapRequest): CampusEstimate {
  const rng = mulberry32(req.seed);
  return {
    contamination: stratifiedBootstrap(req.bags, req.buildings, contaminationItem, req.iterations, rng),
    recovery: stratifiedBootstrap(req.bags, req.buildings, recoveryItem, req.iterations, rng),
    bagCount: req.bags.length,
    iterations: req.iterations,
  };
}

export interface PlanRow {
  id: string;
  label: string;
  current: number;
  recommended: number;
  extra: number;
}

export interface SamplingPlan {
  targetHalfWidth: number;
  totalRecommended: number;
  extraTotal: number;
  rows: PlanRow[];
}

function sd(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return Math.sqrt(values.reduce((a, v) => a + (v - mean) ** 2, 0) / (values.length - 1));
}

/**
 * Neyman allocation for the contamination rate. Stratum h gets n_h proportional to
 * W_h * S_h, where W_h is its share of bin stations and S_h the spread of per-bag
 * contamination there. The total n makes 1.96 * SE equal to the target half width.
 * Buildings with fewer than 2 bags borrow the pooled spread.
 */
export function neymanPlan(bags: Bag[], targetHalfWidth: number, buildings: Building[] = BUILDINGS): SamplingPlan {
  const ratesBy = new Map<string, number[]>();
  for (const b of buildings) ratesBy.set(b.id, []);
  for (const bag of bags) {
    const r = bagContamination(bag);
    if (r !== null) ratesBy.get(bag.buildingId)?.push(r);
  }
  const pooled = sd([...ratesBy.values()].flat()) || 10;
  const totalBins = buildings.reduce((a, b) => a + b.binCount, 0);

  const parts = buildings.map((b) => {
    const rates = ratesBy.get(b.id) ?? [];
    const s = rates.length >= 2 ? sd(rates) || pooled / 2 : pooled;
    return { b, current: rates.length, ws: (b.binCount / totalBins) * s };
  });

  const sumWS = parts.reduce((a, p) => a + p.ws, 0);
  const se = Math.max(targetHalfWidth, 0.25) / 1.96;
  const total = Math.ceil((sumWS / se) ** 2);

  const rows = parts.map((p) => {
    const recommended = Math.max(2, Math.ceil((total * p.ws) / (sumWS || 1)));
    return { id: p.b.id, label: p.b.name, current: p.current, recommended, extra: Math.max(0, recommended - p.current) };
  });

  return {
    targetHalfWidth,
    totalRecommended: rows.reduce((a, r) => a + r.recommended, 0),
    extraTotal: rows.reduce((a, r) => a + r.extra, 0),
    rows,
  };
}

function joinList(parts: string[]): string {
  if (parts.length <= 1) return parts.join("");
  return `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
}

/** The advisor's sentence, composed from the plan numbers. */
export function planSentence(plan: SamplingPlan): string {
  const target = `±${fmt(plan.targetHalfWidth)} points`;
  const needs = plan.rows.filter((r) => r.extra > 0).sort((a, b) => b.extra - a.extra);
  if (needs.length === 0) return `The bags on file already reach ${target}. You can stop sorting.`;
  const parts = needs.map((r, i) => `${r.extra} ${i === 0 ? (r.extra === 1 ? "more bag" : "more bags") : ""} from ${r.label}`.replace("  ", " "));
  return `To reach ${target}, sort ${joinList(parts)}.`;
}

export function fmt(n: number, digits = 1): string {
  const rounded = Number(n.toFixed(digits));
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(digits);
}

export function contaminantTotals(bags: Bag[]): Record<ContaminantId, number> {
  const out = { "plastic-bag": 0, "food-waste": 0, "foam-cup": 0, "pizza-box": 0, "coffee-cup": 0 } as Record<ContaminantId, number>;
  for (const bag of bags) for (const [k, v] of Object.entries(bag.contaminants) as [ContaminantId, number][]) out[k] += v;
  return out;
}
