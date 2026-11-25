# DEMO: Tamisa

**Problem:** Campus audits turn 27 bags into one number. How much should you trust it?

**Trigger:** a volunteer logs bag 30 from the Marlow Library recycling bin.

**Wow moment:** a tarp photo gets contaminant boxes without anything leaving the browser, and when bag 30 is saved the campus contamination interval visibly narrows and the advisor says how many more bags are enough.

**Demo start route:** `/` (`app/page.tsx`).

## Steps

1. `/` (`app/page.tsx`): the seeded chart reads about 29 bags, with the campus contamination rate and its 95% margin.
2. `/audit/bin` (`app/audit/[step]/page.tsx`): pick Marlow Library and the recycling bin.
3. `/audit/tarp` (`app/audit/[step]/page.tsx`): upload a tarp photo or use the sample, boxes drop, one wrong box is tapped away.
4. `/audit/weights` (`app/audit/[step]/page.tsx`): kilograms per category.
5. `/audit/estimate` (`app/audit/[step]/page.tsx`): the before and after margin, save, the Neyman advisor sentence.
6. `/result/northgate-fall-2026` (`app/result/[id]/page.tsx`): rate, interval, dirtiest building, top contaminant, next audit plan, print and CSV.

## 90-second timing

- 0 to 15 s: "Campus audits turn 27 bags into one number. How much should you trust it?" Home page, chart at about ±several points.
- 15 to 40 s: bag 30, library recycling bin, tarp photo, boxes drop on bags and foam cups, one wrong box tapped away, weights entered.
- 40 to 60 s: estimate step, the margin narrows, the library bar stands out.
- 60 to 75 s: advisor sentence, slider from ±5 to ±3, counts grow.
- 75 to 90 s: report page: rate, interval, dirtiest building, top contaminant, next audit plan.
- Close: "Next time a sign campaign works, you will know it was not luck."

The builder records the video on the live Vercel site, not localhost.
