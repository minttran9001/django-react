import { env } from "@/lib/env";

export function getMediaUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${env.NEXT_PUBLIC_API_URL}${normalizedPath}`;
}
