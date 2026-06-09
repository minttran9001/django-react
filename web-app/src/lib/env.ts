import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_API_URL: z.url().default("http://localhost:8000"),
  NEXT_PUBLIC_MAPBOX_TOKEN: z.string().optional(),
});

export const env = envSchema.parse({
  NEXT_PUBLIC_API_URL:
    process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000",
  NEXT_PUBLIC_MAPBOX_TOKEN: process.env.NEXT_PUBLIC_MAPBOX_TOKEN,
});
