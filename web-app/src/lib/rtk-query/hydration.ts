import type { AppDispatch } from "@/lib/store";

import type {
  RtkQueryApiId,
  RtkQueryDataType,
  RtkQueryEndpointName,
} from "./registry";
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
  data: RtkQueryDataType<ApiId, RtkQueryEndpointName<ApiId>>,
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
    const api = rtkQueryRegistry[apiId] as unknown as {
      util: {
        upsertQueryData: (
          endpointName: string,
          arg: unknown,
          data: unknown,
        ) => Parameters<AppDispatch>[0];
      };
    };

    dispatch(api.util.upsertQueryData(endpointName, arg, data));
  });
}
