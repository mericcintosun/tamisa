"use client";

// Tarp photo step. OWL-ViT draws a box over every contaminant it finds; the volunteer
// taps a wrong box to drop it, and the kept boxes become the bag's counts. If the
// model cannot load in this browser, the tally below is filled by hand and the
// record says so.

import { Camera, Minus, Plus, ScanSearch } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { BagDraft } from "@/lib/audit-store";
import { CONTAMINANTS, emptyCounts } from "@/lib/data";
import { MODEL_ID, countBoxes, detectContaminants, prepareImage } from "@/lib/detect";
import { fmt } from "@/lib/stats";

type ModelState = { kind: "idle" } | { kind: "loading"; pct: number } | { kind: "running" } | { kind: "done"; found: number } | { kind: "error"; message: string };

interface ContaminantDetectorProps {
  draft: BagDraft;
  onChange: (patch: Partial<BagDraft>) => void;
}

export function ContaminantDetector({ draft, onChange }: ContaminantDetectorProps) {
  const [state, setState] = useState<ModelState>({ kind: "idle" });

  async function loadPhoto(src: string, label: string) {
    try {
      const photo = await prepareImage(src);
      onChange({ photo, photoLabel: label, boxes: [], contaminants: emptyCounts(), countedBy: null });
      setState({ kind: "idle" });
    } catch (err) {
      setState({ kind: "error", message: err instanceof Error ? err.message : "That image could not be opened." });
    }
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    const url = URL.createObjectURL(file);
    await loadPhoto(url, file.name);
    URL.revokeObjectURL(url);
  }

  async function runDetection() {
    if (!draft.photo) return;
    setState({ kind: "loading", pct: 0 });
    try {
      const boxes = await detectContaminants(draft.photo, (pct) => setState(pct >= 100 ? { kind: "running" } : { kind: "loading", pct }));
      onChange({ boxes, contaminants: countBoxes(boxes), countedBy: "owlvit" });
      setState({ kind: "done", found: boxes.length });
    } catch {
      setState({
        kind: "error",
        message: "The detector could not load in this browser (it needs WebAssembly and about 150 MB of free cache). Count the pieces by hand below; the record will say it was a hand count.",
      });
    }
  }

  function dropBox(id: string) {
    const boxes = draft.boxes.filter((b) => b.id !== id);
    onChange({ boxes, contaminants: countBoxes(boxes) });
  }

  function nudge(id: keyof BagDraft["contaminants"], delta: number) {
    const next = { ...draft.contaminants, [id]: Math.max(0, (draft.contaminants[id] ?? 0) + delta) };
    onChange({ contaminants: next, countedBy: "manual" });
  }

  const busy = state.kind === "loading" || state.kind === "running";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm">
          <Camera aria-hidden className="size-4" />
          <span className="sr-only">Tarp photo</span>
          <Input type="file" accept="image/*" capture="environment" onChange={(e) => onFile(e.target.files?.[0])} className="w-auto" />
        </label>
        <Button variant="link" onClick={() => loadPhoto("/illustrations/scene-2.svg", "Sample tarp (illustration)")}>
          Use the sample tarp
        </Button>
      </div>

      {draft.photo ? (
        <div className="space-y-3">
          <div className="relative w-full max-w-2xl border border-foreground">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={draft.photo} alt={`Tarp photo: ${draft.photoLabel ?? "this bag"}, sorted contents spread out`} className="block h-auto w-full" />
            {draft.boxes.map((b) => {
              const label = CONTAMINANTS.find((c) => c.id === b.contaminant)?.label ?? b.contaminant;
              return (
                <Button
                  key={b.id}
                  variant="ghost"
                  onClick={() => dropBox(b.id)}
                  title={`Drop this box (${label}, score ${fmt(b.score, 2)})`}
                  aria-label={`Drop box: ${label}, score ${fmt(b.score, 2)}`}
                  className="absolute h-auto items-start justify-start border-2 border-primary p-0 hover:border-bad hover:bg-transparent"
                  style={{
                    left: `${b.xmin * 100}%`,
                    top: `${b.ymin * 100}%`,
                    width: `${(b.xmax - b.xmin) * 100}%`,
                    height: `${(b.ymax - b.ymin) * 100}%`,
                  }}
                >
                  <span className="bg-primary px-1 text-[11px] leading-4 text-primary-foreground">{label}</span>
                </Button>
              );
            })}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={runDetection} disabled={busy}>
              <ScanSearch aria-hidden />
              {draft.boxes.length > 0 ? "Detect again" : "Find contaminants"}
            </Button>
            <DetectorStatus state={state} boxes={draft.boxes.length} />
          </div>
        </div>
      ) : (
        <p className="max-w-[68ch] border-l-2 border-border pl-4 text-sm text-muted-foreground">
          No photo yet. Shoot the tarp from straight above once the bag is spread out, or try the sample tarp. Nothing is uploaded: the model runs on this device.
        </p>
      )}

      <div className="max-w-xl">
        <div className="flex items-baseline justify-between border-b border-foreground pb-1">
          <p className="kicker">Tally for this bag</p>
          {draft.countedBy && <Badge variant={draft.countedBy === "owlvit" ? "default" : "outline"}>{draft.countedBy === "owlvit" ? "counted by OWL-ViT" : "hand count"}</Badge>}
        </div>
        <ul>
          {CONTAMINANTS.map((c) => (
            <li key={c.id} className="flex items-center justify-between border-b border-border py-1.5">
              <span>{c.label}</span>
              <span className="flex items-center gap-1">
                <Button variant="ghost" size="icon" aria-label={`One fewer ${c.label.toLowerCase()}`} onClick={() => nudge(c.id, -1)}>
                  <Minus />
                </Button>
                <span className="w-8 text-center tabular-nums">{draft.contaminants[c.id] ?? 0}</span>
                <Button variant="ghost" size="icon" aria-label={`One more ${c.label.toLowerCase()}`} onClick={() => nudge(c.id, 1)}>
                  <Plus />
                </Button>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function DetectorStatus({ state, boxes }: { state: ModelState; boxes: number }) {
  if (state.kind === "loading")
    return (
      <div className="flex min-w-56 flex-col gap-1 text-sm" role="status">
        <span>Downloading {MODEL_ID} once, then cached: {Math.round(state.pct)}%</span>
        <span className="block h-1 w-full bg-deep">
          <span className="block h-1 bg-primary" style={{ width: `${state.pct}%` }} />
        </span>
      </div>
    );
  if (state.kind === "running") return <span className="text-sm" role="status">Looking at the tarp on this device…</span>;
  if (state.kind === "done")
    return (
      <span className="text-sm text-muted-foreground" role="status">
        {state.found === 0 ? "No contaminants found above the score floor." : `${boxes} boxes kept. Tap a wrong box to drop it.`}
      </span>
    );
  if (state.kind === "error") return <p className="max-w-[60ch] text-sm text-bad" role="alert">{state.message}</p>;
  return null;
}
