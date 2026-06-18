import { PublicOwner } from "@/features/court-centers/types";
import { Transaction } from "./transaction";
import { CourtCenter } from "@/features/court-centers/types";

export type Review = {
  id: number;
  transaction: Transaction;
  reviewer: PublicOwner;
  rating: number;
  comment: string | null;
  created_at: string;
  updated_at: string;
  court_center: CourtCenter;
};
