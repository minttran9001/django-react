export interface Sport {
  id: number;
  name: string;
  code: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface CourtCenterImage {
  id: number;
  file: string;
  kind: "logo" | "gallery";
  caption: string;
  sort_order: number;
  created_at: string;
}

export interface CourtSummary {
  id: number;
  sport: Sport;
  title: string;
  description: string;
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
  logo: CourtCenterImage | null;
  gallery: CourtCenterImage[];
  courts?: CourtSummary[];
  created_at: string;
  updated_at: string;
}

export interface CreateCourtInput {
  sport_id: number;
  title: string;
  description?: string;
}

export interface CreateCourtCenterRequest {
  title: string;
  description?: string;
  latitude?: string;
  longitude?: string;
  courts: CreateCourtInput[];
  address?: string;
}
