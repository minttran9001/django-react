import { TransactionDetailsView } from "@/components/transactions/TransactionDetailsView";

export default async function TransactionDetailsPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const transactionId = Number(id);

    if (!Number.isFinite(transactionId) || transactionId <= 0) {
        return (
            <p className="text-sm text-muted-foreground">Invalid transaction link.</p>
        );
    }

    return <TransactionDetailsView transactionId={transactionId} />;
}
