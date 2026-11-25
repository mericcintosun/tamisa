// The seeded Northgate audit, expanded from fixtures/northgate-fall-2026.json.
//
// Imports types from @/lib/types only, never from lib/data.ts, so there is no
// import cycle (lib/data.ts re-exports from here).

import fixture from "@/fixtures/northgate-fall-2026.json";
import type { AuditSession, Bag, CategoryId, ContaminantId, StreamId } from "@/lib/types";

// Compact seed rows: [bag id, building, stream, time sorted,
//   kg of paper, containers, organics, film, foam, soiled, residual,
//   counts of plastic bags, food waste, foam cups, pizza boxes, coffee cups]
type SeedRow = [string, string, StreamId, string, number[], number[]];

interface SeedFixture {
  session: AuditSession;
  rows: SeedRow[];
}

const data = fixture as unknown as SeedFixture;

const CATEGORY_ORDER: CategoryId[] = ["paper", "containers", "organics", "film", "foam", "soiled", "residual"];
const CONTAMINANT_ORDER: ContaminantId[] = ["plastic-bag", "food-waste", "foam-cup", "pizza-box", "coffee-cup"];

function zeroRecord<K extends string>(keys: K[]): Record<K, number> {
  const out = {} as Record<K, number>;
  for (const k of keys) out[k] = 0;
  return out;
}

export const SESSION: AuditSession = data.session;

export const SESSIONS: AuditSession[] = [SESSION];

export const SEED_BAGS: Bag[] = data.rows.map(([id, buildingId, stream, time, kg, counts]) => {
  const weightsKg = zeroRecord(CATEGORY_ORDER);
  CATEGORY_ORDER.forEach((c, i) => (weightsKg[c] = kg[i] ?? 0));
  const contaminants = zeroRecord(CONTAMINANT_ORDER);
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
