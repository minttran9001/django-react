import { CheckoutTransactionView } from "@/components/checkout/CheckoutView";

export default async function CheckoutTransactionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const transactionId = Number(id);

  if (!Number.isFinite(transactionId) || transactionId <= 0) {
    return (
      <p className="text-sm text-muted-foreground">Invalid checkout link.</p>
    );
  }

  return <CheckoutTransactionView transactionId={transactionId} />;
}
