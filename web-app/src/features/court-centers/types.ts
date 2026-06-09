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

export interface CourtSummary {
  id: number;
  sport: Sport;
  title: string;
  description: string;
  images: ImageResource[];
  created_at: string;
  updated_at: string;
}

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

export interface CreateCourtCenterRequest {
  title: string;
  description?: string;
  latitude?: string;
  longitude?: string;
  address?: string;
  logo_id?: number;
  image_ids?: number[];
  courts: CreateCourtInput[];
}

export type UpdateCourtCenterRequest = CreateCourtCenterRequest;

export interface UploadImagesResponse {
  images: ImageResource[];
}
