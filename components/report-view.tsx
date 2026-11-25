"use client";

// The printable end-of-day report: the rate with its margin, the dirtiest building,
// the most common contaminant and the plan for the next audit. Bags logged on this
// device are merged with the session's seeded bags.

import { Download, Printer, Share2 } from "lucide-react";
import { useMemo, useState } from "react";
import { IntervalChart } from "@/components/interval-chart";
import { SceneSlot } from "@/components/scene-slot";
import { Button } from "@/components/ui/button";
import { bagsToCsv, downloadCsv, useCampusEstimate, useSavedBags } from "@/lib/audit-store";
import { CONTAMINANTS, type AuditSession, type Bag } from "@/lib/data";
import { contaminantTotals, fmt, neymanPlan, planSentence, type CampusEstimate } from "@/lib/stats";

interface ReportViewProps {
  session: AuditSession;
  seedBags: Bag[];
  initialEstimate: CampusEstimate;
}

export function ReportView({ session, seedBags, initialEstimate }: ReportViewProps) {
  const saved = useSavedBags();
  const bags = useMemo(() => [...seedBags, ...saved.bags.filter((b) => b.sessionId === session.id)], [seedBags, saved.bags, session.id]);
  const { estimate, computing } = useCampusEstimate(bags, initialEstimate);
  const [shareNote, setShareNote] = useState<string | null>(null);

  const c = estimate.contamination;
  const r = estimate.recovery;
  const dirtiest = [...c.rows].sort((a, b) => b.point - a.point)[0];
  const totals = contaminantTotals(bags);
  const topContaminant = CONTAMINANTS.map((x) => ({ ...x, count: totals[x.id] })).sort((a, b) => b.count - a.count)[0];
  const plan = neymanPlan(bags, session.targetHalfWidth);
  const liveCount = bags.length - seedBags.length;
  const dateLabel = new Date(`${session.date}T12:00:00`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  async function share() {
    const url = window.location.href;
    const text = `${session.title}: contamination ${fmt(c.point, 0)}% ±${fmt(c.halfWidth)} points from ${bags.length} bags.`;
    try {
      if (navigator.share) {
        await navigator.share({ title: session.title, text, url });
        setShareNote("Shared.");
      } else {
        await navigator.clipboard.writeText(`${text} ${url}`);
        setShareNote("Link and headline copied.");
      }
    } catch {
      setShareNote("Sharing was cancelled. The address bar link works too.");
    }
  }

  return (
    <article className="mx-auto max-w-5xl px-5 pb-20 pt-10">
      <p className="kicker">
        {session.campus} · {dateLabel} · {session.team}
      </p>
      <h1 className="mt-2 max-w-[22ch] text-5xl leading-[1.05] sm:text-6xl">{session.title}</h1>

      <div className="no-print mt-6 flex flex-wrap items-center gap-3">
        <Button onClick={share}>
          <Share2 aria-hidden />
          Share this report
        </Button>
        <Button variant="outline" onClick={() => window.print()}>
          <Printer aria-hidden />
          Print
        </Button>
        <Button variant="outline" onClick={() => downloadCsv(`${session.id}-bags.csv`, bagsToCsv(bags))}>
          <Download aria-hidden />
          Bags as CSV
        </Button>
        {shareNote && (
          <span className="text-sm text-muted-foreground" role="status">
            {shareNote}
          </span>
        )}
      </div>

      <section className="mt-12 border-t border-foreground pt-6">
        <h2 className="max-w-[30ch] text-3xl leading-tight sm:text-4xl">
          {fmt(c.point, 0)}% of what went into recycling and organics bins did not belong there (95% interval {fmt(c.lo, 0)} to {fmt(c.hi, 0)}%).
        </h2>
        <p className="mt-4 max-w-[68ch] text-muted-foreground">
          Based on {bags.length} sorted bags{liveCount > 0 ? `, ${liveCount} of them logged on this device` : ""}, across {c.rows.length} buildings
          {computing ? ". Recomputing" : ""}. Recovery rate: {fmt(r.point, 0)}% of paper, containers and food scraps reached the right bin (±{fmt(r.halfWidth)} points).
        </p>
        <IntervalChart
          className="mt-8"
          estimate={c}
          highlightId={dirtiest?.id}
          caption={`Contamination by building, ${estimate.iterations} stratified bootstrap draws.`}
        />
      </section>

      <section className="mt-14 grid gap-10 border-t border-foreground pt-6 md:grid-cols-3">
        <div>
          <p className="kicker">Dirtiest building</p>
          <p className="mt-1 font-display text-2xl leading-snug">
            {dirtiest ? `${dirtiest.label}, ${fmt(dirtiest.point, 0)}% contaminated` : "Not enough bags yet"}
          </p>
        </div>
        <div>
          <p className="kicker">Most common contaminant</p>
          <p className="mt-1 font-display text-2xl leading-snug">
            {topContaminant && topContaminant.count > 0 ? `${topContaminant.label}, ${topContaminant.count} pieces` : "None counted yet"}
          </p>
        </div>
        <div>
          <p className="kicker">Next audit</p>
          <p className="mt-1 font-display text-2xl leading-snug">{planSentence(plan)}</p>
        </div>
      </section>

      <section className="mt-14 border-t border-foreground pt-6">
        <p className="kicker">The waste problem, and how we measure success</p>
        <blockquote className="mt-3 max-w-[68ch] border-l-2 border-primary pl-5 font-display text-xl leading-relaxed">
          Contaminated recycling gets landfilled at the sorting plant, so every greasy box in a blue bin can sink the whole load. Campus audits publish a
          single number from a few dozen bags, which makes it impossible to tell whether a new sign worked or the bags were just luckier. Tamisa measures
          success as a contamination rate with a 95% interval: a campaign worked when this semester&apos;s interval sits clearly below last semester&apos;s.
        </blockquote>
      </section>

      <section className="mt-14">
        <SceneSlot
          n={3}
          alt="A printed one-page audit report on a facilities office desk, showing a bar chart with error whiskers per building, next to a clipboard and a coffee mug"
          width={1200}
          height={640}
          className="border border-foreground"
        />
      </section>
    </article>
  );
}
