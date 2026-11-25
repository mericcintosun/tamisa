// The data seam. Server pages and API route handlers read the audit through
// getAdapter(); nothing else knows where the bags come from.
//
// Server-only in practice: never import this file from a "use client" module.

import sampleDetections from "@/fixtures/owlvit-sample-tarp.json";
import { BUILDINGS, SEED_BAGS, SESSIONS } from "@/lib/data";
import type { AdapterMode, AuditSession, SampleDetection, SessionBundle } from "@/lib/types";

export interface AuditAdapter {
  mode: AdapterMode;
  listSessions(): Promise<AuditSession[]>;
  getSession(id: string): Promise<SessionBundle | null>;
  getSampleDetections(): Promise<SampleDetection[]>;
}

/** Serves the seeded Northgate audit from fixtures/northgate-fall-2026.json. */
export const fakeAdapter: AuditAdapter = {
  mode: "fake",
  async listSessions() {
    return SESSIONS;
  },
  async getSession(id: string) {
    const session = SESSIONS.find((s) => s.id === id);
    if (!session) return null;
    return {
      session,
      bags: SEED_BAGS.filter((b) => b.sessionId === session.id),
      buildings: BUILDINGS,
    };
  },
  async getSampleDetections() {
    return sampleDetections as SampleDetection[];
  },
};

/** ADAPTER_MODE=real picks the real source; anything else (or unset) means fake. */
export function getAdapter(): AuditAdapter {
  if (process.env.ADAPTER_MODE === "real") {
    // Phase 2: real source. Until then "real" serves the same fixture, labelled real.
    return { ...fakeAdapter, mode: "real" };
  }
  return fakeAdapter;
}
