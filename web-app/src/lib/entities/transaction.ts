import { createEntityAdapter } from "@reduxjs/toolkit";
import { Transaction } from "../types/transaction";

export const transactionsAdapter = createEntityAdapter<Transaction, number>({
  selectId: (transaction) => transaction.id,
});

export const transactionsInitialState = transactionsAdapter.getInitialState();
