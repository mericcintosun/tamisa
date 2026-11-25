import { ImageResponse } from "next/og";
import { ACCENT, DEEP, GROUND, INK, LINE } from "@/lib/brand-tokens";

export const alt = "Tamisa: campus waste audits with error bars";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Colors come from lib/brand-tokens.ts, which mirrors the IDENTITY.md key block.
export default function OpengraphImage() {
  const rows = [
    { label: "Whole campus", w: 380, lo: 300, hi: 470 },
    { label: "Marlow Library", w: 470, lo: 330, hi: 620 },
    { label: "Cedar Dining Hall", w: 330, lo: 230, hi: 440 },
    { label: "Okafor Science Centre", w: 190, lo: 140, hi: 250 },
  ];
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: GROUND, color: INK, padding: "64px 72px" }}>
        <div style={{ display: "flex", fontSize: 28, letterSpacing: 4, color: ACCENT }}>TAMISA</div>
        <div style={{ display: "flex", fontSize: 64, lineHeight: 1.08, marginTop: 18, maxWidth: 980, fontFamily: "Georgia, serif" }}>
          Every bag you sort narrows the answer.
        </div>
        <div style={{ display: "flex", fontSize: 26, marginTop: 18, maxWidth: 980, color: INK }}>
          Contaminants counted from a tarp photo in the browser, campus rate with a 95% interval, and how many more bags to sort.
        </div>
        <div style={{ display: "flex", flexDirection: "column", marginTop: 40, borderTop: `2px solid ${INK}` }}>
          {rows.map((r) => (
            <div key={r.label} style={{ display: "flex", alignItems: "center", height: 44, borderBottom: `1px solid ${LINE}`, position: "relative" }}>
              <div style={{ display: "flex", width: 300, fontSize: 20 }}>{r.label}</div>
              <div style={{ display: "flex", width: r.w, height: 12, background: r.label === "Whole campus" ? ACCENT : DEEP }} />
              <div style={{ position: "absolute", left: 300 + r.lo, width: r.hi - r.lo, top: 21, height: 2, background: INK, display: "flex" }} />
            </div>
          ))}
        </div>
      </div>
    ),
    size
  );
}
