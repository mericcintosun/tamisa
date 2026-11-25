"use client";

// Signature interaction 1 (K5 dataviz): the contamination chart, drawn in SVG from
// the real bags. A small linear scale does the maths; React renders; a rAF tween grows
// each bar and opens each 95% interval from its point estimate. When a new bag changes
// the estimate, the bars and whiskers glide to the new values, so the interval can be
// seen narrowing. (No d3 / Motion dependency: both were only used for these bits.)

import { useEffect, useId, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import type { Estimate } from "@/lib/stats";
import { fmt } from "@/lib/stats";
import { cn } from "@/lib/utils";

// ---- scale helpers (same results as d3.scaleLinear().ticks for a [0, max] domain) ----

function tickStep(start: number, stop: number, count: number): number {
  const step0 = Math.abs(stop - start) / Math.max(0, count);
  let step1 = Math.pow(10, Math.floor(Math.log10(step0)));
  const error = step0 / step1;
  if (error >= Math.sqrt(50)) step1 *= 10;
  else if (error >= Math.sqrt(10)) step1 *= 5;
  else if (error >= Math.sqrt(2)) step1 *= 2;
  return step1;
}

function linearScale(domain: [number, number], range: [number, number]) {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  const scale = (v: number) => (d1 === d0 ? r0 : r0 + ((v - d0) / (d1 - d0)) * (r1 - r0));
  scale.ticks = (count: number) => {
    const step = tickStep(d0, d1, count);
    if (!isFinite(step) || step <= 0) return [d0];
    const out: number[] = [];
    const first = Math.ceil(d0 / step);
    const last = Math.floor(d1 / step);
    for (let i = first; i <= last; i++) out.push(Number((i * step).toPrecision(12)));
    return out;
  };
  return scale;
}

// ---- motion helpers ----

const reducedMotionQuery = "(prefers-reduced-motion: reduce)";

function useReducedMotion(): boolean {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia(reducedMotionQuery);
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => window.matchMedia(reducedMotionQuery).matches,
    () => false
  );
}

/** Approximates cubic-bezier(0.19, 1, 0.22, 1) (ease-out-expo). */
const ease = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));

interface TweenTiming {
  duration: number;
  delay?: number;
}

/** Tweens an array of numbers toward `target`; duration 0 jumps straight there. */
function useTween(target: number[], { duration, delay = 0 }: TweenTiming): number[] {
  const [value, setValue] = useState(target);
  const current = useRef(target);
  const key = target.join(",");

  useEffect(() => {
    const to = key.split(",").map(Number);
    const from = current.current;
    if (duration <= 0 || from.length !== to.length) {
      current.current = to;
      setValue(to);
      return;
    }
    const start = performance.now() + delay * 1000;
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, Math.max(0, (now - start) / (duration * 1000)));
      const e = ease(t);
      const next = from.map((f, i) => f + (to[i] - f) * e);
      current.current = next;
      setValue(next);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [key, duration, delay]);

  return value;
}

interface IntervalChartProps {
  estimate: Estimate;
  /** Visible caption under the chart. */
  caption: string;
  highlightId?: string | null;
  compact?: boolean;
  className?: string;
}

export function IntervalChart({ estimate, caption, highlightId, compact = false, className }: IntervalChartProps) {
  const reduce = useReducedMotion();
  const titleId = useId();
  // "ssr": final values (readable without JS). "zero": collapsed for one frame. "live": animate.
  const [phase, setPhase] = useState<"ssr" | "zero" | "live">("ssr");

  useLayoutEffect(() => {
    setPhase(reduce ? "live" : "zero");
  }, [reduce]);

  useEffect(() => {
    if (phase !== "zero") return;
    const frame = requestAnimationFrame(() => setPhase("live"));
    return () => cancelAnimationFrame(frame);
  }, [phase]);

  const rows = [
    { id: "campus", label: "Whole campus", point: estimate.point, lo: estimate.lo, hi: estimate.hi, n: 0, thin: false },
    ...estimate.rows,
  ];

  const width = 720;
  const rowH = compact ? 34 : 50;
  const gutter = compact ? 150 : 210;
  const top = 28;
  const height = top + rows.length * rowH + 8;
  const maxHi = rows.length > 0 ? Math.max(...rows.map((r) => r.hi)) : 30;
  const maxValue = Math.max(30, Math.ceil((Number.isFinite(maxHi) ? maxHi : 30) / 10) * 10);
  const x = linearScale([0, maxValue], [gutter, width - 70]);
  const ticks = x.ticks(compact ? 3 : 5);
  const collapsed = phase === "zero";
  const transition = (i: number): TweenTiming => (phase === "live" && !reduce ? { duration: 0.9, delay: i * 0.06 } : { duration: 0 });

  return (
    <figure className={cn("w-full", className)}>
      <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-labelledby={titleId} className="h-auto w-full min-w-[20rem] overflow-visible">
        <title id={titleId}>{caption}</title>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={x(t)} x2={x(t)} y1={top - 6} y2={height - 8} className="stroke-border" strokeWidth={1} />
            <text x={x(t)} y={top - 12} textAnchor="middle" className="fill-muted-foreground text-[13px]">
              {t}%
            </text>
          </g>
        ))}
        {rows.map((r, i) => {
          const y = top + i * rowH + rowH / 2;
          const isCampus = r.id === "campus";
          const isHighlight = highlightId === r.id;
          const barW = Math.max(0, x(r.point) - x(0));
          return (
            <g key={r.id}>
              <line x1={0} x2={width} y1={top + i * rowH} y2={top + i * rowH} className={isCampus ? "stroke-foreground" : "stroke-border"} strokeWidth={1} />
              <text
                x={0}
                y={y + 5}
                className={cn(compact ? "text-[14px]" : "text-[16px]", isCampus ? "fill-foreground font-semibold" : "fill-foreground", isHighlight && "fill-primary font-semibold")}
              >
                {r.label}
                {r.thin ? " (1 bag)" : ""}
              </text>
              <RowMarks
                x0={x(0)}
                y={y}
                barH={isCampus ? 14 : 10}
                barW={collapsed ? 0 : barW}
                lo={collapsed ? x(r.point) : x(r.lo)}
                hi={collapsed ? x(r.point) : x(r.hi)}
                timing={transition(i)}
                barClass={isCampus || isHighlight ? "fill-primary" : "fill-deep stroke-foreground"}
                barStroke={isCampus || isHighlight ? 0 : 0.75}
                lineClass={r.thin ? "stroke-warn" : "stroke-foreground"}
              />
              <text x={width} y={y + 5} textAnchor="end" className={cn("fill-foreground tabular-nums", compact ? "text-[13px]" : "text-[15px]", isCampus && "font-semibold")}>
                {fmt(r.point, 0)}% ±{fmt((r.hi - r.lo) / 2, 1)}
              </text>
            </g>
          );
        })}
      </svg>
      </div>
      <figcaption className="mt-3 max-w-[68ch] text-sm text-muted-foreground">{caption}</figcaption>
      <ul className="sr-only">
        {rows.map((r) => (
          <li key={r.id}>
            {r.label}: {fmt(r.point, 1)} percent contamination, 95% interval {fmt(r.lo, 1)} to {fmt(r.hi, 1)} percent.
          </li>
        ))}
      </ul>
    </figure>
  );
}

interface RowMarksProps {
  x0: number;
  y: number;
  barH: number;
  barW: number;
  lo: number;
  hi: number;
  timing: TweenTiming;
  barClass: string;
  barStroke: number;
  lineClass: string;
}

/** The bar, interval line and two whisker caps for one row, tweened together. */
function RowMarks({ x0, y, barH, barW, lo, hi, timing, barClass, barStroke, lineClass }: RowMarksProps) {
  const [w, l, h] = useTween([barW, lo, hi], timing);
  return (
    <>
      <rect x={x0} y={y - barH / 2} width={Math.max(0, w)} height={barH} className={barClass} strokeWidth={barStroke} />
      <line x1={l} x2={h} y1={y} y2={y} className={lineClass} strokeWidth={2} />
      <line x1={l} x2={l} y1={y - 8} y2={y + 8} className="stroke-foreground" strokeWidth={2} />
      <line x1={h} x2={h} y1={y - 8} y2={y + 8} className="stroke-foreground" strokeWidth={2} />
    </>
  );
}
