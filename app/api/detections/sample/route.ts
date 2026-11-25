import { NextResponse } from "next/server";
import { getAdapter } from "@/lib/adapter";
import type { ApiResponse, SampleDetection } from "@/lib/types";

// Recorded OWL-ViT output for the sample tarp, shaped like the Transformers.js
// zero-shot-object-detection result. The live model still runs in the browser.
export async function GET() {
  const adapter = getAdapter();
  const detections = await adapter.getSampleDetections();
  return NextResponse.json<ApiResponse<SampleDetection[]>>({ ok: true, mode: adapter.mode, data: detections }, { status: 200 });
}
