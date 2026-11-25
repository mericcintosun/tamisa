// npm run seed: writes fixtures/northgate-fall-2026.csv from the JSON fixture.
//
// Deterministic on purpose: no clock, no randomness. Same columns as bagsToCsv in
// lib/audit-store.ts, rows in bag id order, fixed decimals (kg to 2 places,
// contamination to 1), LF line endings. Running it twice writes identical bytes.

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const fixturePath = join(root, "fixtures", "northgate-fall-2026.json");
const csvPath = join(root, "fixtures", "northgate-fall-2026.csv");

const BUILDING_NAMES = {
  marlow: "Marlow Library",
  cedar: "Cedar Dining Hall",
  okafor: "Okafor Science Centre",
  linden: "Linden Residence",
  ridge: "Ridge Athletics Centre",
};

const CATEGORIES = ["paper", "containers", "organics", "film", "foam", "soiled", "residual"];
const CONTAMINANTS = ["plastic-bag", "food-waste", "foam-cup", "pizza-box", "coffee-cup"];
const ACCEPTS = {
  recycling: ["paper", "containers"],
  organics: ["organics"],
  landfill: ["film", "foam", "soiled", "residual"],
};

function contamination(stream, kg) {
  if (stream === "landfill") return null;
  const ok = new Set(ACCEPTS[stream]);
  let total = 0;
  let misplaced = 0;
  CATEGORIES.forEach((c, i) => {
    total += kg[i];
    if (!ok.has(c)) misplaced += kg[i];
  });
  return total > 0 ? (misplaced / total) * 100 : null;
}

function cell(v) {
  return /[",]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

const fixture = JSON.parse(readFileSync(fixturePath, "utf8"));
const rows = [...fixture.rows].sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));

const header = [
  "bag_id",
  "building",
  "stream",
  "audited_at",
  ...CATEGORIES.map((c) => `${c}_kg`),
  ...CONTAMINANTS.map((c) => `${c}_count`),
  "contamination_pct",
  "counted_by",
];

const lines = rows.map(([id, buildingId, stream, time, kg, counts]) => {
  const rate = contamination(stream, kg);
  return [
    id,
    BUILDING_NAMES[buildingId] ?? buildingId,
    stream,
    `${fixture.session.date}T${time}:00-05:00`,
    ...kg.map((v) => v.toFixed(2)),
    ...counts.map((v) => String(v)),
    rate === null ? "" : rate.toFixed(1),
    "manual",
  ]
    .map(cell)
    .join(",");
});

writeFileSync(csvPath, [header.join(","), ...lines].join("\n") + "\n", "utf8");
console.log(`seed: wrote ${lines.length} bags to fixtures/northgate-fall-2026.csv`);
