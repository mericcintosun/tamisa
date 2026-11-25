import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ReportView } from "@/components/report-view";
import { getAdapter } from "@/lib/adapter";
import { BOOT_ITERATIONS, BOOT_SEED } from "@/lib/data";
import { runBootstrap } from "@/lib/stats";

export async function generateStaticParams() {
  const sessions = await getAdapter().listSessions();
  return sessions.map((s) => ({ id: s.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const bundle = await getAdapter().getSession(id);
  return { title: bundle ? `${bundle.session.title} report` : "Audit report" };
}

export default async function ResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const bundle = await getAdapter().getSession(id);
  if (!bundle) notFound();
  const { session, bags, buildings } = bundle;

  const initialEstimate = runBootstrap({ bags, buildings, iterations: BOOT_ITERATIONS, seed: BOOT_SEED });

  return <ReportView session={session} seedBags={bags} buildings={buildings} initialEstimate={initialEstimate} />;
}
