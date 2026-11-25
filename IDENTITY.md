# IDENTITY (contract; every later phase obeys this file)

DIRECTION: D1 letterpress
GROUND: #faf6ee warm-paper
SURFACE: #f3ecdf
DEEP: #e9e0cd
LINE: #d9ceb6
INK: #221d16
ACCENT: #2d4fd1 cobalt
ON_ACCENT: #faf6ee
SECOND: #2e5c3a forest
OK: #2e7d4f
WARN: #a8641c
BAD: #b3382c
FONT_DISPLAY: F2 Newsreader (next/font/google: Newsreader)
FONT_BODY: Archivo (next/font/google: Archivo)
FONT_MONO: none
STRUCTURE: S3 guided-flow
ARCHETYPE: L5 bands
MOTION: M2 slide, prefix tamisa-
KIT: K5 dataviz
RADIUS: sharp
HEADER: solid ground, border-b in LINE, sticky
LOGO_POLICY: brand-mark

## Why

The farm assigned this identity so that no two projects share a look, a route map or an interaction style. The most recent projects it differs from: ML Empowerment Build Challenge 4.0 (250K IN PRIZES!) (D5, S4, L6, K6); PhysTech 2027: Physical Activity and Technology Hack Day (D12, S6, L3, K4); Arbitrum Open House São Paulo: Online Buildathon (D13, S1, L7, K1). It is not a suggestion. Tie the product's own nouns to it; do not swap any row for a familiar one.

## Direction: D1 letterpress

Warm paper editorial: hairline rules, ink on paper, quiet margins.

Surface treatment: 1px hairline rules instead of boxes, small-caps kickers, a drop cap or ruled pull quote, zero shadows, zero gradients.

Every hex in app/globals.css comes from the key block above. RADIUS sharp means 0 to 0.125rem on every card, panel and control. ON_ACCENT is the text color on an ACCENT fill. The semantic colors (OK, WARN, BAD) mark state only, never brand.

## Structure: S3 guided-flow

The core loop is a 3 to 5 step guided flow; each step is its own URL.

Route map (name the bracketed parts with the product's own words):
- `/` : the start screen, with the claim and step 1 embedded or one tap away
- `/<flow>/[step]` : one route per step, named from the domain (for example `/check/route`, `/check/fare`)
- `/result/[id]` : the outcome as a summary page with a share control
- `/about` : method and sponsor tech

Rules:
- a persistent progress indicator shows the steps and the current one
- browser back and forward move between steps without losing input (state in the URL or sessionStorage)
- each step asks for one thing and shows a live preview of the outcome so far

## Archetype: L5 bands (the composition of the home route)

Stacked full-width horizontal bands alternating ground and surface colors, each band one sentence plus one artifact (figure, live frame, or control).

MUSTs: at least 4 bands; bands alternate surface color from the IDENTITY ramp; one band is the CTA band.
Bans: columns inside a band at lg; cards inside bands.

## Motion: M2 slide (the entrance signature)

translateX(-24px) to 0 plus fade, cubic-bezier(0.19, 1, 0.22, 1), 550ms. One keyframe block implements it; every keyframe name starts with `tamisa-`. A `prefers-reduced-motion: reduce` block disables it.

## Interaction kit: K5 dataviz

D3 for the math, React for the SVG, Motion for the transitions: data as the main visual.

Packages for package.json dependencies: "d3": "^7.9.2", "motion": "^14.14.0". devDependencies: "@types/d3": "^7.4.3".

The interval chart uses a local linear scale and a rAF tween (no d3 / Motion import), so it builds without those packages installed.

Signature interactions (the scaffold ships the first; all three exist by the end of the frontend phase):
1. a hero chart drawn in SVG from the real seed with d3 scales and shapes, entering by line draw (`pathLength`) or bar growth
2. a brush, scrubber or hover crosshair that rewrites a sentence on the page ("on <date> the value was <n>")
3. an animated switch between two views of the same data (for example per day and cumulative) with interpolated shapes

Rules:
- d3 does math only (scale, shape, array); React renders the SVG; never `d3.select` DOM mutation
- every chart has a text summary for screen readers
- add the packages above to package.json `dependencies` (and `devDependencies` where listed) with exactly these ranges; the runner installs them
- every import of a kit package lives in a component that starts with `"use client"`
- server HTML must be readable with JavaScript off: never server-render content at opacity 0 or off screen; animate from the visible state or on interaction
- honor `prefers-reduced-motion: reduce`: the content and every control stay usable with motion off
- every interaction is driven by the real seed data; a decorative animation with no product meaning does not count as a signature

## Amendments (append-only; later phases add dated lines here, never edit anything above)

- 2026-11-25 (Phase 1): `lib/brand-tokens.ts` mirrors the key-block hexes as named constants for `app/opengraph-image.tsx` only (Satori cannot read CSS variables). `app/icon.svg` keeps its key-block hex literals because a favicon has no stylesheet.
