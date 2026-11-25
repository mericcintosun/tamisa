# Tamisa

**Campus waste audits with error bars.** Tamisa counts the contaminants in a tarp photo right in the browser, combines them with the scale weights, and reports your campus recovery and contamination rates with a 95% interval, plus how many more bags you need to sort and where.

> Live demo: https://tamisa.vercel.app

Track: Theme, Rethinking Waste.

## The problem

Once a year a university sustainability team dumps a few dozen garbage and recycling bags onto tarps, sorts them by hand, and publishes a single number. Toronto Metropolitan University's 2025 audit sorted 27 garbage and 11 organics samples and reported a 35.64% recovery rate. We could not find a margin of error anywhere in the report.

That matters. With 27 bags, the true rate could easily sit several points either side. Volunteers tally pieces on paper, nobody knows which building needed more samples, and next year's "improvement" after a new poster campaign could be real or could be luck. Bin placement and signage budgets get decided on that noise.

## What Tamisa does

Every bag is one record: building (the stratum), stream (recycling, organics or landfill), category weights from the scale, and a photo of the tarp.

1. **Bin.** Pick the building and the bin the bag came from.
2. **Tarp photo.** OWL-ViT, running in the browser through Transformers.js, gets text prompts like "a plastic bag", "food waste", "a styrofoam cup" and "a greasy pizza box" and draws a box on each hit. A wrong box disappears with one tap. The kept boxes are the counts.
3. **Scale.** Enter the kilograms per category. Tamisa shows this bag's contamination as you type.
4. **Estimate.** A Web Worker runs a 2000-draw stratified bootstrap, buildings weighted by bin stations, and returns campus contamination and recovery with 95% intervals. The chart shows the margin before and after this bag. A Neyman allocation advisor then writes the plan as a sentence (of the form "to reach ±3 points, sort N more bags from Marlow Library and M from Cedar Dining Hall", with the numbers computed from the bags on file), and a slider moves the target.

At the end of the day the report page has the rate, the interval, the dirtiest building, the most common contaminant and the plan for the next audit, printable and exportable to CSV.

## The waste problem we target, and how we measure success

Contaminated recycling gets landfilled at the sorting facility, so the contamination rate of campus bins is the number that decides whether recycling happens at all. Tamisa turns a one-day audit into a measurement with a known precision: success for a campus is a contamination interval this semester that sits clearly below last semester's, and success for the tool is an audit that reaches its target margin (±3 points by default) with the fewest extra bags.

## How it uses ML

- **Model:** `Xenova/owlvit-base-patch32` through `@huggingface/transformers`, `zero-shot-object-detection` pipeline, loaded with a dynamic import in a client component (`lib/detect.ts`).
- **No key, no server:** the weights download once from the public Hugging Face hub and the browser caches them. Photos never leave the device.
- **Care around the model:** a low score floor (0.1), per-label non-maximum suppression, and human correction before anything is counted. If the model cannot load, the same tally is filled by hand and the bag record says `counted_by: manual`.
- **Statistics:** stratified bootstrap of a ratio estimator and Neyman allocation (`lib/stats.ts`), run in a Web Worker (`lib/bootstrap.worker.ts`).

## Tech stack

Next.js 15 (App Router), React 19, TypeScript strict, Tailwind CSS v4, shadcn-style primitives, Transformers.js 3, d3 7 (scales only) and Motion for the interval charts, a Web Worker, sessionStorage and localStorage, CSV export. Deployed on Vercel with no database; server pages and three read-only `/api` routes read the seeded audit through one adapter (`lib/adapter.ts`).

## Quickstart

```bash
npm install
npm run dev
# open http://localhost:3000
```

No secret is needed. `ADAPTER_MODE=fake` (the default, see `.env.example`) serves the seeded audit from `fixtures/northgate-fall-2026.json`; `npm run seed` rewrites its CSV copy. The first "Find contaminants" click downloads the OWL-ViT weights (allow a minute on a slow connection); after that it is cached.

## About the demo data

The seeded "Northgate fall waste audit" has 29 bags across 5 buildings. Northgate University is fictional and the bags are synthetic, built to the scale of the TMU 2025 audit so the uncertainty on screen matches what a real audit carries. Every bag you log in the app is real and stays in your browser.

## What we would build next

- Pair two audits (spring vs fall) and test whether the contamination drop is larger than the combined margin.
- Fine-tune the prompt set and threshold on a few hundred real tarp photos from partner campuses.
- A shared session over a tiny sync backend, so five volunteers on five phones feed one estimate.
- Offline install as a PWA with the model weights precached before audit day.

## AI use

We used AI coding assistants for scaffolding and boilerplate. Architecture, product decisions, and final code review are our own.
