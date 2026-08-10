import type { CourtSummary, PublicOwner } from "@/features/court-centers/types";
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
  statusDisplay: string;
  date: string;
  startTime: string;
  endTime: string;
};

export enum ETransactionBookingStatus {
  PENDING = 0,
  CONFIRMED = 1,
  CANCELLED = 2,
  COMPLETED = 3,
}

export type Transaction = {
  id: number;
  currentState: ETransactionState;
  currentStateDisplay: string;
  processName: string;
  customer: PublicOwner;
  provider: PublicOwner;
  court: CourtSummary;
  lineItems: LineItem[];
  payInTotal: Money;
  lastTransitionAt: string;
  lastTransition: string;
  bookings: TransactionBooking[];
  createdAt: string;
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
  transaction: Pick<Transaction, "lineItems" | "payInTotal">,
): SpeculatedLineItemsResponse {
  return {
    lineItems: transaction.lineItems,
    payInTotal: transaction.payInTotal,
  };
}

export type MyTransactionCountsResponse = {
  states: Record<ETransactionState, number>;
};
