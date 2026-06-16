import type { LineItemSlotInput } from "@/lib/api/lineItem";
import type { Transaction } from "@/lib/types/transaction";

import { baseApi } from "./baseApi";
import { courtCenterApi } from "./courtCenterApi";
import { isEmpty } from "lodash";

interface InitiateTransactionBody {
  court_id: number;
  slots: LineItemSlotInput[];
}

export const transactionApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    initiateTransaction: builder.mutation<Transaction, InitiateTransactionBody>(
      {
        query: (body) => ({
          url: "/transactions/initiate",
          method: "POST",
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
      invalidatesTags: (_result, _error, id) => [{ type: "Transaction", id }],
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
  }),
});

export const {
  useInitiateTransactionMutation,
  useGetTransactionQuery,
  useConfirmPaymentMutation,
  useGetMyTransactionsQuery,
} = transactionApi;
