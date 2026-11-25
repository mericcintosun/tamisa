import { ImageResponse } from "next/og";

export const alt = "Tamisa: campus waste audits with error bars";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Colors are IDENTITY.md key-block values (ground, ink, cobalt, line, deep).
export default function OpengraphImage() {
  const rows = [
    { label: "Whole campus", w: 380, lo: 300, hi: 470 },
    { label: "Marlow Library", w: 470, lo: 330, hi: 620 },
    { label: "Cedar Dining Hall", w: 330, lo: 230, hi: 440 },
    { label: "Okafor Science Centre", w: 190, lo: 140, hi: 250 },
  ];
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#faf6ee", color: "#221d16", padding: "64px 72px" }}>
        <div style={{ display: "flex", fontSize: 28, letterSpacing: 4, color: "#2d4fd1" }}>TAMISA</div>
        <div style={{ display: "flex", fontSize: 64, lineHeight: 1.08, marginTop: 18, maxWidth: 980, fontFamily: "Georgia, serif" }}>
          Every bag you sort narrows the answer.
        </div>
        <div style={{ display: "flex", fontSize: 26, marginTop: 18, maxWidth: 980, color: "#221d16" }}>
          Contaminants counted from a tarp photo in the browser, campus rate with a 95% interval, and how many more bags to sort.
        </div>
        <div style={{ display: "flex", flexDirection: "column", marginTop: 40, borderTop: "2px solid #221d16" }}>
          {rows.map((r) => (
            <div key={r.label} style={{ display: "flex", alignItems: "center", height: 44, borderBottom: "1px solid #d9ceb6", position: "relative" }}>
              <div style={{ display: "flex", width: 300, fontSize: 20 }}>{r.label}</div>
              <div style={{ display: "flex", width: r.w, height: 12, background: r.label === "Whole campus" ? "#2d4fd1" : "#e9e0cd" }} />
              <div style={{ position: "absolute", left: 300 + r.lo, width: r.hi - r.lo, top: 21, height: 2, background: "#221d16", display: "flex" }} />
            </div>
          ))}
        </div>
      </div>
    ),
    size
  );
}
