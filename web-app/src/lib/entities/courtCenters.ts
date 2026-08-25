import { createEntityAdapter } from "@reduxjs/toolkit";
import type { CourtCenter } from "@/features/court-centers/types";

export const courtCentersAdapter = createEntityAdapter<CourtCenter, number>({
  selectId: (center) => center.id,
});

export const courtCentersInitialState = courtCentersAdapter.getInitialState();
