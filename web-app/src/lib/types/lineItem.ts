import { Money } from "./money";

type LineItemMetadata = {
  court_id: number;
  date: string;
  start: string;
  end: string;
};

export type LineItem = {
  type: string;
  code: string;
  label: string;
  quantity: number;
  unit_price: Money;
  line_total: Money;
  include_for: ("customer" | "provider")[];
  metadata?: LineItemMetadata;
};

export type SpeculatedLineItemsResponse = {
  line_items: LineItem[];
  pay_in_total: Money;
};
