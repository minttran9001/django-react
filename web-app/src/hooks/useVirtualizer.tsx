"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type TUseVirtualizerProps = {
  getScrollElement: () => HTMLElement | null;
  estimateSize: (index: number) => number;
  overscan?: number;
  getItemKey?: (index: number) => string | number;
  count: number;
};

export type VirtualItem = {
  index: number;
  key: string | number;
  start: number;
  size: number;
  end: number;
};

function toMeasuredKey(key: string | number) {
  return String(key);
}

export default function useVirtualizer({
  getScrollElement,
  estimateSize,
  overscan = 5,
  getItemKey = (i) => i,
  count,
}: TUseVirtualizerProps) {
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [measured, setMeasured] = useState<Record<string, number>>({});

  const getSize = useCallback(
    (index: number) =>
      measured[toMeasuredKey(getItemKey(index))] ?? estimateSize(index),
    [measured, estimateSize, getItemKey],
  );

  const { offsets, ghostHeight } = useMemo(() => {
    const nextOffsets = new Array<number>(count + 1);
    nextOffsets[0] = 0;
    for (let i = 0; i < count; i++) {
      nextOffsets[i + 1] = nextOffsets[i] + getSize(i);
    }
    return { offsets: nextOffsets, ghostHeight: nextOffsets[count] ?? 0 };
  }, [count, getSize]);

  const findStartIndex = useCallback(
    (top: number) => {
      if (count === 0) return 0;
      let lo = 0;
      let hi = count - 1;
      while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        if (offsets[mid + 1] <= top) lo = mid + 1;
        else hi = mid - 1;
      }
      return Math.min(lo, Math.max(0, count - 1));
    },
    [count, offsets],
  );

  const getOffsetForIndex = useCallback(
    (index: number) => {
      if (index < 0 || index >= count) return 0;
      return offsets[index] ?? 0;
    },
    [count, offsets],
  );

  const findIndexByKey = useCallback(
    (key: string | number) => {
      const target = toMeasuredKey(key);
      for (let i = 0; i < count; i++) {
        if (toMeasuredKey(getItemKey(i)) === target) return i;
      }
      return -1;
    },
    [count, getItemKey],
  );

  const virtualItems = useMemo((): VirtualItem[] => {
    if (count === 0) return [];

    // Before first measure, assume a reasonable viewport so first paint isn't empty.
    const viewHeight = viewportHeight || 400;
    const startIndex = Math.max(0, findStartIndex(scrollTop) - overscan);
    let endIndex = startIndex;
    const bottom = scrollTop + viewHeight;

    while (endIndex < count && offsets[endIndex] < bottom) {
      endIndex++;
    }
    endIndex = Math.min(count - 1, endIndex + overscan);

    const items: VirtualItem[] = [];
    for (let i = startIndex; i <= endIndex; i++) {
      const size = getSize(i);
      const start = offsets[i];
      items.push({
        index: i,
        key: getItemKey(i),
        start,
        size,
        end: start + size,
      });
    }
    return items;
  }, [
    count,
    scrollTop,
    viewportHeight,
    overscan,
    offsets,
    getSize,
    getItemKey,
    findStartIndex,
  ]);

  useEffect(() => {
    const el = getScrollElement();
    if (!el) return;

    const onScroll = () => setScrollTop(el.scrollTop);
    const onResize = () => setViewportHeight(el.clientHeight);

    onScroll();
    onResize();
    el.addEventListener("scroll", onScroll, { passive: true });
    const ro = new ResizeObserver(onResize);
    ro.observe(el);

    return () => {
      el.removeEventListener("scroll", onScroll);
      ro.disconnect();
    };
  }, [getScrollElement, count]);

  const measureElement = useCallback((node: HTMLElement | null) => {
    if (!node) return;
    const key = node.dataset.key;
    if (key == null || key === "") return;
    const height = node.getBoundingClientRect().height;
    if (height <= 0) return;
    setMeasured((prev) =>
      prev[key] === height ? prev : { ...prev, [key]: height },
    );
  }, []);

  const scrollToIndex = useCallback(
    (index: number, opts?: { align?: "start" | "end" | "center" }) => {
      const el = getScrollElement();
      if (!el || index < 0 || index >= count) return;
      const start = offsets[index];
      const size = getSize(index);
      const align = opts?.align ?? "start";
      let top = start;
      if (align === "end") {
        // Prefer true bottom when targeting the last item.
        top =
          index === count - 1
            ? ghostHeight - el.clientHeight
            : start + size - el.clientHeight;
      }
      if (align === "center") top = start - el.clientHeight / 2 + size / 2;
      el.scrollTop = Math.max(0, top);
      setScrollTop(el.scrollTop);
    },
    [getScrollElement, count, offsets, getSize, ghostHeight],
  );

  const scrollToOffset = useCallback(
    (offset: number) => {
      const el = getScrollElement();
      if (!el) return;
      el.scrollTop = Math.max(0, offset);
      setScrollTop(el.scrollTop);
    },
    [getScrollElement],
  );

  const translateY = useMemo(() => {
    const startIndex = Math.max(0, findStartIndex(scrollTop) - overscan);
    return offsets[startIndex];
  }, [scrollTop, offsets, findStartIndex, overscan]);

  return {
    virtualItems,
    ghostHeight,
    measureElement,
    scrollToIndex,
    scrollToOffset,
    getOffsetForIndex,
    findIndexByKey,
    findStartIndex,
    translateY,
  };
}
