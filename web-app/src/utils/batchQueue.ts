/**
 * Batches high-frequency callbacks onto animation frames to reduce React churn.
 */
export class MessageBatchQueue<T> {
  private buffer: T[] = [];
  private rafId: number | null = null;
  private readonly flush: (items: T[]) => void;

  constructor(flush: (items: T[]) => void) {
    this.flush = flush;
  }

  push(item: T): void {
    this.buffer.push(item);
    const hidden =
      typeof document !== "undefined" && document.visibilityState === "hidden";
    if (hidden) {
      this.flushNow();
      return;
    }
    if (this.rafId != null) return;
    this.rafId = requestAnimationFrame(() => {
      this.rafId = null;
      this.flushNow();
    });
  }

  private flushNow(): void {
    if (this.rafId != null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    const batch = this.buffer;
    this.buffer = [];
    if (batch.length) this.flush(batch);
  }

  clear(): void {
    if (this.rafId != null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.buffer = [];
  }
}
