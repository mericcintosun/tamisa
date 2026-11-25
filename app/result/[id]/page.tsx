import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ReportView } from "@/components/report-view";
import { BOOT_ITERATIONS, BOOT_SEED, BUILDINGS, SEED_BAGS, SESSIONS } from "@/lib/data";
import { runBootstrap } from "@/lib/stats";

export function generateStaticParams() {
  return SESSIONS.map((s) => ({ id: s.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const session = SESSIONS.find((s) => s.id === id);
  return { title: session ? `${session.title} report` : "Audit report" };
}

export default async function ResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = SESSIONS.find((s) => s.id === id);
  if (!session) notFound();

  const seedBags = SEED_BAGS.filter((b) => b.sessionId === session.id);
  const initialEstimate = runBootstrap({ bags: seedBags, buildings: BUILDINGS, iterations: BOOT_ITERATIONS, seed: BOOT_SEED });

  return <ReportView session={session} seedBags={seedBags} initialEstimate={initialEstimate} />;
}
