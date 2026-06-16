import { LineItem, SpeculatedLineItemsResponse } from "@/lib/types/lineItem";
import { format } from "date-fns";

type OrderBreakdownLineItemsProps = {
  speculatedLineItemsData: SpeculatedLineItemsResponse;
  includeFor: ("customer" | "provider")[];
};

function formatMoney({ amount, currency }: LineItem["unit_price"]): string {
  const value = typeof amount === "number" ? amount : Number(amount);
  if (Number.isNaN(value)) {
    return "";
  }

  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

const Separator = () => {
  return (
    <div className="flex border-t border-border" />
  );
};

const formatDate = (date: string) => {
  return format(new Date(date), "MMM d, yyyy");
};

const OrderBreakdownLineItems = ({ speculatedLineItemsData, includeFor }: OrderBreakdownLineItemsProps) => {
  const lineItems = speculatedLineItemsData.line_items;
  const filteredLineItems = lineItems.filter((lineItem) => includeFor.some((include) => lineItem.include_for.includes(include) && lineItem.line_total.amount > 0));
  console.log({ filteredLineItems })
  const slotLineItems = filteredLineItems.filter((lineItem) => lineItem.type === "booking_slot");
  const otherLineItems = filteredLineItems.filter((lineItem) => lineItem.type !== "booking_slot");
  return (
    <div className="space-y-2 rounded-lg bg-muted/60 px-3 py-3 text-sm">
      <h3 className="font-medium text-lg mb-7">Order breakdown</h3>
      {slotLineItems.map((lineItem) => (
        <div
          key={lineItem.code}
          className="flex items-start justify-between gap-3"
        >
          <div>
            <p className="font-medium capitalize">
              Booking slot
            </p>
            {lineItem.metadata ? (
              <p className="text-muted-foreground">
                {formatDate(lineItem.metadata.date)} · {lineItem.metadata.start} – {lineItem.metadata.end}
              </p>
            ) : null}
          </div>
          <p className="font-medium">{formatMoney(lineItem.line_total)}</p>
        </div>
      ))}
      <Separator />
      {otherLineItems.map((lineItem) => (
        <div
          key={lineItem.code}
          className="flex items-start justify-between gap-3"
        >
          <p className="font-medium">{lineItem.label}</p>
          <p className="font-medium">{formatMoney(lineItem.line_total)}</p>
        </div>
      ))}
      <Separator />
      <div className="flex items-start justify-between gap-3">
        <p className="font-medium">Total</p>
        <p className="font-medium">{formatMoney(speculatedLineItemsData.pay_in_total)}</p>
      </div>
    </div>
  );
};

export default OrderBreakdownLineItems;
