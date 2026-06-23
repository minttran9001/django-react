import type { LineItemSlotInput } from "@/lib/api/lineItem";
import {
  ETransactionState,
  MyTransactionCountsResponse,
  type Transaction,
} from "@/lib/types/transaction";

import { baseApi } from "./baseApi";
import { courtCenterApi } from "./courtCenterApi";
import { getUserTimezone } from "@/lib/dates";
import { isEmpty } from "lodash";

interface InitiateTransactionBody {
  court_id: number;
  slots: LineItemSlotInput[];
}

export const transactionApi = baseApi.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    initiateTransaction: builder.mutation<Transaction, InitiateTransactionBody>(
      {
        query: (body) => ({
          url: "/transactions/initiate",
          method: "POST",
          params: { timezone: getUserTimezone() },
          body,
        }),
        async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
          try {
            await queryFulfilled;
            dispatch(courtCenterApi.util.invalidateTags(["CourtCenters"]));
          } catch {
            // Leave court center cache unchanged when initiate fails.
          }
        },
        invalidatesTags: [{ type: "Transaction", id: "LIST" }],
      },
    ),
    getTransaction: builder.query<Transaction, number>({
      query: (id) => `/transactions/${id}`,
      providesTags: (_result, _error, id) => [{ type: "Transaction", id }],
    }),
    confirmPayment: builder.mutation<Transaction, number>({
      query: (id) => ({
        url: `/transactions/${id}/confirm-payment`,
        method: "POST",
      }),
      async onQueryStarted(id, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          if (data.id && data.current_state === ETransactionState.CONFIRMED) {
            //add to confirmed transactions
            dispatch(
              transactionApi.util.updateQueryData(
                "getMyTransactions",
                { states: [ETransactionState.CONFIRMED] },
                (draft) => [data, ...draft.filter((t) => t.id !== data.id)],
              ),
            );

            //remove from pending payment transactions
            dispatch(
              transactionApi.util.updateQueryData(
                "getMyTransactions",
                { states: [ETransactionState.PENDING_PAYMENT] },
                (draft) => draft.filter((transaction) => transaction.id !== id),
              ),
            );

            dispatch(
              transactionApi.util.updateQueryData(
                "getTransaction",
                data.id,
                () => data,
              ),
            );
          }
        } catch {
          // Leave transaction cache unchanged when confirm payment fails.
        }
      },
    }),
    requestReview: builder.mutation<
      Transaction,
      { transactionId: number; rating: number; comment: string | null }
    >({
      query: ({ transactionId, rating, comment }) => ({
        url: `/transactions/${transactionId}/request-review`,
        method: "POST",
        body: { rating, comment },
      }),
      invalidatesTags: () => [{ type: "Transaction", id: "LIST" }],
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          if (data.id && data.current_state === ETransactionState.REVIEWED) {
            dispatch(
              transactionApi.util.updateQueryData(
                "getTransaction",
                data.id,
                () => data,
              ),
            );
          }
        } catch (error) {
          console.error("request review failed", error);
          // Leave transaction cache unchanged when request review fails.
        }
      },
    }),
    getMyTransactions: builder.query<
      Transaction[],
      { states?: number[]; date_from?: Date; date_to?: Date }
    >({
      query: (queryParams) =>
        `/transactions/mine${
          !isEmpty(queryParams)
            ? `?${new URLSearchParams({
                ...(queryParams.states && {
                  states: queryParams.states.join(","),
                }),
                ...(queryParams.date_from && {
                  date_from: queryParams.date_from.toISOString(),
                }),
                ...(queryParams.date_to && {
                  date_to: queryParams.date_to.toISOString(),
                }),
              }).toString()}`
            : ""
        }`,
      providesTags: [{ type: "Transaction", id: "LIST" }],
    }),
    getMyTransactionCounts: builder.query<
      MyTransactionCountsResponse,
      { states?: number[] }
    >({
      query: (queryParams) =>
        `/transactions/mine/counts${
          !isEmpty(queryParams)
            ? `?${new URLSearchParams({
                ...(queryParams.states && {
                  states: queryParams.states.join(","),
                }),
              }).toString()}`
            : ""
        }`,
      providesTags: () => [{ type: "Transaction", id: "COUNTS" }],
    }),
  }),
});

export const {
  useInitiateTransactionMutation,
  useGetTransactionQuery,
  useConfirmPaymentMutation,
  useGetMyTransactionsQuery,
  useRequestReviewMutation,
  useGetMyTransactionCountsQuery,
} = transactionApi;
