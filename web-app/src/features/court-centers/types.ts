import { Money } from "@/lib/types/money";

export interface ImageResource {
  id: number;
  url: string;
  publicId: string;
}

export interface Sport {
  id: number;
  name: string;
  code: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CourtSchedule {
  id: number;
  court: number;
  dayOfWeek: number;
  dayOfWeekDisplay: string;
  startTime: string;
  endTime: string;
  createdAt: string;
  updatedAt: string;
}

export interface AvailableSlot {
  date: string;
  start: string;
  end: string;
}

export interface CourtTimeslots {
  court: number;
  slots: AvailableSlot[];
}

export interface CourtCenterTimeslots {
  dateFrom: string;
  dateTo: string;
  courts: CourtTimeslots[];
}

/** Bookable slots keyed by court id, as consumed by the booking forms. */
export type SlotsByCourt = Record<number, AvailableSlot[]>;

export interface CourtSummary {
  id: number;
  sport: Sport | number;
  title: string;
  description?: string;
  images?: ImageResource[];
  schedules?: CourtSchedule[];
  pricePerHour?: Money;
  createdAt?: string;
  updatedAt?: string;
}

export function courtSportId(court: Pick<CourtSummary, "sport">): number {
  return typeof court.sport === "number" ? court.sport : court.sport.id;
}

export function courtSportName(
  court: Pick<CourtSummary, "sport">,
  sportsById?: Map<number, string>,
): string {
  if (typeof court.sport !== "number") {
    return court.sport.name;
  }
  return sportsById?.get(court.sport) ?? "";
}

export type CourtCenterStatus = "draft" | "published";

export interface OwnerId {
  id: number;
}

/** Owner fields exposed on public listing search — no private contact info. */
export interface PublicOwner extends OwnerId {
  name: string;
  avatar?: ImageResource | null;
}

export interface User extends OwnerId {
  email: string;
  avatar: ImageResource | null;
  name: string;
  phoneNumber: string;
  address: string;
  dateOfBirth: string | null;
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
  createdAt: string;
  updatedAt: string;
}

export interface CreateCourtInput {
  id?: number;
  sportId: number;
  title: string;
  description?: string;
  imageIds?: number[];
}

export interface DraftCreateRequest {
  title: string;
  description?: string;
  logoId?: number;
  imageIds?: number[];
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
  dayOfWeek: number;
  startTime: string;
  endTime: string;
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
