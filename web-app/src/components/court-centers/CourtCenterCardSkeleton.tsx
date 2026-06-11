export function CourtCenterCardSkeleton() {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl ring-1 ring-foreground/10">
      <div className="aspect-[16/10] animate-pulse bg-muted" />
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="h-5 w-2/3 animate-pulse rounded bg-muted" />
        <div className="h-10 w-full animate-pulse rounded bg-muted" />
        <div className="h-10 w-full animate-pulse rounded bg-muted" />
        <div className="mt-auto h-7 w-1/2 animate-pulse rounded-full bg-muted" />
      </div>
    </div>
  );
}
