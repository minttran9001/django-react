export function CourtCenterDetailsSkeleton() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="h-4 w-32 animate-pulse rounded bg-muted" />
        <div className="h-8 w-24 animate-pulse rounded-lg bg-muted" />
      </div>

      <div className="space-y-3">
        <div className="aspect-[16/10] animate-pulse rounded-xl bg-muted" />
        <div className="flex gap-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="aspect-[4/3] w-20 animate-pulse rounded-lg bg-muted sm:w-24"
            />
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <div className="h-9 w-2/3 animate-pulse rounded bg-muted" />
        <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
        <div className="flex gap-2">
          <div className="h-7 w-20 animate-pulse rounded-full bg-muted" />
          <div className="h-7 w-24 animate-pulse rounded-full bg-muted" />
        </div>
      </div>

      <div className="space-y-3 rounded-xl border bg-card p-6 ring-1 ring-foreground/10">
        <div className="h-5 w-24 animate-pulse rounded bg-muted" />
        <div className="space-y-2">
          <div className="h-4 w-full animate-pulse rounded bg-muted" />
          <div className="h-4 w-full animate-pulse rounded bg-muted" />
          <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
        </div>
      </div>

      <div className="space-y-3 rounded-xl border bg-card p-6 ring-1 ring-foreground/10">
        <div className="h-5 w-20 animate-pulse rounded bg-muted" />
        <div className="aspect-[16/7] animate-pulse rounded-xl bg-muted" />
      </div>

      <div className="space-y-4">
        <div className="h-6 w-20 animate-pulse rounded bg-muted" />
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 2 }).map((_, index) => (
            <div
              key={index}
              className="overflow-hidden rounded-xl ring-1 ring-foreground/10"
            >
              <div className="aspect-[16/10] animate-pulse bg-muted" />
              <div className="space-y-2 p-4">
                <div className="h-5 w-1/2 animate-pulse rounded bg-muted" />
                <div className="h-4 w-full animate-pulse rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
