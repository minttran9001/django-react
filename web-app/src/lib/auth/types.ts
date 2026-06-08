export interface CurrentUser {
  id: number;
  email: string;
}

export interface MeResponse {
  user: CurrentUser | null;
}
