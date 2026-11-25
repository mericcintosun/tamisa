import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getAdapter } from "@/lib/adapter";
import { BOOT_ITERATIONS, CONTAMINANTS, DETECTION_THRESHOLD, MODEL_ID, SESSION } from "@/lib/data";

export const metadata: Metadata = {
  title: "Method",
  description: "How Tamisa detects contaminants, estimates the campus rate with a stratified bootstrap and plans the next audit with Neyman allocation.",
};

const sections = (bagCount: number, buildingCount: number) => [
  {
    kicker: "Detection",
    summary: `${MODEL_ID} finds contaminants from plain-text prompts, on the device.`,
    body: [
      `OWL-ViT is an open-vocabulary detector: instead of a fixed label list, it takes text prompts. Tamisa asks for ${CONTAMINANTS.map((c) => `"${c.prompt}"`).join(", ")}. The model runs through Transformers.js in WebAssembly, so the photo never leaves the phone and there is no API key anywhere.`,
      `Boxes scoring under ${DETECTION_THRESHOLD} are dropped, then overlapping boxes with the same label are merged. The floor is low on purpose: deleting a wrong box takes one tap, drawing a missed one does not exist. Whatever the volunteer keeps is the count, and the bag record notes whether OWL-ViT or a hand count produced it.`,
    ],
  },
  {
    kicker: "Estimate",
    summary: `A ${BOOT_ITERATIONS}-draw stratified bootstrap, buildings as strata, run in a Web Worker.`,
    body: [
      "Contamination is the weight that does not belong in a recycling or organics bin, divided by everything found in it. Each building is a stratum, weighted by its number of bin stations, because a building with 54 stations shapes the campus rate more than one with 18.",
      `Tamisa resamples bags with replacement inside each building ${BOOT_ITERATIONS} times, recomputes the weighted campus ratio each time, and reports the 2.5th and 97.5th percentiles. The random generator is seeded, so the same bags always give the same interval. A building with a single bag is flagged: its interval is not meaningful yet.`,
    ],
  },
  {
    kicker: "Advisor",
    summary: "Neyman allocation says where the next bags buy the most precision.",
    body: [
      "Given a target margin, say ±3 points, Tamisa computes the total sample size that gets there and splits it across buildings in proportion to bin stations times the spread of per-bag contamination. Buildings that are both large and inconsistent get the most extra bags.",
      "It is a planning approximation (it treats per-bag rates as the unit), which is exactly what a volunteer coordinator needs at 11 a.m. with half the bags still sealed.",
    ],
  },
  {
    kicker: "The demo data",
    summary: `The seeded audit has ${bagCount} bags across ${buildingCount} fictional buildings, sized like a real campus audit.`,
    body: [
      "Toronto Metropolitan University's 2025 waste audit sorted 27 garbage and 11 organics samples and published a single 35.64% recovery figure, with no margin of error that we could find. The Northgate session in this app is synthetic, built to that scale so the uncertainty you see is the uncertainty a real audit carries. Bags you log yourself are real and stay in your browser's storage.",
    ],
  },
];

export default async function AboutPage() {
  const bundle = await getAdapter().getSession(SESSION.id);
  const SECTIONS = sections(bundle?.bags.length ?? 0, bundle?.buildings.length ?? 0);
  return (
    <article className="mx-auto max-w-5xl px-5 pb-20 pt-12">
      <p className="kicker">Method and tech</p>
      <h1 className="mt-2 max-w-[20ch] text-5xl leading-[1.05] sm:text-6xl">A waste audit is a sample. Tamisa treats it like one.</h1>
      <p className="dropcap mt-8 max-w-[66ch] text-lg leading-relaxed">
        Once a year a sustainability team dumps a few dozen bags onto tarps, sorts them by hand, and writes one number into a report. That number decides where
        new bins go and whether the last poster campaign worked. Tamisa keeps the same day of sorting, and adds the part the spreadsheet leaves out: how far
        the number could move with different bags, and where to sort next to pin it down.
      </p>

      <div className="mt-14 border-t border-foreground">
        {SECTIONS.map((s) => (
          <details key={s.kicker} className="group border-b border-border py-5">
            <summary className="flex cursor-pointer list-none flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-6">
              <span className="kicker w-40 shrink-0">{s.kicker}</span>
              <span className="font-display text-2xl leading-snug group-open:text-primary">{s.summary}</span>
            </summary>
            <div className="mt-4 space-y-4 sm:pl-46">
              {s.body.map((p) => (
                <p key={p.slice(0, 24)} className="max-w-[66ch] leading-relaxed">
                  {p}
                </p>
              ))}
            </div>
          </details>
        ))}
      </div>

      <section className="mt-14">
        <h2 className="text-3xl">What runs where</h2>
        <ul className="mt-4 max-w-[66ch] border-t border-foreground text-base">
          <li className="border-b border-border py-2">Next.js 15 App Router on Vercel, with read-only seed routes under /api and no database.</li>
          <li className="border-b border-border py-2">@huggingface/transformers in the browser for OWL-ViT detection.</li>
          <li className="border-b border-border py-2">A Web Worker for the bootstrap, with a main-thread fallback.</li>
          <li className="border-b border-border py-2">d3 scales and Motion transitions for the interval charts.</li>
          <li className="border-b border-border py-2">sessionStorage for the bag in progress, localStorage for saved bags, CSV export for the spreadsheet people.</li>
        </ul>
      </section>

      <div className="mt-12">
        <Button asChild variant="outline">
          <Link href="/audit/bin">Try it on the next bag</Link>
        </Button>
      </div>
    </article>
  );
}
