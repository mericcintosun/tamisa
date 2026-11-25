"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-5xl px-5 py-20">
      <div className="max-w-[60ch] border-t border-foreground pt-6">
        <p className="kicker">Something broke</p>
        <h2 className="mt-2 text-4xl leading-tight">Tamisa hit a snag</h2>
        <p className="mt-4 text-lg">This page could not finish loading. Your saved bags are still on this device.</p>
        <div className="mt-8 flex flex-wrap items-center gap-6">
          <Button onClick={() => reset()}>Try again</Button>
          <Link href="/" className="text-sm underline decoration-1 underline-offset-4">
            Back to the Northgate audit
          </Link>
        </div>
      </div>
    </div>
  );
}
