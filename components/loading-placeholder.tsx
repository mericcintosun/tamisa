// Static letterpress placeholder for route loading states: a kicker, one sentence
// and three hairline rows. No pulse, no keyframe.

export function LoadingPlaceholder({ kicker }: { kicker: string }) {
  return (
    <div className="mx-auto max-w-5xl px-5 py-16" role="status" aria-live="polite">
      <p className="kicker">{kicker}</p>
      <p className="mt-2 font-display text-2xl leading-snug">Loading the Northgate audit, 29 bags</p>
      <div className="mt-8 max-w-2xl border-t border-foreground" aria-hidden>
        <div className="h-6 border-b border-border bg-muted" />
        <div className="mt-3 h-6 w-3/4 border-b border-border bg-muted" />
        <div className="mt-3 h-6 w-1/2 border-b border-border bg-muted" />
      </div>
    </div>
  );
}
