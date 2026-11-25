"use client";

// Signature interaction 1 (K5 dataviz): the contamination chart, drawn in SVG from
// the real bags. d3 does the scales only; React renders; Motion grows each bar and
// opens each 95% interval from its point estimate. When a new bag changes the
// estimate, the bars and whiskers glide to the new values, so the interval can be
// seen narrowing.

import * as d3 from "d3";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useId, useLayoutEffect, useState } from "react";
import type { Estimate } from "@/lib/stats";
import { fmt } from "@/lib/stats";
import { cn } from "@/lib/utils";

interface IntervalChartProps {
  estimate: Estimate;
  /** Visible caption under the chart. */
  caption: string;
  highlightId?: string | null;
  compact?: boolean;
  className?: string;
}

const EASE = [0.19, 1, 0.22, 1] as const;

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
  const maxValue = Math.max(30, Math.ceil((d3.max(rows, (r) => r.hi) ?? 30) / 10) * 10);
  const x = d3.scaleLinear().domain([0, maxValue]).range([gutter, width - 70]);
  const ticks = x.ticks(compact ? 3 : 5);
  const collapsed = phase === "zero";
  const transition = (i: number) => (phase === "live" && !reduce ? { duration: 0.9, ease: EASE, delay: i * 0.06 } : { duration: 0 });

  return (
    <figure className={cn("w-full", className)}>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-labelledby={titleId} className="h-auto w-full overflow-visible">
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
              <g transform={`translate(${x(0)} ${y - (isCampus ? 7 : 5)})`}>
                <motion.rect
                  height={isCampus ? 14 : 10}
                  initial={false}
                  animate={{ width: collapsed ? 0 : barW }}
                  transition={transition(i)}
                  className={isCampus || isHighlight ? "fill-primary" : "fill-deep stroke-foreground"}
                  strokeWidth={isCampus || isHighlight ? 0 : 0.75}
                />
              </g>
              <motion.line
                y1={y}
                y2={y}
                initial={false}
                animate={{ x1: collapsed ? x(r.point) : x(r.lo), x2: collapsed ? x(r.point) : x(r.hi) }}
                transition={transition(i)}
                className={r.thin ? "stroke-warn" : "stroke-foreground"}
                strokeWidth={2}
              />
              <motion.line
                y1={y - 8}
                y2={y + 8}
                initial={false}
                animate={{ x1: collapsed ? x(r.point) : x(r.lo), x2: collapsed ? x(r.point) : x(r.lo) }}
                transition={transition(i)}
                className="stroke-foreground"
                strokeWidth={2}
              />
              <motion.line
                y1={y - 8}
                y2={y + 8}
                initial={false}
                animate={{ x1: collapsed ? x(r.point) : x(r.hi), x2: collapsed ? x(r.point) : x(r.hi) }}
                transition={transition(i)}
                className="stroke-foreground"
                strokeWidth={2}
              />
              <text x={width} y={y + 5} textAnchor="end" className={cn("fill-foreground tabular-nums", compact ? "text-[13px]" : "text-[15px]", isCampus && "font-semibold")}>
                {fmt(r.point, 0)}% ±{fmt((r.hi - r.lo) / 2, 1)}
              </text>
            </g>
          );
        })}
      </svg>
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
