"use client";
/* eslint-disable react-hooks/refs */

import { useLayoutEffect, useRef } from "react";
import { useDispatch } from "react-redux";

import {
  applyQueryHydrations,
  type QueryHydrationEntry,
} from "@/lib/rtk-query/hydration";
import type { AppDispatch } from "@/lib/store";

type RtkQueryHydratorProps = {
  entries: QueryHydrationEntry[];
  children?: React.ReactNode;
};

export function RtkQueryHydrator({ entries, children }: RtkQueryHydratorProps) {
  const dispatch = useDispatch<AppDispatch>();
  const hydrated = useRef(false);

  useLayoutEffect(() => {
    if (!hydrated.current && entries.length > 0) {
      applyQueryHydrations(dispatch, entries);
      hydrated.current = true;
    }
  }, [entries, dispatch]);

  return children ?? null;
}
