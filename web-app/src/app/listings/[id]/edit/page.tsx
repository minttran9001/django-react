
import { EditCourtCenterView } from "@/components/court-centers/EditCourtCenterView";

export default async function EditListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {

  const { id } = await params;

  return (
    <EditCourtCenterView id={id} />
  );
}
