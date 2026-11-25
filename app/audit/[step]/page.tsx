import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AuditFlow } from "@/components/audit-flow";
import { BOOT_ITERATIONS, BOOT_SEED, BUILDINGS, FLOW_STEPS, SEED_BAGS, isFlowStep } from "@/lib/data";
import { runBootstrap } from "@/lib/stats";

export function generateStaticParams() {
  return FLOW_STEPS.map((s) => ({ step: s.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ step: string }> }): Promise<Metadata> {
  const { step } = await params;
  const found = FLOW_STEPS.find((s) => s.id === step);
  return { title: found ? `Log a bag: ${found.label}` : "Log a bag" };
}

export default async function AuditStepPage({ params }: { params: Promise<{ step: string }> }) {
  const { step } = await params;
  if (!isFlowStep(step)) notFound();

  // First paint uses the seeded audit; the client worker takes over from there.
  const initialEstimate = runBootstrap({ bags: SEED_BAGS, buildings: BUILDINGS, iterations: BOOT_ITERATIONS, seed: BOOT_SEED });

  return <AuditFlow step={step} initialEstimate={initialEstimate} />;
}
