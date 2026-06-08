// Auth tokens are stored in httpOnly cookies set by /api/auth/* route handlers.
// Client JavaScript cannot read or write them directly.

export function isAuthenticated(): boolean {
  return false;
}
