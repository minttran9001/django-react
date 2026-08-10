import { Money } from "./money";

type LineItemMetadata = {
  courtId: number;
  courtName: string;
  date: string;
  start: string;
  end: string;
};

export type LineItem = {
  type: string;
  code: string;
  label: string;
  quantity: number;
  unitPrice: Money;
  lineTotal: Money;
  includeFor: ("customer" | "provider")[];
  metadata?: LineItemMetadata;
};

export type SpeculatedLineItemsResponse = {
  lineItems: LineItem[];
  payInTotal: Money;
};
