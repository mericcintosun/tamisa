import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { IntervalChart } from "@/components/interval-chart";
import { SceneSlot } from "@/components/scene-slot";
import { Button } from "@/components/ui/button";
import { getAdapter } from "@/lib/adapter";
import { BOOT_ITERATIONS, BOOT_SEED, SESSION as DEFAULT_SESSION } from "@/lib/data";
import { fmt, neymanPlan, planSentence, runBootstrap } from "@/lib/stats";

export const metadata: Metadata = {
  title: "Start",
};

// L5 bands: full-width horizontal bands alternating ground and surface, each one
// sentence plus one artifact. No columns inside a band, no cards.
export default async function Home() {
  const bundle = await getAdapter().getSession(DEFAULT_SESSION.id);
  if (!bundle) notFound();
  const { session, bags, buildings } = bundle;

  const estimate = runBootstrap({ bags, buildings, iterations: BOOT_ITERATIONS, seed: BOOT_SEED });
  const c = estimate.contamination;
  const plan = neymanPlan(bags, session.targetHalfWidth, buildings);
  const dirtiest = [...c.rows].sort((a, b) => b.point - a.point)[0];

  return (
    <div className="tamisa-bands">
      <section className="bg-background">
        <div className="mx-auto max-w-5xl px-5 py-16 sm:py-20">
          <div className="tamisa-enter">
            <p className="kicker">For campus waste audits</p>
            <h1 className="mt-2 max-w-[18ch] text-5xl leading-[1.04] sm:text-7xl">
              Every bag you sort <em>narrows</em> the answer.
            </h1>
            <p className="mt-6 max-w-[62ch] text-lg">
              Tamisa counts the contaminants in a tarp photo right in your browser, adds the scale weights, and tells you the campus contamination rate with an
              honest margin of error, plus which buildings need more bags.
            </p>
          </div>
          <SceneSlot
            n={1}
            alt="Student volunteers in gloves kneeling around a canvas tarp with a dumped recycling bag, sorting cans, paper and plastic film into piles beside a hanging scale"
            width={1200}
            height={600}
            className="mt-12 border border-foreground"
          />
        </div>
      </section>

      <section className="bg-surface">
        <div className="mx-auto max-w-5xl px-5 py-16">
          <div className="tamisa-enter">
            <p className="kicker">
              {session.campus}, {bags.length} bags so far
            </p>
            <h2 className="mt-2 max-w-[30ch] text-4xl leading-tight sm:text-5xl">
              Recycling bins here are {fmt(c.point, 0)}% contaminated, give or take {fmt(c.halfWidth)} points.
            </h2>
          </div>
          <IntervalChart
            className="mt-10"
            estimate={c}
            highlightId={dirtiest?.id}
            caption={`Share of recycling and organics bin weight that does not belong there, by building. Whiskers are 95% intervals from ${BOOT_ITERATIONS} stratified bootstrap draws, weighted by each building's bin stations. ${dirtiest ? `${dirtiest.label} is the dirtiest at ${fmt(dirtiest.point, 0)}%.` : ""}`}
          />
        </div>
      </section>

      <section className="bg-background">
        <div className="mx-auto max-w-5xl px-5 py-16">
          <h2 className="tamisa-enter max-w-[30ch] text-4xl leading-tight sm:text-5xl">
            Shoot the tarp, and OWL-ViT boxes every plastic bag, foam cup and greasy pizza box without the photo leaving the phone.
          </h2>
          <SceneSlot
            n={2}
            alt="Top-down photo of a sorted tarp with thin blue rectangles drawn around a plastic bag, two foam cups and a greasy pizza box among clean cardboard and cans"
            width={1200}
            height={800}
            className="mt-10 border border-foreground"
          />
        </div>
      </section>

      <section className="bg-surface">
        <div className="mx-auto max-w-5xl px-5 py-16">
          <p className="kicker tamisa-enter">Sampling advisor</p>
          <h2 className="tamisa-enter mt-2 max-w-[32ch] text-4xl leading-tight sm:text-5xl">{planSentence(plan)}</h2>
          <ol className="mt-10 max-w-2xl border-t border-foreground">
            {plan.rows.map((r) => (
              <li key={r.id} className="flex items-baseline justify-between gap-4 border-b border-border py-3">
                <span className="font-display text-xl">{r.label}</span>
                <span className="text-sm tabular-nums text-muted-foreground">
                  {r.current} sorted of {r.recommended} needed
                  {r.extra > 0 ? <strong className="ml-2 text-primary">+{r.extra}</strong> : <span className="ml-2 text-ok">enough</span>}
                </span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="border-t border-foreground bg-deep">
        <div className="mx-auto max-w-5xl px-5 py-20">
          <h2 className="tamisa-enter max-w-[24ch] text-4xl leading-tight sm:text-5xl">Bag {bags.length + 1} is on the tarp. Log it and watch the margin move.</h2>
          <div className="mt-8 flex flex-wrap items-center gap-6">
            <Button asChild size="lg">
              <Link href="/audit/bin">Log the next bag</Link>
            </Button>
            <Link href={`/result/${session.id}`} className="text-sm underline decoration-1 underline-offset-4">
              or read the report so far
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
