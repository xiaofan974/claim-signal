export function PageSkeleton() {
  return <div className="animate-pulse space-y-5" data-testid="loading-page">
    <div className="h-8 w-48 rounded bg-muted" /><div className="h-4 w-80 rounded bg-muted" />
    <div className="grid gap-4 sm:grid-cols-3"><div className="h-28 rounded-xl bg-muted" /><div className="h-28 rounded-xl bg-muted" /><div className="h-28 rounded-xl bg-muted" /></div>
    <div className="h-72 rounded-xl bg-muted" />
  </div>;
}
export function InlineSkeleton({ rows = 4 }: { rows?: number }) {
  return <div className="animate-pulse space-y-3" data-testid="loading-list">{Array.from({ length: rows }).map((_, i) => <div key={i} className="h-14 rounded-lg bg-muted" />)}</div>;
}
export function DataProblem({ title = 'Signal feed unavailable', detail = 'We could not reach the claims data source. Try again in a moment.' , onRetry }: { title?: string; detail?: string; onRetry?: () => void }) {
  return <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-8 text-center" data-testid="status-data-error">
    <div className="mx-auto mb-3 grid size-10 place-items-center rounded-full bg-amber-100 text-amber-700">!</div>
    <h3 className="font-semibold text-amber-950">{title}</h3><p className="mx-auto mt-1 max-w-md text-sm text-amber-900/70">{detail}</p>
    {onRetry && <button type="button" onClick={onRetry} className="mt-4 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900 hover:bg-amber-100" data-testid="button-retry">Try again</button>}
  </div>;
}
export function EmptyState({ title, detail }: { title: string; detail: string }) {
  return <div className="rounded-xl border border-dashed border-border bg-card/50 p-12 text-center" data-testid="status-empty"><div className="mx-auto mb-3 size-2 rounded-full bg-primary/40" /><h3 className="font-semibold">{title}</h3><p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">{detail}</p></div>;
}