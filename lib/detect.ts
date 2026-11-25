// In-browser contaminant detection with OWL-ViT (zero-shot object detection) through
// Transformers.js. No key, no server: the model downloads once and the browser
// caches it. Import this module only from client components; the library itself is
// loaded with a dynamic import inside loadDetector().

import { CONTAMINANTS, DETECTION_THRESHOLD, MODEL_ID, type ContaminantId } from "./data";

export { DETECTION_THRESHOLD, MODEL_ID };

export interface DetectionBox {
  id: string;
  contaminant: ContaminantId;
  score: number;
  /** Corners as fractions of the image (0 to 1). */
  xmin: number;
  ymin: number;
  xmax: number;
  ymax: number;
}

interface RawDetection {
  score: number;
  label: string;
  box: { xmin: number; ymin: number; xmax: number; ymax: number };
}

type Detector = (image: string, labels: string[], options: { threshold: number; percentage: boolean }) => Promise<RawDetection[]>;

interface ProgressInfo {
  status: string;
  file?: string;
  loaded?: number;
  total?: number;
}

let detectorPromise: Promise<Detector> | null = null;
let progressListener: ((pct: number) => void) | null = null;
const fileProgress = new Map<string, { loaded: number; total: number }>();

function reportProgress(info: ProgressInfo) {
  if (info.status !== "progress" || !info.file || !info.total) return;
  fileProgress.set(info.file, { loaded: info.loaded ?? 0, total: info.total });
  let loaded = 0;
  let total = 0;
  for (const f of fileProgress.values()) {
    loaded += f.loaded;
    total += f.total;
  }
  progressListener?.(total > 0 ? Math.min(100, (loaded / total) * 100) : 0);
}

/** Loads OWL-ViT once per page; later calls reuse the same pipeline. */
export function loadDetector(onProgress?: (pct: number) => void): Promise<Detector> {
  progressListener = onProgress ?? null;
  if (!detectorPromise) {
    detectorPromise = (async () => {
      const { pipeline } = await import("@huggingface/transformers");
      const create = pipeline as unknown as (
        task: string,
        model: string,
        options: { progress_callback: (info: ProgressInfo) => void }
      ) => Promise<Detector>;
      const detector = await create("zero-shot-object-detection", MODEL_ID, { progress_callback: reportProgress });
      progressListener?.(100);
      return detector;
    })();
    detectorPromise.catch(() => {
      detectorPromise = null;
    });
  }
  return detectorPromise;
}

function iou(a: DetectionBox, b: DetectionBox): number {
  const x1 = Math.max(a.xmin, b.xmin);
  const y1 = Math.max(a.ymin, b.ymin);
  const x2 = Math.min(a.xmax, b.xmax);
  const y2 = Math.min(a.ymax, b.ymax);
  const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  const area = (r: DetectionBox) => (r.xmax - r.xmin) * (r.ymax - r.ymin);
  const union = area(a) + area(b) - inter;
  return union > 0 ? inter / union : 0;
}

/** Per-label non-maximum suppression: OWL-ViT often fires twice on one crumpled bag. */
function suppress(boxes: DetectionBox[], threshold = 0.5): DetectionBox[] {
  const kept: DetectionBox[] = [];
  for (const box of [...boxes].sort((a, b) => b.score - a.score)) {
    if (kept.every((k) => k.contaminant !== box.contaminant || iou(k, box) < threshold)) kept.push(box);
  }
  return kept;
}

/** Runs OWL-ViT on a tarp photo (data URL) with one text prompt per contaminant. */
export async function detectContaminants(imageDataUrl: string, onProgress?: (pct: number) => void): Promise<DetectionBox[]> {
  const detector = await loadDetector(onProgress);
  const prompts = CONTAMINANTS.map((c) => c.prompt);
  const raw = await detector(imageDataUrl, prompts, { threshold: DETECTION_THRESHOLD, percentage: true });
  const boxes = raw
    .map((d, i): DetectionBox | null => {
      const match = CONTAMINANTS.find((c) => c.prompt === d.label);
      if (!match) return null;
      const clamp = (v: number) => Math.min(1, Math.max(0, v));
      return {
        id: `box-${i}`,
        contaminant: match.id,
        score: d.score,
        xmin: clamp(d.box.xmin),
        ymin: clamp(d.box.ymin),
        xmax: clamp(d.box.xmax),
        ymax: clamp(d.box.ymax),
      };
    })
    .filter((b): b is DetectionBox => b !== null);
  return suppress(boxes).slice(0, 40);
}

/** Tallies kept boxes per contaminant: the number that goes into the bag record. */
export function countBoxes(boxes: DetectionBox[]): Record<ContaminantId, number> {
  const out = { "plastic-bag": 0, "food-waste": 0, "foam-cup": 0, "pizza-box": 0, "coffee-cup": 0 } as Record<ContaminantId, number>;
  for (const b of boxes) out[b.contaminant] += 1;
  return out;
}

/**
 * Downscales any image source (an uploaded file's object URL, or the sample SVG) to a
 * JPEG data URL. Small enough to keep in sessionStorage, and the size OWL-ViT resizes to anyway.
 */
export function prepareImage(src: string, maxSide = 768): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxSide / Math.max(img.naturalWidth || maxSide, img.naturalHeight || maxSide));
      const w = Math.round((img.naturalWidth || maxSide) * scale);
      const h = Math.round((img.naturalHeight || maxSide) * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas is not available in this browser."));
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => reject(new Error("That file could not be read as an image."));
    img.src = src;
  });
}
