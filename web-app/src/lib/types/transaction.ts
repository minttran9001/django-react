import type { PublicOwner } from "@/features/court-centers/types";
import type {
  LineItem,
  SpeculatedLineItemsResponse,
} from "@/lib/types/lineItem";
import type { Money } from "@/lib/types/money";
import type { Review } from "@/lib/types/review";

export type TransactionBooking = {
  id: number;
  court: number;
  status: ETransactionBookingStatus;
  status_display: string;
  date: string;
  start_time: string;
  end_time: string;
};

export enum ETransactionBookingStatus {
  PENDING = 0,
  CONFIRMED = 1,
  CANCELLED = 2,
  COMPLETED = 3,
}

export type Transaction = {
  id: number;
  current_state: ETransactionState;
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
  review: Review;
};

export enum ETransactionState {
  PENDING_PAYMENT = 1,
  PAYMENT_EXPIRED = 2,
  CONFIRMED = 3,
  COMPLETED = 4,
  CANCELLED = 5,
  REVIEWED = 6,
}

export function toLineItemsResponse(
  transaction: Pick<Transaction, "line_items" | "pay_in_total">,
): SpeculatedLineItemsResponse {
  return {
    line_items: transaction.line_items,
    pay_in_total: transaction.pay_in_total,
  };
}

export type MyTransactionCountsResponse = {
  states: Record<ETransactionState, number>;
};
