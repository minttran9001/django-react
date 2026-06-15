import { formatApiDate, normalizeToDay } from "@/lib/dates";

import { baseApi } from "./baseApi";
import type { SpeculatedLineItemsResponse } from "../types/lineItem";

export type LineItemSlotInput = {
  date: string;
  start: string;
  end: string;
};

export type SpeculatedLineItemsArgs = {
  courtId: string;
  slots: LineItemSlotInput[];
};

export function serializeLineItemSlots(
  slots: Array<{ date: Date | string; start: string; end: string }>,
): LineItemSlotInput[] {
  return slots.map((slot) => ({
    start: slot.start,
    end: slot.end,
    date: formatApiDate(normalizeToDay(slot.date)),
  }));
}

function serializeSpeculatedLineItemsArgs({
  courtId,
  slots,
}: SpeculatedLineItemsArgs) {
  return `${courtId}|${slots.map((slot) => `${slot.date}-${slot.start}-${slot.end}`).join(",")}`;
}

export const lineItemApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    speculatedLineItems: builder.query<
      SpeculatedLineItemsResponse,
      SpeculatedLineItemsArgs
    >({
      query: ({ courtId, slots }) => ({
        url: `/line-items/customer`,
        method: "POST",
        body: {
          court_id: courtId,
          slots,
        },
      }),
      serializeQueryArgs: ({ queryArgs }) =>
        serializeSpeculatedLineItemsArgs(queryArgs),
      providesTags: (_result, _error, { courtId, slots }) => [
        {
          type: "SpeculatedLineItems",
          id: serializeSpeculatedLineItemsArgs({ courtId, slots }),
        },
      ],
    }),
  }),
});

export const { useSpeculatedLineItemsQuery } = lineItemApi;
