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

export interface CourtSummary {
  id: number;
  sport: Sport;
  title: string;
  description: string;
  images: ImageResource[];
  schedules: CourtSchedule[];
  created_at: string;
  updated_at: string;
}

export type CourtCenterStatus = "draft" | "published";

export interface CourtCenter {
  id: number;
  owner: number;
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
