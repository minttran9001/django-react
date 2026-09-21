import { config } from "dotenv";
import { z } from "zod";

config();

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  // Django SECRET_KEY often contains `#`; keep JWT_SECRET quoted in .env
  // or dotenv will truncate at the first `#`.
  JWT_SECRET: z.string().min(1),
  FRONTEND_URL: z.string().url().default("http://localhost:3000"),
  PORT: z.coerce.number().int().positive().default(8001),
});

export const env = envSchema.parse(process.env);
