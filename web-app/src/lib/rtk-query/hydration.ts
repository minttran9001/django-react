import type { AppDispatch } from "@/lib/store";

import type { RtkQueryApiId } from "./registry";
import { rtkQueryRegistry } from "./registry";

export type QueryHydrationEntry = {
  apiId: RtkQueryApiId;
  endpointName: string;
  arg: unknown;
  data: unknown;
};

export function createQueryHydrationEntry(
  apiId: RtkQueryApiId,
  endpointName: string,
  arg: unknown,
  data: unknown,
): QueryHydrationEntry | null {
  if (data == null) {
    return null;
  }

  return { apiId, endpointName, arg, data };
}

export function collectQueryHydrations(
  ...entries: Array<QueryHydrationEntry | null | undefined>
) {
  return entries.filter(
    (entry): entry is QueryHydrationEntry => entry != null,
  );
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
