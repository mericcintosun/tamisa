"use client";

// The guided flow for one bag: bin, tarp photo, scale weights, estimate. Each step is
// its own URL (/audit/<step>) and the bag in progress sits in sessionStorage, so back
// and forward never lose input. The right-hand column is the live preview: the campus
// interval as it would read with this bag included.

import Link from "next/link";
import { useMemo, useState } from "react";
import { ContaminantDetector } from "@/components/contaminant-detector";
import { IntervalChart } from "@/components/interval-chart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { draftToBag, nextBagId, useCampusEstimate, useDraft, useSavedBags, type BagDraft } from "@/lib/audit-store";
import { CATEGORIES, FLOW_STEPS, STREAMS, buildingName, type AuditSession, type Bag, type Building, type FlowStepId } from "@/lib/data";
import { bagContamination, bagTotalKg, fmt, neymanPlan, planSentence, type CampusEstimate } from "@/lib/stats";
import { cn } from "@/lib/utils";

interface AuditFlowProps {
  step: FlowStepId;
  session: AuditSession;
  /** The session's bags as served by the adapter (lib/adapter.ts). */
  seedBags: Bag[];
  buildings: Building[];
  initialEstimate: CampusEstimate;
}

export function AuditFlow({ step, session, seedBags, buildings, initialEstimate }: AuditFlowProps) {
  const { draft, update, reset, ready } = useDraft();
  const saved = useSavedBags();
  const [justSaved, setJustSaved] = useState<string | null>(null);

  const allBags = useMemo(() => [...seedBags, ...saved.bags], [seedBags, saved.bags]);
  const bagId = nextBagId(saved.bags.length, seedBags.length);
  const hasBin = Boolean(draft.buildingId && draft.stream);
  const draftBag = useMemo(() => draftToBag(draft, bagId), [draft, bagId]);
  const withDraft = useMemo(() => (draftBag ? [...allBags, draftBag] : allBags), [allBags, draftBag]);

  const before = useCampusEstimate(allBags, initialEstimate);
  const after = useCampusEstimate(withDraft, initialEstimate);

  const index = FLOW_STEPS.findIndex((s) => s.id === step);
  const current = FLOW_STEPS[index];
  const next = FLOW_STEPS[index + 1];
  const prev = FLOW_STEPS[index - 1];

  function save() {
    if (!draftBag) return;
    saved.save(draftBag);
    setJustSaved(draftBag.id);
    reset();
  }

  return (
    <div className="mx-auto max-w-5xl px-5 pb-20 pt-8">
      <FlowProgress step={step} draft={draft} />

      <div className="mt-10 grid gap-12 lg:grid-cols-[minmax(0,1fr)_19rem]">
        <section key={step} className="tamisa-enter min-w-0">
          <p className="kicker">
            Bag {justSaved && step === "estimate" ? justSaved : bagId} · {session.title}
          </p>
          <h1 className="mt-1 text-4xl leading-tight sm:text-5xl">{current.question}</h1>

          <div className="mt-8">
            {!ready ? (
              <p className="text-sm text-muted-foreground" role="status">Opening the bag in progress…</p>
            ) : step === "bin" ? (
              <BinStep draft={draft} onChange={update} buildings={buildings} seedBags={seedBags} />
            ) : step === "tarp" ? (
              <>
                {!hasBin && <PickBinFirst />}
                <ContaminantDetector draft={draft} onChange={update} />
              </>
            ) : step === "weights" ? (
              <WeightsStep draft={draft} onChange={update} />
            ) : (
              <EstimateStep
                session={session}
                buildings={buildings}
                hasBin={hasBin}
                draftBag={draftBag}
                justSaved={justSaved}
                beforeHalf={before.estimate.contamination.halfWidth}
                after={after.estimate}
                computing={after.computing}
                bags={withDraft}
                onSave={save}
              />
            )}
          </div>

          <div className="mt-10 flex flex-wrap items-center gap-4 border-t border-border pt-5">
            {prev && (
              <Button asChild variant="outline">
                <Link href={`/audit/${prev.id}`}>Back to {prev.label.toLowerCase()}</Link>
              </Button>
            )}
            {next && (
              <Button asChild>
                <Link
                  href={`/audit/${next.id}`}
                  aria-disabled={step === "bin" && (!draft.buildingId || !draft.stream)}
                  className={cn(step === "bin" && (!draft.buildingId || !draft.stream) && "pointer-events-none opacity-45")}
                >
                  Next: {next.label.toLowerCase()}
                </Link>
              </Button>
            )}
          </div>
        </section>

        <aside className="min-w-0 border-t border-foreground pt-4 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0" aria-live="polite">
          <p className="kicker">Live estimate</p>
          <p className="mt-2 font-display text-3xl leading-tight">
            {fmt(after.estimate.contamination.point, 0)}% contaminated
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            95% interval {fmt(after.estimate.contamination.lo, 0)} to {fmt(after.estimate.contamination.hi, 0)}%, from {after.estimate.bagCount} bags
            {after.computing ? ", recomputing" : ""}.
          </p>
          {draftBag && (
            <p className="mt-3 text-sm">
              This bag moves the margin from ±{fmt(before.estimate.contamination.halfWidth)} to ±{fmt(after.estimate.contamination.halfWidth)} points.
            </p>
          )}
          <IntervalChart
            compact
            className="mt-4"
            estimate={after.estimate.contamination}
            highlightId={draft.buildingId}
            caption="Contamination by building with this bag included. Bars are point estimates, whiskers the 95% bootstrap interval."
          />
          <p className="mt-4 text-sm text-muted-foreground">
            Recovery rate: {fmt(after.estimate.recovery.point, 0)}% (±{fmt(after.estimate.recovery.halfWidth)}).
          </p>
        </aside>
      </div>
    </div>
  );
}

function FlowProgress({ step, draft }: { step: FlowStepId; draft: BagDraft }) {
  const index = FLOW_STEPS.findIndex((s) => s.id === step);
  const summary: Record<FlowStepId, string | null> = {
    bin: draft.buildingId && draft.stream ? `${buildingName(draft.buildingId)}, ${draft.stream}` : null,
    tarp: draft.countedBy ? `${Object.values(draft.contaminants).reduce((a, b) => a + b, 0)} pieces counted` : null,
    weights: bagTotalKg(draft) > 0 ? `${fmt(bagTotalKg(draft))} kg` : null,
    estimate: null,
  };
  return (
    <nav aria-label="Steps for this bag" className="border-b border-foreground">
      <ol className="grid grid-cols-2 sm:grid-cols-4">
        {FLOW_STEPS.map((s, i) => {
          const isCurrent = s.id === step;
          return (
            <li key={s.id} className={cn("border-b-2 pb-2 pt-1", isCurrent ? "border-primary" : i < index ? "border-foreground" : "border-transparent")}>
              <Link href={`/audit/${s.id}`} aria-current={isCurrent ? "step" : undefined} className="block pr-3">
                <span className={cn("font-display text-lg", isCurrent ? "text-primary" : "text-foreground")}>{s.label}</span>
                <span className="block truncate text-xs text-muted-foreground">{summary[s.id] ?? (isCurrent ? "now" : "not yet")}</span>
              </Link>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/** Empty state for the steps that need a bin before they mean anything. */
function PickBinFirst() {
  return (
    <p className="mb-6 max-w-[65ch] border-l-2 border-warn pl-4 text-sm">
      <strong className="font-semibold">Pick a bin first.</strong> Tamisa needs the building and the stream to know which piles count as contamination.{" "}
      <Link className="underline" href="/audit/bin">
        Choose the bin
      </Link>
      .
    </p>
  );
}

interface BinStepProps {
  draft: BagDraft;
  onChange: (p: Partial<BagDraft>) => void;
  buildings: Building[];
  seedBags: Bag[];
}

function BinStep({ draft, onChange, buildings, seedBags }: BinStepProps) {
  return (
    <div className="space-y-8">
      <fieldset>
        <legend className="kicker mb-3">Building</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {buildings.map((b) => {
            const n = seedBags.filter((bag) => bag.buildingId === b.id).length;
            return (
              <Button key={b.id} variant="choice" className="h-auto" aria-pressed={draft.buildingId === b.id} onClick={() => onChange({ buildingId: b.id })}>
                <span>
                  <span className="block font-medium">{b.name}</span>
                  <span className="block text-xs opacity-80">
                    {b.binCount} bin stations · {n} bags sorted so far
                  </span>
                </span>
              </Button>
            );
          })}
        </div>
      </fieldset>
      <fieldset>
        <legend className="kicker mb-3">Stream</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {STREAMS.map((s) => (
            <Button key={s.id} variant="choice" className="h-auto" aria-pressed={draft.stream === s.id} onClick={() => onChange({ stream: s.id })}>
              {s.label}
            </Button>
          ))}
        </div>
      </fieldset>
    </div>
  );
}

function WeightsStep({ draft, onChange }: { draft: BagDraft; onChange: (p: Partial<BagDraft>) => void }) {
  const stream = STREAMS.find((s) => s.id === draft.stream);
  const total = bagTotalKg(draft);
  const rate = draft.stream ? bagContamination({ weightsKg: draft.weightsKg, stream: draft.stream }) : null;
  return (
    <div className="max-w-xl space-y-6">
      {(!stream || !draft.buildingId) && <PickBinFirst />}
      <ul>
        {CATEGORIES.map((c) => {
          const belongs = stream?.accepts.includes(c.id);
          return (
            <li key={c.id} className="grid grid-cols-[1fr_7rem] items-end gap-4 border-b border-border py-2">
              <label htmlFor={`kg-${c.id}`}>
                <span className="block">
                  {c.label} {stream && !belongs && draft.stream !== "landfill" && <Badge variant="destructive">contaminant here</Badge>}
                </span>
                <span className="block text-xs text-muted-foreground">{c.hint}</span>
              </label>
              <div className="flex items-baseline gap-1">
                <Input
                  id={`kg-${c.id}`}
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step={0.1}
                  value={draft.weightsKg[c.id] ? String(draft.weightsKg[c.id]) : ""}
                  placeholder="0.0"
                  onChange={(e) => {
                    const v = Number.parseFloat(e.target.value);
                    onChange({ weightsKg: { ...draft.weightsKg, [c.id]: Number.isFinite(v) && v > 0 ? v : 0 } });
                  }}
                  className="text-right tabular-nums"
                />
                <span className="text-sm text-muted-foreground">kg</span>
              </div>
            </li>
          );
        })}
      </ul>
      <p className="text-lg">
        {fmt(total)} kg on the scale.{" "}
        {rate !== null ? (
          <>
            This bag is <strong className={rate > 25 ? "text-bad" : rate > 12 ? "text-warn" : "text-ok"}>{fmt(rate, 0)}% contaminated</strong>.
          </>
        ) : draft.stream === "landfill" ? (
          "Landfill bags feed the recovery rate: every kilo of paper, containers or food in here is a missed capture."
        ) : null}
      </p>
    </div>
  );
}

interface EstimateStepProps {
  session: AuditSession;
  buildings: Building[];
  hasBin: boolean;
  draftBag: Bag | null;
  justSaved: string | null;
  beforeHalf: number;
  after: CampusEstimate;
  computing: boolean;
  bags: Bag[];
  onSave: () => void;
}

function EstimateStep({ session, buildings, hasBin, draftBag, justSaved, beforeHalf, after, computing, bags, onSave }: EstimateStepProps) {
  const [target, setTarget] = useState(session.targetHalfWidth);
  const plan = useMemo(() => neymanPlan(bags, target, buildings), [bags, target, buildings]);

  if (bags.length === 0) {
    return (
      <div className="max-w-[65ch] border-t border-border pt-5">
        <p className="kicker">Empty audit</p>
        <p className="mt-2 font-display text-2xl leading-snug">No bags logged yet</p>
        <p className="mt-2 text-sm text-muted-foreground">
          The estimate needs at least one sorted bag.{" "}
          <Link className="underline" href="/audit/bin">
            Log the first bag
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {!hasBin && !justSaved && <PickBinFirst />}
      {draftBag ? (
        <div className="space-y-4">
          <p className="max-w-[65ch] text-lg">
            With bag {draftBag.id} from {buildingName(draftBag.buildingId)}, campus contamination reads{" "}
            <strong>{fmt(after.contamination.point, 0)}%</strong>, and the 95% margin goes from ±{fmt(beforeHalf)} to ±{fmt(after.contamination.halfWidth)} points
            {computing ? " (recomputing)" : ""}.
          </p>
          <Button size="lg" onClick={onSave}>
            Save bag {draftBag.id}
          </Button>
        </div>
      ) : justSaved ? (
        <div className="space-y-3">
          <p className="max-w-[65ch] text-lg">
            Bag {justSaved} is saved on this device. Campus contamination now reads {fmt(after.contamination.point, 0)}% ±{fmt(after.contamination.halfWidth)}.
          </p>
          <div className="flex flex-wrap gap-4">
            <Button asChild variant="outline">
              <Link href="/audit/bin">Log the next bag</Link>
            </Button>
            <Button asChild variant="link">
              <Link href={`/result/${session.id}`}>Open the report</Link>
            </Button>
          </div>
        </div>
      ) : hasBin ? (
        <p className="max-w-[65ch] border-l-2 border-warn pl-4">
          This bag is not complete yet: it needs at least one weight. <Link className="underline" href="/audit/weights">Enter the weights</Link>.
        </p>
      ) : null}

      <div className="max-w-xl">
        <p className="kicker">Sampling advisor</p>
        <p className="mt-2 font-display text-2xl leading-snug">{planSentence(plan)}</p>
        <label className="mt-5 block text-sm" htmlFor="target">
          Target margin: ±{fmt(target)} points
        </label>
        <Input id="target" type="range" min={1} max={10} step={0.5} value={target} onChange={(e) => setTarget(Number(e.target.value))} className="mt-1" />
        <ul className="mt-4">
          {plan.rows.map((r) => (
            <li key={r.id} className="flex items-baseline justify-between border-b border-border py-1.5 text-sm">
              <span>{r.label}</span>
              <span className="tabular-nums">
                {r.current} sorted, {r.extra > 0 ? <strong className="text-primary">{r.extra} more</strong> : "enough"}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-muted-foreground">
          Neyman allocation: more bags where bins are many and bags vary a lot. Counts are contamination bags (recycling and organics).
        </p>
      </div>
    </div>
  );
}
