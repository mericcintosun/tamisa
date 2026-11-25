"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandMark } from "@/components/brand-mark";
import { SESSION } from "@/lib/data";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Start", match: (p: string) => p === "/" },
  { href: "/audit/bin", label: "Log a bag", match: (p: string) => p.startsWith("/audit") },
  { href: `/result/${SESSION.id}`, label: "Report", match: (p: string) => p.startsWith("/result") },
  { href: "/about", label: "Method", match: (p: string) => p.startsWith("/about") },
];

export function SiteHeader() {
  const pathname = usePathname() ?? "/";
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-3">
        <Link href="/" className="flex items-center gap-2.5">
          <BrandMark />
          <span className="font-display text-2xl leading-none">Tamisa</span>
        </Link>
        <nav aria-label="Main" className="flex items-center gap-1 text-sm sm:gap-4">
          {NAV.map((item) => {
            const active = item.match(pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "border-b px-1 py-1 transition-colors",
                  active ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:border-foreground hover:text-foreground"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
