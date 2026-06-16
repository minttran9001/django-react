import type { LineItemSlotInput } from "@/lib/api/lineItem";
import type { Transaction } from "@/lib/types/transaction";

import { baseApi } from "./baseApi";
import { courtCenterApi } from "./courtCenterApi";

interface InitiateTransactionBody {
  court_id: number;
  slots: LineItemSlotInput[];
}

export const transactionApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    initiateTransaction: builder.mutation<Transaction, InitiateTransactionBody>({
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
    }),
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
  }),
});

export const {
  useInitiateTransactionMutation,
  useGetTransactionQuery,
  useConfirmPaymentMutation,
} = transactionApi;
