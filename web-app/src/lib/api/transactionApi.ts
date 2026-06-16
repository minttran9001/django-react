import type { LineItemSlotInput } from "@/lib/api/lineItem";
import type { Transaction } from "@/lib/types/transaction";

import { baseApi } from "./baseApi";

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
      invalidatesTags: (_result, _error, { court_id }) => [
        { type: "Transaction", id: "LIST" },
        { type: "SpeculatedLineItems", id: String(court_id) },
      ],
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
