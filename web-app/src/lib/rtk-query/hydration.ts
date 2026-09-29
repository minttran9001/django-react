import type { AppDispatch } from "@/lib/store";
import { ingestTyped } from "@/lib/marketplace/ingest";
import type { CourtCenter } from "@/features/court-centers/types";

import type { RtkQueryApiId, RtkQueryEndpointName } from "./registry";
import { rtkQueryRegistry } from "./registry";

/** Erased storage shape used by collect/apply (endpoint names are checked at create time). */
export type QueryHydrationEntry = {
  apiId: RtkQueryApiId;
  endpointName: string;
  arg: unknown;
  data: unknown;
};

/**
 * Create a hydration entry with API-scoped endpoint autocomplete.
 * Pass `"conversationApi"` → second arg offers only that API's endpoints.
 */
export function createQueryHydrationEntry<ApiId extends RtkQueryApiId>(
  apiId: ApiId,
  endpointName: RtkQueryEndpointName<ApiId>,
  arg: unknown,
  data: unknown,
): QueryHydrationEntry | null {
  if (data == null) {
    return null;
  }

  return {
    apiId,
    endpointName: endpointName as string,
    arg,
    data,
  };
}

export function collectQueryHydrations(
  ...entries: Array<QueryHydrationEntry | null | undefined>
) {
  return entries.filter((entry): entry is QueryHydrationEntry => entry != null);
}

export function applyQueryHydrations(
  dispatch: AppDispatch,
  entries: QueryHydrationEntry[],
) {
  entries.forEach(({ apiId, endpointName, arg, data }) => {
    // `upsertQueryEntries` is a plain action, unlike the `upsertQueryData`
    // thunk, so the cache is populated before the caller's render continues.
    const api = rtkQueryRegistry[apiId] as unknown as {
      util: {
        upsertQueryEntries: (
          entries: Array<{
            endpointName: string;
            arg: unknown;
            value: unknown;
          }>,
        ) => Parameters<AppDispatch>[0];
      };
    };

    const cacheData = toQueryCacheData(dispatch, apiId, endpointName, data);
    dispatch(
      api.util.upsertQueryEntries([{ endpointName, arg, value: cacheData }]),
    );
  });
}

function isCourtCenter(value: unknown): value is CourtCenter {
  return Boolean(
    value &&
    typeof value === "object" &&
    "id" in value &&
    "title" in value &&
    "owner" in value,
  );
}

function toQueryCacheData(
  dispatch: AppDispatch,
  apiId: RtkQueryApiId,
  endpointName: string,
  data: unknown,
) {
  if (apiId === "courtCenterApi" && endpointName === "getCourtCenter") {
    if (isCourtCenter(data)) {
      ingestTyped(dispatch, "courtCenter", data);
      if (data.owner && "name" in data.owner) {
        ingestTyped(dispatch, "user", data.owner);
      }
      return { id: data.id };
    }
  }
  if (apiId === "courtCenterApi" && endpointName === "getCourtCenters") {
    if (Array.isArray(data) && data.some(isCourtCenter)) {
      ingestTyped(dispatch, "courtCenter", data);
      return (data as CourtCenter[]).map((center) => center.id);
    }
  }
  return data;
}
