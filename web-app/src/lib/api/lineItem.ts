import { formatApiDate, getUserTimezone, normalizeToDay } from "@/lib/dates";

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
  timezone?: string;
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
  timezone,
}: SpeculatedLineItemsArgs) {
  const tz = timezone ?? getUserTimezone();
  return `${courtId}|${tz}|${slots.map((slot) => `${slot.date}-${slot.start}-${slot.end}`).join(",")}`;
}

export const lineItemApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    speculatedLineItems: builder.query<
      SpeculatedLineItemsResponse,
      SpeculatedLineItemsArgs
    >({
      query: ({ courtId, slots, timezone }) => ({
        url: `/line-items/customer`,
        method: "POST",
        params: { timezone: timezone ?? getUserTimezone() },
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
