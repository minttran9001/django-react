import { Money } from "@/lib/types/money";

export interface ImageResource {
  id: number;
  url: string;
  public_id: string;
}

export interface Sport {
  id: number;
  name: string;
  code: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface CourtSchedule {
  id: number;
  court: number;
  day_of_week: number;
  day_of_week_display: string;
  start_time: string;
  end_time: string;
  created_at: string;
  updated_at: string;
}

export interface AvailableSlot {
  date: string;
  start: string;
  end: string;
}

export interface CourtSummary {
  id: number;
  sport: Sport;
  title: string;
  description: string;
  images: ImageResource[];
  schedules?: CourtSchedule[];
  available_slots?: AvailableSlot[];
  price_per_hour: Money;
  created_at: string;
  updated_at: string;
}

export type CourtCenterStatus = "draft" | "published";

export interface OwnerId {
  id: number;
}

/** Owner fields exposed on public listing search — no private contact info. */
export interface PublicOwner extends OwnerId {
  name: string;
  avatar: ImageResource | null;
}

export interface User extends OwnerId {
  email: string;
  avatar: ImageResource | null;
  name: string;
  phone_number: string;
  address: string;
  date_of_birth: string | null;
}

export interface CourtCenter {
  id: number;
  owner: OwnerId | PublicOwner;
  title: string;
  description: string;
  address: string | null;
  latitude: string | null;
  longitude: string | null;
  logo: ImageResource | null;
  images: ImageResource[];
  courts?: CourtSummary[];
  status: CourtCenterStatus;
  created_at: string;
  updated_at: string;
}

export interface CreateCourtInput {
  id?: number;
  sport_id: number;
  title: string;
  description?: string;
  image_ids?: number[];
}

export interface DraftCreateRequest {
  title: string;
  description?: string;
  logo_id?: number;
  image_ids?: number[];
}

export interface LocationUpdateRequest {
  address?: string;
  latitude?: string;
  longitude?: string;
}

export interface CourtsUpdateRequest {
  courts: CreateCourtInput[];
}

export interface ScheduleInput {
  id?: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
}

export interface CourtSchedulesInput {
  id: number;
  schedules: ScheduleInput[];
}

export interface SchedulesUpdateRequest {
  courts: CourtSchedulesInput[];
}

export type DraftUpdateRequest =
  | DraftCreateRequest
  | LocationUpdateRequest
  | CourtsUpdateRequest;

export interface UploadImagesResponse {
  images: ImageResource[];
}
