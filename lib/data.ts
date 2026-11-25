// Domain model and the seeded demo audit.
//
// The seed session is synthetic, built to the scale of a published campus audit
// (Toronto Metropolitan University's 2025 report sorted 27 garbage and 11 organics
// samples). Weights are realistic per-bag kilograms for a dumped and hand-sorted bag.

export type StreamId = "recycling" | "organics" | "landfill";
export type CategoryId = "paper" | "containers" | "organics" | "film" | "foam" | "soiled" | "residual";
export type ContaminantId = "plastic-bag" | "food-waste" | "foam-cup" | "pizza-box" | "coffee-cup";
export type CountSource = "owlvit" | "manual";

export interface Building {
  id: string;
  name: string;
  /** Number of recycling and organics stations in the building: the stratum weight. */
  binCount: number;
}

export interface Stream {
  id: StreamId;
  label: string;
  /** Categories that belong in this stream. Anything else found in it is a contaminant. */
  accepts: CategoryId[];
}

export interface Category {
  id: CategoryId;
  label: string;
  hint: string;
  /** Paper, containers and food scraps count toward the recovery rate. */
  recoverable: boolean;
}

export interface Contaminant {
  id: ContaminantId;
  label: string;
  /** Text prompt handed to OWL-ViT for zero-shot detection. */
  prompt: string;
}

export interface Bag {
  id: string;
  sessionId: string;
  buildingId: string;
  stream: StreamId;
  auditedAt: string;
  weightsKg: Record<CategoryId, number>;
  contaminants: Record<ContaminantId, number>;
  countedBy: CountSource;
}

export interface AuditSession {
  id: string;
  title: string;
  campus: string;
  date: string;
  team: string;
  /** The precision the sustainability office wants, in percentage points (half width of the 95% interval). */
  targetHalfWidth: number;
}

export const SESSION: AuditSession = {
  id: "northgate-fall-2026",
  title: "Northgate fall waste audit",
  campus: "Northgate University",
  date: "2026-11-12",
  team: "Northgate Green Team, 14 student volunteers",
  targetHalfWidth: 3,
};

export const SESSIONS: AuditSession[] = [SESSION];

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

export const CONTAMINANTS: Contaminant[] = [
  { id: "plastic-bag", label: "Plastic bags", prompt: "a plastic bag" },
  { id: "food-waste", label: "Food waste", prompt: "food waste" },
  { id: "foam-cup", label: "Foam cups", prompt: "a styrofoam cup" },
  { id: "pizza-box", label: "Greasy pizza boxes", prompt: "a greasy pizza box" },
  { id: "coffee-cup", label: "Coffee cups", prompt: "a paper coffee cup" },
];

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

// Compact seed rows: [bag id, building, stream, time sorted,
//   kg of paper, containers, organics, film, foam, soiled, residual,
//   counts of plastic bags, food waste, foam cups, pizza boxes, coffee cups]
type SeedRow = [string, string, StreamId, string, number[], number[]];

const NONE = [0, 0, 0, 0, 0];

const ROWS: SeedRow[] = [
  ["NG-01", "marlow", "recycling", "09:12", [3.1, 1.2, 0.3, 0.4, 0.1, 0.3, 0.2], [3, 1, 1, 1, 4]],
  ["NG-02", "marlow", "recycling", "09:20", [2.8, 0.9, 0.5, 0.3, 0.2, 0.4, 0.1], [2, 2, 2, 1, 5]],
  ["NG-03", "cedar", "organics", "09:26", [0.2, 0.1, 6.8, 0.3, 0.1, 0.4, 0.1], [3, 0, 1, 1, 2]],
  ["NG-04", "okafor", "recycling", "09:31", [2.4, 1.6, 0.1, 0.1, 0.0, 0.1, 0.1], [1, 0, 0, 0, 1]],
  ["NG-05", "linden", "recycling", "09:38", [1.9, 2.4, 0.3, 0.3, 0.1, 0.3, 0.2], [3, 1, 1, 1, 2]],
  ["NG-06", "cedar", "recycling", "09:45", [1.0, 2.6, 0.4, 0.3, 0.4, 0.6, 0.2], [3, 2, 4, 2, 3]],
  ["NG-07", "marlow", "recycling", "09:52", [3.5, 1.0, 0.1, 0.2, 0.0, 0.1, 0.1], [1, 0, 0, 0, 2]],
  ["NG-08", "ridge", "recycling", "09:58", [0.6, 3.1, 0.1, 0.2, 0.0, 0.1, 0.1], [2, 0, 0, 0, 1]],
  ["NG-09", "linden", "landfill", "10:05", [0.9, 1.2, 2.1, 0.6, 0.2, 0.5, 1.8], NONE],
  ["NG-10", "okafor", "recycling", "10:11", [2.1, 1.8, 0.2, 0.2, 0.1, 0.1, 0.0], [2, 1, 1, 0, 1]],
  ["NG-11", "marlow", "recycling", "10:18", [1.8, 1.0, 1.1, 0.6, 0.3, 0.6, 0.3], [5, 3, 3, 2, 6]],
  ["NG-12", "cedar", "recycling", "10:24", [1.2, 2.9, 0.3, 0.2, 0.3, 0.4, 0.1], [2, 1, 3, 1, 2]],
  ["NG-13", "linden", "recycling", "10:31", [2.2, 2.0, 0.2, 0.2, 0.1, 0.2, 0.1], [2, 1, 1, 0, 1]],
  ["NG-14", "cedar", "organics", "10:37", [0.1, 0.2, 7.4, 0.2, 0.0, 0.2, 0.1], [2, 0, 0, 1, 1]],
  ["NG-15", "marlow", "landfill", "10:44", [0.8, 0.6, 1.1, 0.4, 0.3, 0.6, 1.9], NONE],
  ["NG-16", "okafor", "landfill", "10:50", [0.6, 0.5, 0.9, 0.3, 0.1, 0.3, 2.2], NONE],
  ["NG-17", "linden", "organics", "10:57", [0.2, 0.1, 4.6, 0.3, 0.0, 0.2, 0.1], [3, 0, 0, 1, 1]],
  ["NG-18", "ridge", "recycling", "11:03", [0.5, 2.8, 0.2, 0.1, 0.1, 0.1, 0.2], [1, 1, 1, 0, 2]],
  ["NG-19", "cedar", "landfill", "11:10", [0.5, 0.9, 3.2, 0.6, 0.5, 0.8, 1.4], NONE],
  ["NG-20", "linden", "recycling", "11:16", [1.4, 1.9, 0.6, 0.6, 0.3, 0.5, 0.4], [5, 2, 2, 2, 4]],
  ["NG-21", "okafor", "recycling", "11:23", [2.6, 1.3, 0.1, 0.1, 0.1, 0.0, 0.1], [1, 0, 1, 0, 1]],
  ["NG-22", "cedar", "organics", "11:29", [0.3, 0.1, 6.1, 0.4, 0.1, 0.3, 0.2], [4, 0, 1, 1, 2]],
  ["NG-23", "linden", "landfill", "11:36", [1.1, 0.9, 1.8, 0.5, 0.1, 0.4, 2.0], NONE],
  ["NG-24", "marlow", "recycling", "11:42", [2.9, 1.1, 0.2, 0.3, 0.1, 0.2, 0.1], [2, 1, 1, 1, 3]],
  ["NG-25", "ridge", "landfill", "11:49", [0.4, 1.4, 0.6, 0.3, 0.1, 0.2, 1.3], NONE],
  ["NG-26", "okafor", "organics", "11:55", [0.1, 0.0, 3.9, 0.1, 0.0, 0.1, 0.0], [1, 0, 0, 0, 1]],
  ["NG-27", "linden", "recycling", "12:02", [2.0, 2.1, 0.1, 0.2, 0.0, 0.2, 0.1], [1, 0, 0, 1, 1]],
  ["NG-28", "cedar", "landfill", "12:08", [0.4, 0.7, 2.8, 0.5, 0.6, 0.9, 1.6], NONE],
  ["NG-29", "ridge", "recycling", "12:15", [0.7, 3.3, 0.1, 0.1, 0.0, 0.0, 0.1], [1, 0, 0, 0, 1]],
];

const CATEGORY_ORDER: CategoryId[] = ["paper", "containers", "organics", "film", "foam", "soiled", "residual"];
const CONTAMINANT_ORDER: ContaminantId[] = ["plastic-bag", "food-waste", "foam-cup", "pizza-box", "coffee-cup"];

export const SEED_BAGS: Bag[] = ROWS.map(([id, buildingId, stream, time, kg, counts]) => {
  const weightsKg = emptyWeights();
  CATEGORY_ORDER.forEach((c, i) => (weightsKg[c] = kg[i] ?? 0));
  const contaminants = emptyCounts();
  CONTAMINANT_ORDER.forEach((c, i) => (contaminants[c] = counts[i] ?? 0));
  return {
    id,
    sessionId: SESSION.id,
    buildingId,
    stream,
    auditedAt: `${SESSION.date}T${time}:00-05:00`,
    weightsKg,
    contaminants,
    countedBy: "manual",
  };
});
