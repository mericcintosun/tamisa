// Domain constants and the seeded demo audit.
//
// Types live in lib/types.ts, the seeded session in fixtures/northgate-fall-2026.json
// (expanded by lib/data/seed.ts), and the OWL-ViT prompt wording in
// prompts/contaminants.json. This file re-exports all of them so every existing
// import of "@/lib/data" keeps resolving.
//
// The seed session is synthetic, built to the scale of a published campus audit
// (Toronto Metropolitan University's 2025 report sorted 27 garbage and 11 organics
// samples). Weights are realistic per-bag kilograms for a dumped and hand-sorted bag.

import contaminantPrompts from "../prompts/contaminants.json";
import type { Building, Category, CategoryId, Contaminant, ContaminantId, Stream } from "./types";

export type {
  StreamId,
  CategoryId,
  ContaminantId,
  CountSource,
  Building,
  Stream,
  Category,
  Contaminant,
  Bag,
  AuditSession,
} from "./types";

export { SESSION, SESSIONS, SEED_BAGS } from "./data/seed";

export const BOOT_ITERATIONS = 2000;

/** OWL-ViT checkpoint run in the browser by Transformers.js. */
export const MODEL_ID = "Xenova/owlvit-base-patch32";
/** Score floor for a box. Low on purpose: a volunteer deletes a wrong box faster than they draw a missed one. */
export const DETECTION_THRESHOLD = 0.1;
export const BOOT_SEED = 20261112;

export const BUILDINGS: Building[] = [
  { id: "marlow", name: "Marlow Library", binCount: 42 },
  { id: "cedar", name: "Cedar Dining Hall", binCount: 36 },
  { id: "okafor", name: "Okafor Science Centre", binCount: 28 },
  { id: "linden", name: "Linden Residence", binCount: 54 },
  { id: "ridge", name: "Ridge Athletics Centre", binCount: 18 },
];

export const STREAMS: Stream[] = [
  { id: "recycling", label: "Recycling bin", accepts: ["paper", "containers"] },
  { id: "organics", label: "Organics bin", accepts: ["organics"] },
  { id: "landfill", label: "Landfill bin", accepts: ["film", "foam", "soiled", "residual"] },
];

export const CATEGORIES: Category[] = [
  { id: "paper", label: "Paper and cardboard", hint: "clean, dry fibre", recoverable: true },
  { id: "containers", label: "Containers", hint: "bottles, cans, rigid plastic", recoverable: true },
  { id: "organics", label: "Food scraps", hint: "food and compostable napkins", recoverable: true },
  { id: "film", label: "Plastic film", hint: "bags, wrappers", recoverable: false },
  { id: "foam", label: "Foam", hint: "cups, clamshells", recoverable: false },
  { id: "soiled", label: "Soiled paper", hint: "greasy boxes, lined cups", recoverable: false },
  { id: "residual", label: "Everything else", hint: "true garbage", recoverable: false },
];

/** Built from prompts/contaminants.json: tune the OWL-ViT prompt wording there. */
export const CONTAMINANTS: Contaminant[] = (contaminantPrompts as { id: string; label: string; prompt: string }[]).map((c) => ({
  id: c.id as ContaminantId,
  label: c.label,
  prompt: c.prompt,
}));

export const FLOW_STEPS = [
  { id: "bin", label: "Bin", question: "Which bin did this bag come from?" },
  { id: "tarp", label: "Tarp photo", question: "What is lying on the tarp?" },
  { id: "weights", label: "Scale", question: "What did each pile weigh?" },
  { id: "estimate", label: "Estimate", question: "What did this bag change?" },
] as const;

export type FlowStepId = (typeof FLOW_STEPS)[number]["id"];

export function isFlowStep(value: string): value is FlowStepId {
  return FLOW_STEPS.some((s) => s.id === value);
}

export function emptyWeights(): Record<CategoryId, number> {
  return { paper: 0, containers: 0, organics: 0, film: 0, foam: 0, soiled: 0, residual: 0 };
}

export function emptyCounts(): Record<ContaminantId, number> {
  return { "plastic-bag": 0, "food-waste": 0, "foam-cup": 0, "pizza-box": 0, "coffee-cup": 0 };
}

export function buildingName(id: string): string {
  return BUILDINGS.find((b) => b.id === id)?.name ?? id;
}
