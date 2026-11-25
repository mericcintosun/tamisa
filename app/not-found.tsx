import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-5xl px-5 py-20">
      <div className="max-w-[60ch] border-t border-foreground pt-6">
        <p className="kicker">Not found</p>
        <h2 className="mt-2 text-4xl leading-tight">Tamisa could not find that page</h2>
        <p className="mt-4 text-lg">The address may be mistyped, or the audit it points to does not exist.</p>
        <Button asChild variant="outline" className="mt-8">
          <Link href="/">Back to the Northgate audit</Link>
        </Button>
      </div>
    </div>
  );
}
