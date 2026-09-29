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
  courtId: number;
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
            dispatch(courtCenterApi.util.invalidateTags(["CourtTimeslots"]));
          } catch {
            // Leave slot cache unchanged when initiate fails.
          }
        },
        invalidatesTags: [{ type: "Transaction", id: "LIST" }],
      },
    ),
    getTransaction: builder.query<{ id: number }, number>({
      query: (id) => `/transactions/${id}`,
      transformResponse: (transaction: Transaction) => ({ id: transaction.id }),
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
          if (data.id && data.currentState === ETransactionState.CONFIRMED) {
            dispatch(
              transactionApi.util.updateQueryData(
                "getMyTransactions",
                { states: [ETransactionState.CONFIRMED] },
                (draft) => [data.id, ...draft.filter((tid) => tid !== data.id)],
              ),
            );

            dispatch(
              transactionApi.util.updateQueryData(
                "getMyTransactions",
                { states: [ETransactionState.PENDING_PAYMENT] },
                (draft) => draft.filter((tid) => tid !== id),
              ),
            );

            dispatch(
              transactionApi.util.upsertQueryData(
                "getTransaction",
                data.id,
                { id: data.id },
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
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          if (data.id && data.currentState === ETransactionState.REVIEWED) {
            dispatch(
              transactionApi.util.upsertQueryData(
                "getTransaction",
                data.id,
                { id: data.id },
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
      number[],
      { states?: number[]; dateFrom?: Date; dateTo?: Date }
    >({
      query: (queryParams) =>
        `/transactions/mine${
          !isEmpty(queryParams)
            ? `?${new URLSearchParams({
                ...(queryParams.states && {
                  states: queryParams.states.join(","),
                }),
                ...(queryParams.dateFrom && {
                  dateFrom: queryParams.dateFrom.toISOString(),
                }),
                ...(queryParams.dateTo && {
                  dateTo: queryParams.dateTo.toISOString(),
                }),
              }).toString()}`
            : ""
        }`,
      transformResponse: (transactions: Transaction[]) =>
        transactions.map((transaction) => transaction.id),
      providesTags: (result) =>
        result
          ? [
              ...result.map((id) => ({ type: "Transaction" as const, id })),
              { type: "Transaction", id: "LIST" },
            ]
          : [{ type: "Transaction", id: "LIST" }],
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
