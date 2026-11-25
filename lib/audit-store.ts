"use client";

// Client-side audit state. The bag in progress lives in sessionStorage, so browser
// back and forward move between steps without losing input. Saved bags live in
// localStorage: an audit keeps working with the Wi-Fi off in a loading dock.

import { useCallback, useEffect, useRef, useState } from "react";
import {
  BOOT_ITERATIONS,
  BOOT_SEED,
  BUILDINGS,
  CATEGORIES,
  CONTAMINANTS,
  SESSION,
  emptyCounts,
  emptyWeights,
  type Bag,
  type CategoryId,
  type ContaminantId,
  type CountSource,
  type StreamId,
} from "./data";
import type { DetectionBox } from "./detect";
import { bagContamination, bagTotalKg, fmt, runBootstrap, type CampusEstimate } from "./stats";

const DRAFT_KEY = "tamisa:draft";
const BAGS_KEY = "tamisa:bags";

export interface BagDraft {
  buildingId: string | null;
  stream: StreamId | null;
  photo: string | null;
  photoLabel: string | null;
  boxes: DetectionBox[];
  contaminants: Record<ContaminantId, number>;
  countedBy: CountSource | null;
  weightsKg: Record<CategoryId, number>;
}

export function emptyDraft(): BagDraft {
  return {
    buildingId: null,
    stream: null,
    photo: null,
    photoLabel: null,
    boxes: [],
    contaminants: emptyCounts(),
    countedBy: null,
    weightsKg: emptyWeights(),
  };
}

export function useDraft() {
  const [draft, setDraft] = useState<BagDraft>(emptyDraft);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY);
      if (raw) setDraft({ ...emptyDraft(), ...(JSON.parse(raw) as Partial<BagDraft>) });
    } catch {
      // A corrupt draft is dropped; the volunteer starts the bag again.
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {
      // Quota hit (a very large photo): keep everything but the photo.
      try {
        sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ ...draft, photo: null }));
      } catch {
        /* storage unavailable, state stays in memory */
      }
    }
  }, [draft, ready]);

  const update = useCallback((patch: Partial<BagDraft>) => setDraft((prev) => ({ ...prev, ...patch })), []);
  const reset = useCallback(() => setDraft(emptyDraft()), []);

  return { draft, update, reset, ready };
}

export function useSavedBags() {
  const [bags, setBags] = useState<Bag[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(BAGS_KEY);
      if (raw) setBags(JSON.parse(raw) as Bag[]);
    } catch {
      /* ignore corrupt storage */
    }
    setReady(true);
  }, []);

  const persist = (next: Bag[]) => {
    setBags(next);
    try {
      localStorage.setItem(BAGS_KEY, JSON.stringify(next));
    } catch {
      /* storage unavailable */
    }
  };

  const save = (bag: Bag) => persist([...bags, bag]);
  const clear = () => persist([]);

  return { bags, save, clear, ready };
}

/** Turns the draft into a bag record once it has a bin and at least one weight. */
export function draftToBag(draft: BagDraft, id: string): Bag | null {
  if (!draft.buildingId || !draft.stream) return null;
  if (bagTotalKg(draft) <= 0) return null;
  return {
    id,
    sessionId: SESSION.id,
    buildingId: draft.buildingId,
    stream: draft.stream,
    auditedAt: new Date().toISOString(),
    weightsKg: { ...draft.weightsKg },
    contaminants: { ...draft.contaminants },
    countedBy: draft.countedBy ?? "manual",
  };
}

export function nextBagId(savedCount: number, seedCount: number): string {
  return `NG-${String(seedCount + savedCount + 1).padStart(2, "0")}`;
}

/**
 * Recomputes the campus estimate whenever the bag list changes. The bootstrap runs
 * in lib/bootstrap.worker.ts; if the browser cannot start a worker, the same
 * function runs on the main thread (2000 draws over ~30 bags takes a few ms).
 */
export function useCampusEstimate(bags: Bag[], initial: CampusEstimate) {
  const [estimate, setEstimate] = useState<CampusEstimate>(initial);
  const [computing, setComputing] = useState(false);
  const workerRef = useRef<Worker | null>(null);
  const requestRef = useRef(0);

  useEffect(() => {
    try {
      workerRef.current = new Worker(new URL("./bootstrap.worker.ts", import.meta.url));
    } catch {
      workerRef.current = null;
    }
    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const requestId = ++requestRef.current;
    const request = { bags, buildings: BUILDINGS, iterations: BOOT_ITERATIONS, seed: BOOT_SEED };
    setComputing(true);
    const worker = workerRef.current;

    if (worker) {
      const onMessage = (event: MessageEvent<{ requestId: number; result: CampusEstimate }>) => {
        if (event.data.requestId !== requestRef.current) return;
        setEstimate(event.data.result);
        setComputing(false);
      };
      worker.addEventListener("message", onMessage);
      worker.postMessage({ ...request, requestId });
      return () => worker.removeEventListener("message", onMessage);
    }

    const timer = setTimeout(() => {
      if (requestId !== requestRef.current) return;
      setEstimate(runBootstrap(request));
      setComputing(false);
    }, 0);
    return () => clearTimeout(timer);
  }, [bags]);

  return { estimate, computing };
}

export function bagsToCsv(bags: Bag[]): string {
  const header = [
    "bag_id",
    "building",
    "stream",
    "audited_at",
    ...CATEGORIES.map((c) => `${c.id}_kg`),
    ...CONTAMINANTS.map((c) => `${c.id}_count`),
    "contamination_pct",
    "counted_by",
  ];
  const lines = bags.map((b) => {
    const rate = bagContamination(b);
    return [
      b.id,
      BUILDINGS.find((x) => x.id === b.buildingId)?.name ?? b.buildingId,
      b.stream,
      b.auditedAt,
      ...CATEGORIES.map((c) => fmt(b.weightsKg[c.id], 2)),
      ...CONTAMINANTS.map((c) => String(b.contaminants[c.id] ?? 0)),
      rate === null ? "" : fmt(rate, 1),
      b.countedBy,
    ]
      .map((v) => (/[",]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v))
      .join(",");
  });
  return [header.join(","), ...lines].join("\n");
}

export function downloadCsv(filename: string, csv: string) {
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
