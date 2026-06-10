export default function Loading() {
  return (
    <div
      aria-hidden
      className="fixed inset-x-0 top-16 z-40 h-0.5 overflow-hidden bg-primary/10"
    >
      <div className="h-full w-1/3 animate-pulse bg-primary" />
    </div>
  );
}
