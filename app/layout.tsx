import type { Metadata } from "next";
import { Archivo, Newsreader } from "next/font/google";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

const newsreader = Newsreader({
  subsets: ["latin"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-newsreader",
});

const archivo = Archivo({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-archivo",
});

export const metadata: Metadata = {
  title: {
    default: "Tamisa: campus waste audits with error bars",
    template: "%s · Tamisa",
  },
  description:
    "Tamisa counts contaminants in a tarp photo right in the browser, combines them with the scale weights, and reports your campus recovery and contamination rates with a 95% interval, plus how many more bags you need to sort.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${newsreader.variable} ${archivo.variable}`}>
      <body className="min-h-screen antialiased">
        <SiteHeader />
        <main>{children}</main>
        <footer className="border-t border-border">
          <div className="mx-auto flex max-w-5xl flex-wrap items-baseline justify-between gap-3 px-5 py-8 text-sm text-muted-foreground">
            <p>Tamisa runs in your browser. Photos and bag records never leave the device.</p>
            <p>
              <Link href="/about" className="underline decoration-1 underline-offset-4 hover:text-foreground">
                How the estimate works
              </Link>
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
