import { Suspense } from "react";

import { CreateCourtCenterView } from "@/components/court-centers/CreateCourtCenterView";

export default function CreateListingPage() {
  return (
    <Suspense fallback={<p className="text-muted-foreground">Loading...</p>}>
      <CreateCourtCenterView />
    </Suspense>
  );
}
