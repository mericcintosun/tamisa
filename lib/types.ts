// Domain types for Tamisa. Shared by lib/data.ts, the seed module, the adapter
// and the API route handlers. No runtime code here.

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

/** One raw box, shaped exactly like the Transformers.js zero-shot-object-detection output. */
export interface SampleDetection {
  label: string;
  score: number;
  box: { xmin: number; ymin: number; xmax: number; ymax: number };
}

export type AdapterMode = "fake" | "real";

export interface ApiResponse<T> {
  ok: true;
  mode: AdapterMode;
  data: T;
}

export interface ApiError {
  ok: false;
  error: string;
}

export interface SessionBundle {
  session: AuditSession;
  bags: Bag[];
  buildings: Building[];
}
