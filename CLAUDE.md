# CLAUDE.md: Tamisa agent rules

## Commands

```bash
npm install
npm run dev
npm run build
npm run seed   # rewrites fixtures/northgate-fall-2026.csv from the JSON fixture
```

The agent never runs these; the runner does.

## Stack pitfalls

- Arrays passed to `useCampusEstimate` must be memoized with `useMemo`, or the effect loops.
- Transformers.js is loaded only via the dynamic import in `lib/detect.ts`, from `"use client"` files.
- d3 does math only (scales, shapes, arrays). React renders the SVG; never `d3.select`.
- `@/lib/data` resolves to `lib/data.ts`. The folder `lib/data/` holds only `seed.ts`. Never create `lib/data/index.ts`.
- `lib/adapter.ts` is server-only in practice: never import it from a `"use client"` file.

## Never touch

`contracts/`, `node_modules/`, `.next/`.

## Vercel guardrails

- No runtime filesystem writes in request-time code (build and seed scripts may write).
- `useSearchParams` only under `Suspense`.
- No Node-only APIs in edge paths, no custom server, no `output: export`.
- Every `process.env.X` is mirrored in `.env.example`.

## Law

IDENTITY.md is law for color, type, routes, layout and motion. Colors only through the tokens in `app/globals.css`, Newsreader on h1 and h2, sharp corners, one keyframe (`tamisa-slide-in`).

Writing rules: user-facing copy in English. Never use the em dash, the en dash or a double hyphen as a dash. Banned words: seamless, seamlessly, leverage, empower, revolutionize, streamline, game-changer, cutting-edge, delve, robust, unlock, elevate, harness, effortless, "in today's world", "it's not just X, it's Y".

when compacting preserve the list of modified files and test commands
