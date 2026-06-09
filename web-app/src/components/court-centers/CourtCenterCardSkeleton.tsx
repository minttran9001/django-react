export function CourtCenterCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
      <div className="aspect-[16/10] animate-pulse bg-muted" />
      <div className="space-y-3 p-4">
        <div className="h-5 w-2/3 animate-pulse rounded bg-muted" />
        <div className="h-4 w-full animate-pulse rounded bg-muted" />
        <div className="h-4 w-4/5 animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}
