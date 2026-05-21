import dotenv from "dotenv";
import path from "path";

// Load environment variables from local .env or monorepo root .env
dotenv.config({ path: path.resolve(process.cwd(), ".env") });
dotenv.config({ path: path.resolve(process.cwd(), "../.env") });
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  HOST: z.string().default("0.0.0.0"),
  DATABASE_URL: z.string().url(),
  SESSION_SECRET: z.string().min(8).default("change-me"),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
  PREDICTION_LOCK_MINUTES: z.coerce.number().int().min(0).default(15),
  FOOTBALL_DATA_API_KEY: z.string().optional()
});

export const env = envSchema.parse(process.env);
