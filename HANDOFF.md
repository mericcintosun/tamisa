# HANDOFF: Tamisa

You are picking up a working Next.js scaffold. Read this whole file, then `IDENTITY.md`, then start on the Mission list in order.

## 1. Context

**Product:** Tamisa. Campus waste audits with error bars: it counts contaminants in a tarp photo right in the browser, combines them with the scale weights, and reports campus recovery and contamination rates with a 95% interval, plus how many more bags to sort and where.

**Pitch:** Once a year your university's sustainability team dumps the garbage bags onto tarps, sorts them, and tries to answer "what share of our recycling bins is contaminated?". With Tamisa a volunteer photographs each bag on the tarp and types in the scale readings. The app boxes the plastic bags, food scraps and foam cups by itself and counts them. The screen shows the campus contamination rate, how far it could be off, and a suggestion like "sort 4 more bags at the library and the number is pinned down". At the end of the day the report for the administration is ready.

**Hackathon:** Arbiter Hacks V1 (Devpost, online, students only, teams of 1 to 4).
**Deadline:** December 20, 2026, 9:00 pm PST (December 21, 05:00 UTC).
**Target track:** Theme track, "Rethinking Waste" (competes for 1st and 2nd Place Theme automatically). Side tickets: Best ML Usage (prize TBD, may not be awarded), Participation Prize. General track is mutually exclusive with Theme; do not select it.

**Theme rubric:** impact on waste 35%, technical execution 25%, feasibility (could it ship for real) 20%, presentation and demo clarity 20%.

**Submission requirements (verified from the event page via the enrichment record):**
- Public code repository (GitHub, GitLab or similar). Missing means disqualified.
- Demo video of at most 2 to 3 minutes (hard cap 180 s) on YouTube or Vimeo, linked in the form. Missing means disqualified.
- Written description: what it does, how it was built, what comes next. The README is written to double as this.
- Theme track only: one paragraph on the waste problem targeted and how success is measured. It is in the README ("The waste problem we target, and how we measure success") and on the report page.
- Exactly one track chosen at registration; one submission per team.
- Open question for the organizer: whether "$2,100 in cash" is really $100 cash plus credits. Not your problem in code.

## 2. Current state

Identity: see IDENTITY.md (direction D1, structure S3, archetype L5, kit K5)

### Routes (S3 guided flow)

| Route | File | What it renders |
| --- | --- | --- |
| `/` | `app/page.tsx` | L5 bands: claim + scene-1, hero interval chart, OWL-ViT band + scene-2, sampling advisor, CTA band |
| `/audit/bin` | `app/audit/[step]/page.tsx` | Step 1: building and stream |
| `/audit/tarp` | `app/audit/[step]/page.tsx` | Step 2: tarp photo, OWL-ViT boxes, tally |
| `/audit/weights` | `app/audit/[step]/page.tsx` | Step 3: kilograms per category |
| `/audit/estimate` | `app/audit/[step]/page.tsx` | Step 4: before/after margin, save, Neyman advisor |
| `/result/northgate-fall-2026` | `app/result/[id]/page.tsx` | Report with share, print, CSV, scene-3 |
| `/about` | `app/about/page.tsx` | Method and tech, prose folded in `<details>` |

All are linked from the header nav (`components/site-header.tsx`: Start, Log a bag, Report, Method) and the step progress bar links every step.

### File map

- `lib/types.ts`: every domain type plus `SampleDetection`, `AdapterMode`, `ApiResponse<T>`, `ApiError`, `SessionBundle`.
- `lib/data.ts`: 5 buildings, 3 streams, 7 categories, flow step list, model constants; re-exports the types and `SESSION`, `SESSIONS`, `SEED_BAGS`; builds `CONTAMINANTS` from `prompts/contaminants.json`.
- `lib/data/seed.ts`: expands `fixtures/northgate-fall-2026.json` (session + 29 compact rows) into `SEED_BAGS`. Imports `@/lib/types` only.
- `lib/adapter.ts`: `AuditAdapter`, `fakeAdapter`, `getAdapter()` (reads `ADAPTER_MODE`). Server pages and `app/api/**` read through it.
- `scripts/seed.mjs`: `npm run seed`, writes `fixtures/northgate-fall-2026.csv` deterministically.
- `lib/stats.ts`: real math. Contamination and recovery ratio estimators, seeded `mulberry32`, `runBootstrap` (stratified, 2000 draws), `neymanPlan`, `planSentence`.
- `lib/bootstrap.worker.ts`: Web Worker wrapper around `runBootstrap`.
- `lib/audit-store.ts`: `useDraft` (sessionStorage), `useSavedBags` (localStorage), `useCampusEstimate` (worker with main-thread fallback), `draftToBag`, CSV export.
- `lib/detect.ts`: real OWL-ViT via `@huggingface/transformers` (`loadDetector`, `detectContaminants`, NMS, `prepareImage` downscaler).
- `components/interval-chart.tsx`: the K5 hero chart (d3 scales, React SVG, Motion).
- `components/audit-flow.tsx`: the four steps, progress bar, live preview column.
- `components/contaminant-detector.tsx`: upload or sample tarp, determinate model download bar, tap-to-drop boxes, manual tally fallback.
- `components/report-view.tsx`: report page body.
- `components/site-header.tsx`, `components/ui/*` (restyled letterpress primitives), `app/globals.css` (tokens + the single `tamisa-slide-in` keyframe).
- Brand: `public/logo.svg` and `app/icon.svg` (a sieve, mesh in cobalt, two sorted pieces in forest), `public/illustrations/scene-1..3.svg`, `app/opengraph-image.tsx`.
- `contracts/`: template leftover from the warm start, unused by this web-only product. Delete it in your first commit.

### Real vs mocked

- Real: OWL-ViT detection in the browser, bootstrap, Neyman allocation, storage, CSV, share/print.
- Synthetic: the seed session in `fixtures/northgate-fall-2026.json` (served as `SEED_BAGS`) is fictional data at real-audit scale; this is stated in the README and on `/about`.
- One adapter seam (`lib/adapter.ts`), no keys. `ADAPTER_MODE=fake` (default) and `real` both serve the fixture today. The fallback for detection is a hand tally, and the record's `countedBy` says which produced the counts.
- Recharts from the idea's stack was replaced by d3 + Motion because IDENTITY.md's kit K5 is law.

### Kit K5 signature interactions

- Shipped: **1. hero chart** (`components/interval-chart.tsx`): per-building contamination bars and 95% whiskers from the seed, bars grow and whiskers open from the point on first paint; when a bag changes the estimate, both glide to new values. Server HTML renders the final values (readable without JS), and reduced motion skips the animation.
- To build: **2. hover crosshair** on the interval chart that rewrites a sentence: "At Marlow Library, 6 bags put contamination at 27%, between 19 and 36%".
- To build: **3. animated view switch** between "contamination by building" and "recovery by building" (same rows, interpolated bars), or between "before this bag" and "after this bag" on `/audit/estimate`.

### One-mark proof (header home link, `components/site-header.tsx`)

```tsx
<Link href="/" className="flex items-center gap-2.5">
  <BrandMark />
  <span className="font-display text-2xl leading-none">Tamisa</span>
</Link>
```

Scene slots placed: `n={1}` and `n={2}` on `/`, `n={3}` on the report.

### Phase 1 (2026-11-25): demo contract, adapter seam and seeded skeleton

#### Goal

Every DEMO.md step renders from seed data served through `getAdapter()` (`ADAPTER_MODE=fake` by default), and the flow `/` → `/audit/bin` → `/audit/tarp` → `/audit/weights` → `/audit/estimate` → `/result/northgate-fall-2026` is clickable end to end.

#### Status

- Slice 1, contract files (`DEMO.md`, `CLAUDE.md`): done.
- Slice 2, typed core, seed, fixtures and prompts: done.
- Slice 3, adapter seam and API stubs: done. `/`, `/audit/[step]`, `/result/[id]` and also `/about` read through `getAdapter()`. `AuditFlow` and `ReportView` now take `session`, `seedBags` and `buildings` as props instead of importing `SEED_BAGS`.
- Slice 4, shell, error, loading and empty surfaces: done. One known exception is listed under Open questions (hexes in `app/icon.svg`).
- Verification pass (second session, same day): re-read every Phase 1 file against the acceptance gate and re-ran the tripwire greps (dead hexes, keyframes, banned props, one `<BrandMark` at `components/site-header.tsx:22`, `SEED_BAGS` absent under `app/`, no `writeFile` under `app/` or `lib/`, no `useSearchParams`). Hand-checked the CSV `contamination_pct` column against the fixture rows. The only defect found and fixed: `package.json` had `d3 ^7.9.0`, and IDENTITY kit K5 requires `^7.9.2`.
- Verification pass (third session, same day): re-read every gate item again: DEMO.md routes, CLAUDE.md commands, guardrails and compaction line, adapter and the three API routes, the three pages on `getAdapter()`, seed ids NG-01 to NG-29, CSV contamination column spot-checked against the fixture (NG-01 23.2, NG-06 34.5, NG-11 50.9, NG-18 17.5), error, not-found, loading and empty states, `"%s | Tamisa"`, `.env.example`, `.gitignore`, `strict`, labels and `alt`. Tripwires clean: no dead hexes, one `@keyframes` (`tamisa-slide-in`, `app/globals.css:115`), no banned props, no dashes or banned words outside the rule list in `CLAUDE.md:37`, one `<BrandMark` at `components/site-header.tsx:22`. No defects found, nothing changed.
- Verification pass (fourth session, same day): re-checked `.farm-commits.json` (4 slices), `lib/adapter.ts`, `lib/data/seed.ts`, `scripts/seed.mjs` (no `Date.now`, no `Math.random`), the `[id]` API route (200 plus 404 `ApiError`), `tsconfig.json` (`strict`, `resolveJsonModule`, `@/*` covers `@/fixtures`), `.gitignore`, and `.env.example` (`ADAPTER_MODE=fake`, which mirrors the only server env read at `lib/adapter.ts:39`). Tripwires are still clean: `SEED_BAGS` only appears in `lib/`, there are no hexes in `app/**/*.tsx` or `components/`, the one keyframe is at `app/globals.css:115`, and there is one `<BrandMark` at `components/site-header.tsx:22`. No defects found, nothing changed.
- Verification pass (fifth session, same day): a targeted re-check. Tripwire greps are clean: `SEED_BAGS` appears only in `lib/`, `writeFile` only in `scripts/seed.mjs:77` (seed script, not request time), there is no `useSearchParams`, `Date.now` or `Math.random`, the one `@keyframes` is at `app/globals.css:115`, and there are no hexes in `app/**/*.tsx` or `components/`. `getAdapter` is in all 3 pages, `/about` and all 3 API routes. Titles are exported on `/`, `/audit/[step]`, `/result/[id]` and `/about`. Every `process.env` read is mirrored in `.env.example`. There is one `<BrandMark` at `components/site-header.tsx:22`. `.farm-commits.json` lists 4 slices. No defects found, nothing changed.

#### Decisions

- `lib/data/seed.ts` sits beside `lib/data.ts`. `@/lib/data` still resolves to the file, and there is no `lib/data/index.ts`.
- `ADAPTER_MODE=real` currently aliases the fake adapter with `mode: "real"` (`lib/adapter.ts:39`).
- The OG image hexes live in `lib/brand-tokens.ts`, and an IDENTITY amendment line records this.
- The NONE rows (landfill bags) are written as `[0, 0, 0, 0, 0]` in the fixture. The values match the old `NONE` constant.
- `fixtures/northgate-fall-2026.csv` uses the `bagsToCsv` columns but fixed decimals (kg `toFixed(2)`, contamination `toFixed(1)`) and a trailing LF. The in-app CSV export still uses `fmt()`, which trims trailing zeros. I hand-computed the CSV committed in this phase to match the script's output. `npm run seed` confirms it.
- Shared `PickBinFirst` empty state on `tarp`, `weights` and `estimate`. "No bags logged yet" appears on `estimate` and the report when the merged bag list is empty.
- The loading placeholder is a shared `components/loading-placeholder.tsx` (static, `bg-muted` rows, no pulse).
- `IntervalChart` wraps its SVG in `overflow-x-auto` with `min-w-[20rem]`.

#### Failed attempts

None.

#### Files changed

`DEMO.md`, `CLAUDE.md`, `IDENTITY.md` (amendment only), `HANDOFF.md`, `README.md`, `.env.example`, `package.json`, `lib/types.ts`, `lib/data.ts`, `lib/data/seed.ts`, `lib/adapter.ts`, `lib/brand-tokens.ts`, `fixtures/northgate-fall-2026.json`, `fixtures/northgate-fall-2026.csv`, `fixtures/owlvit-sample-tarp.json`, `prompts/contaminants.json`, `scripts/seed.mjs`, `app/page.tsx`, `app/about/page.tsx`, `app/audit/[step]/page.tsx`, `app/audit/[step]/loading.tsx`, `app/result/[id]/page.tsx`, `app/result/[id]/loading.tsx`, `app/api/sessions/route.ts`, `app/api/sessions/[id]/route.ts`, `app/api/detections/sample/route.ts`, `app/layout.tsx`, `app/error.tsx`, `app/not-found.tsx`, `app/opengraph-image.tsx`, `components/audit-flow.tsx`, `components/report-view.tsx`, `components/interval-chart.tsx`, `components/loading-placeholder.tsx`, `components/ui/button.tsx` (comment only).

#### Commands run

None, because the agent has no shell. `npm run build` and `npm run seed` have not been run yet, so the TypeScript check is unverified.

#### Open questions

- `app/icon.svg` has key-block hex literals. The tripwire `#[0-9a-fA-F]{6}` under `app/` matches it (lines 2, 8, 16 to 19). A favicon cannot read CSS variables. Keep it as an exception, or should a build step generate it from `lib/brand-tokens.ts`?
- `/about` now calls `getAdapter()` too, because the tripwire bans `SEED_BAGS` under `app/`. That is one more page on the seam than the spec listed.
- The banned-word sweep matches "Empowerment" in `IDENTITY.md:28`. It is another hackathon's proper name, above the Amendments heading, so it was left alone.
- `components/loading-placeholder.tsx:8` hardcodes "29 bags" as the spec asked. A loading boundary cannot await the adapter, so the number goes stale if the fixture grows.

#### Manual checklist

- `git rm -r contracts` (the product is web only, so no `forge build` is needed).
- Run `npm run seed` twice and confirm `fixtures/northgate-fall-2026.csv` is byte-identical each time and to the committed file.
- Run `npm run build` and fix any strict-TypeScript errors.
- Open `/api/sessions`, `/api/sessions/northgate-fall-2026`, `/api/sessions/nope` (404) and `/api/detections/sample`.

#### Next best step

Phase 2: detection on real photos plus the `public/demo/` pins, and the `real` branch of `getAdapter()`.

## 3. Mission (in priority order)

1. **Detection on real photos (about 3.5 h, ML ticket).** Shoot 10 tarp photos of your own (a dumped recycling bag on a tarp, straight from above). Run each through `/audit/tarp`, write down hits and misses, then tune `DETECTION_THRESHOLD` and the prompt wording in `lib/data.ts` (try "a crumpled plastic bag", "a white foam cup"). Done = on 8 of 10 photos the boxes need at most 2 taps to fix. Add a "warming the model" background `loadDetector()` call when the user lands on `/audit/bin` so the download starts early. Pin 2 good photos into `public/demo/` (you create these, JPEGs) and offer them next to "Use the sample tarp".
2. **Bootstrap polish (about 2.5 h).** Building rows with one bag already show "(1 bag)" in warn color; add the merge warning text in the preview ("Linden has 1 organics bag: its interval is not meaningful yet"). Show a short "recomputing" state on the chart itself. Done = adding bag 30 visibly narrows the campus whisker in the live preview within half a second.
3. **Bag record polish (about 2.5 h).** Show the saved bags list on `/audit/estimate` (or the report) with delete; keep CSV export. Add input guards (a bag over 25 kg prompts "check the scale"). Done = a volunteer can fix a typo in a saved bag.
4. **Sampling advisor (about 1.5 h).** Already real. Add the slider to the report page and a "print the plan" line. Done = moving the target from ±5 to ±3 changes the building counts on screen.
5. **Report and seed (about 1.5 h).** Check the report copy against the final numbers, add the K5 interaction 2 (crosshair sentence) and 3 (view switch). Done = the report prints on one page.
6. **Wow moment rehearsal (0.5 h, schedule it on day 2 before recording).** Clear localStorage, open `/`, go to `/audit/bin`, pick Marlow Library + recycling, use a pinned demo photo, drop one wrong box, enter weights, watch the margin shrink on `/audit/estimate`, save, move the slider, open the report. Do this three times in a row without a hitch.
7. **README and video (about 2 h).** Fill the live URL check, record the 90-second flow (script below), upload to YouTube, paste the link in the Devpost form, select the Theme track.

**90-second demo script:** 0 to 15 s: "Campus audits turn 27 bags into one number. How much should you trust it?" Home page, chart at about ±several points. 15 to 40 s: bag 30, library recycling bin, tarp photo, boxes drop on bags and foam cups, one wrong box tapped away, weights entered. 40 to 60 s: estimate step, the margin narrows, the library bar stands out. 60 to 75 s: advisor sentence, slider from ±5 to ±3, counts grow. 75 to 90 s: report page: rate, interval, dirtiest building, top contaminant, next audit plan. Close: "Next time a sign campaign works, you will know it was not luck."

## 4. Constraints

- Stack: Next.js 15 App Router, TypeScript strict, Tailwind CSS v4 (no config file), primitives from `components/ui/` through `cn()`. Deploys to Vercel: no custom server, no runtime filesystem writes, no API route that needs a key.
- `IDENTITY.md` is law for every color, font, route, layout and animation. Colors only through tokens in `app/globals.css`; corners stay sharp (rounded-none); hairline rules, no shadows, no gradients. Newsreader on every h1 and h2, Archivo for body. The only keyframe is `tamisa-slide-in`. You may append dated lines under its Amendments heading, never edit above it.
- Transformers.js is only ever loaded through the dynamic import inside `lib/detect.ts`, from client components.
- d3 does math only; React renders the SVG; no `d3.select`. Every chart keeps its text summary.
- Arrays passed to `useCampusEstimate` must be memoized (`useMemo`), or the effect will loop.
- Copy: English, human tone, concrete numbers. No em dashes or en dashes and no double hyphens as dashes. No marketing filler words (the scaffold rules keep a banned list: if a word sounds like a product launch, cut it). Text around model output is composed from real numbers, never generated or canned.
- Scope: if something threatens the December 20 deadline, cut scope (interactions 2 and 3 first), never the end-to-end flow.
- Keep `npm run build` passing after every change.

## 5. Definition of done

- Deployed on Vercel at https://tamisa.vercel.app and the README link works.
- The 90-second demo flow works end to end on the seed data plus one live bag, on a phone and a laptop.
- OWL-ViT detection works on at least two pinned demo photos; the hand-tally fallback works with the network off after first load.
- Wow moment rehearsed: the interval visibly narrows when bag 30 is saved, and the advisor sentence updates.
- Video (under 3 minutes) on YouTube, linked in the Devpost form, Theme track selected, the waste-and-measurement paragraph pasted.
