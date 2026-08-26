"use client";

import {
  useGetMyTransactionsQuery,
  useGetTransactionQuery,
} from "@/lib/api/transactionApi";
import { useAppSelector } from "@/lib/hooks";
import { marketplaceTransactionSelectors } from "@/lib/slices/marketplaceData/slice";
import type { Transaction } from "@/lib/types/transaction";

export function useTransactionQuery(
  id: number,
  options?: { skip?: boolean },
) {
  const query = useGetTransactionQuery(id, options);
  const transaction = useAppSelector((state) =>
    query.data
      ? marketplaceTransactionSelectors.selectById(state, query.data.id)
      : undefined,
  );
  return { ...query, data: transaction };
}

export function useMyTransactionsQuery(
  args: { states?: number[]; dateFrom?: Date; dateTo?: Date },
  options?: { skip?: boolean },
) {
  const query = useGetMyTransactionsQuery(args, options);
  const transactions = useAppSelector((state) => {
    const ids = query.data ?? [];
    return ids
      .map((id) => marketplaceTransactionSelectors.selectById(state, id))
      .filter((transaction): transaction is Transaction => transaction != null);
  });
  return { ...query, data: transactions };
}
