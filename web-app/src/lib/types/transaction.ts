import type { PublicOwner } from "@/features/court-centers/types";
import type { LineItem, SpeculatedLineItemsResponse } from "@/lib/types/lineItem";
import type { Money } from "@/lib/types/money";

export type TransactionBooking = {
  id: number;
  court: number;
  status: number;
  status_display: string;
  date: string;
  start_time: string;
  end_time: string;
};

export type Transaction = {
  id: number;
  current_state: number;
  current_state_display: string;
  process_name: string;
  customer: PublicOwner;
  provider: PublicOwner;
  line_items: LineItem[];
  pay_in_total: Money;
  last_transition_at: string;
  last_transition: string;
  bookings: TransactionBooking[];
  created_at: string;
};

export const TRANSACTION_STATE = {
  PENDING_PAYMENT: 1,
  PAYMENT_EXPIRED: 2,
  CONFIRMED: 3,
  COMPLETED: 4,
  CANCELLED: 5,
} as const;

export function toLineItemsResponse(
  transaction: Pick<Transaction, "line_items" | "pay_in_total">,
): SpeculatedLineItemsResponse {
  return {
    line_items: transaction.line_items,
    pay_in_total: transaction.pay_in_total,
  };
}
