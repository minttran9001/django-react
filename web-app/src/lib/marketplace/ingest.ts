import type { Dispatch, UnknownAction } from "@reduxjs/toolkit";
import type { MarketplaceType } from "@/lib/marketplace/typedResource";
import { unwrapDeep } from "@/lib/marketplace/typedResource";
import { addMarketplaceData } from "@/lib/slices/marketplaceData/slice";

type AppDispatch = Dispatch<UnknownAction>;

/** Ingest a `{ type, data }` envelope into marketplace, return unwrapped payload. */
export function ingestAndUnwrap<T>(dispatch: AppDispatch, raw: unknown): T {
  dispatch(addMarketplaceData(raw));
  return unwrapDeep(raw) as T;
}

/** Dexie / socket payloads that are already unwrapped. */
export function ingestTyped(
  dispatch: AppDispatch,
  type: MarketplaceType,
  data: unknown,
) {
  dispatch(addMarketplaceData({ type, data }));
}
